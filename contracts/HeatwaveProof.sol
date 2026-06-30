//SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HeatwaveProof
/// @notice Public on-chain record layer for verified heatwave safety alerts.
contract HeatWaveProof is Ownable {
    struct Alert {
        uint256 alertId;
        string city;
        int256 temperature;       // °C × 10, e.g. 37.5°C = 375
        uint8 humidity;           // 0–100
        uint8 uvIndex;           // 0–20       
        uint8 riskLevel;        // 1–5
        string safetyAdvice;
        string dataSource;      // e.g. "Met Office API", "Open-Meteo", "manual-test"
        bytes32 evidenceHash;   // hash of off-chain evidence / AI assessment / weather payload
        uint256 timestamp;
        address publisher;
    }
    mapping(string => Alert[]) private cityAlerts;
    Alert[] private allAlerts;

    event HeatwaveAlertPublished(
        uint256 indexed alertId,
        string indexed city,
        uint8 riskLevel,
        int256 temperature,
        bytes32 evidenceHash,
        uint256 timestamp,
        address indexed publisher
    );

    error EmptyStringNotAllowed(string fieldName);
    error HumidityOutOfRange(uint8 provided);
    error UvIndexOutOfRange(uint8 provided);
    error RiskLevelOutOfRange(uint8 provided);
    error NoAlertsPublished();
    error InvalidOwnerAddress();
    error InvalidPagination();
    error ZeroAddress();

    constructor() Ownable(msg.sender){}

    function publishAlert(
        string memory city,
        int256 temperature,
        uint8 humidity,
        uint8 uvIndex,
        uint8 riskLevel,
        string memory safetyAdvice,
        string memory dataSource,
        bytes32 evidenceHash
    ) external onlyOwner returns (uint256 alertId) {
        _validateAlertInput(city, humidity, uvIndex, riskLevel, safetyAdvice, dataSource);

        alertId = allAlerts.length;

        Alert memory newAlert = Alert({
            alertId: alertId,
            city: city,
            temperature: temperature,
            humidity: humidity,
            uvIndex: uvIndex,
            riskLevel: riskLevel,
            safetyAdvice: safetyAdvice,
            dataSource: dataSource,
            evidenceHash: evidenceHash,
            timestamp: block.timestamp,
            publisher: msg.sender
        });


        cityAlerts[city].push(newAlert);

        allAlerts.push(newAlert);

        emit HeatwaveAlertPublished(
            alertId,
            city,
            riskLevel,
            temperature,
            evidenceHash,
            block.timestamp,
            msg.sender
        );
    }
    function getLatestAlert() external view returns (Alert memory) {
        if (allAlerts.length == 0) revert NoAlertsPublished();
        return allAlerts[allAlerts.length -1];
    }
    function getLatestAlertByCity(string memory city) external view returns (Alert memory){
            Alert[] storage alerts = cityAlerts[city];
             if (alerts.length == 0) revert NoAlertsPublished();
             return alerts[alerts.length - 1];
    }

    function getAlertById(uint256 alertId) external view returns (Alert memory) {
        if (alertId >= allAlerts.length) revert NoAlertsPublished();
        return allAlerts[alertId];
    }

    function getAlertsByCity(string memory city) external view returns (Alert[] memory) {
        return cityAlerts[city];
    }

    function getTotalAlerts() external view returns (uint256) {
        return allAlerts.length;
    }

    function getCityAlertCount(string memory city) external view returns (uint256) {
        return cityAlerts[city].length;
    }

    function getAlertsPage(uint256 start, uint256 limit) external view returns (Alert[] memory) {
        if (limit == 0 || start > allAlerts.length) revert InvalidPagination();
        uint256 end = start + limit;
        if (end > allAlerts.length) {
            end = allAlerts.length;
        }
        Alert[] memory page = new Alert[] (end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = allAlerts[i];
        }
        return page;
    }

    function transferOwnership(address newOwner)
         public 
         override 
         onlyOwner
    {
        if (newOwner == address(0)) revert ZeroAddress();
        super.transferOwnership(newOwner);
    }

    function _validateAlertInput(
        string memory city,
        uint8 humidity,
        uint8 uvIndex,
        uint8 riskLevel,
        string memory safetyAdvice,
        string memory dataSource
    ) internal pure {
        if (bytes(city).length == 0) revert EmptyStringNotAllowed("city");
        if (bytes(safetyAdvice).length == 0) revert EmptyStringNotAllowed("safetyAdvice");
        if (bytes(dataSource).length == 0) revert EmptyStringNotAllowed("dataSource");
        if (humidity > 100) revert HumidityOutOfRange(humidity);
        if (uvIndex > 20) revert UvIndexOutOfRange(uvIndex);
        if (riskLevel < 1 || riskLevel > 5) revert RiskLevelOutOfRange(riskLevel);
        }
    }