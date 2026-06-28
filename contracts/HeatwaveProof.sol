// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0

/// @title  HeatwaveProof
/// @notice A smart contract for publishing and querying heatwave safety alerts on-chain.
///         Only the owner (admin) can publish alerts. All alerts are stored both
///         per-city and in a global array for easy retrieval.
/// @author HeatwaveProof Team
///
/// @dev    Future integrations planned:
///         - TODO: Chainlink AggregatorV3Interface for live temperature feed
///         - TODO: AI oracle hook — verify riskLevel via off-chain AI model before publishing

pragma solidity ^0.8.34;

// ─────────────────────────────────────────────────────────────────────────────
// OpenZeppelin import: Ownable gives us owner-only access control out of the box.
// The owner is set at deployment and can be transferred via transferOwnership().
// ─────────────────────────────────────────────────────────────────────────────
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  HeatwaveProof
 * @notice Stores and serves heatwave safety alerts for cities on-chain.
 *
 * @dev    Inherits from OpenZeppelin's Ownable so that only the deployer
 *         (or a subsequently transferred owner) can publish new alerts.
 *
 *         Temperature is stored as int256 in units of (°C × 10) to preserve
 *         one decimal place without floating-point arithmetic.
 *         Example: 37.5 °C is stored as 375.
 *
 *         Future integrations:
 *         - TODO: Chainlink AggregatorV3Interface for live temperature feed
 *         - TODO: AI oracle hook — verify riskLevel via off-chain AI model before publishing
 */
contract HeatwaveProof is Ownable {

    // ─────────────────────────────────────────────────────────────────────────
    // STRUCT DEFINITION
    // Each Alert captures a full snapshot of heatwave conditions for a city.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Represents a single heatwave alert for a city.
     *
     * @param city          Name of the city this alert applies to.
     * @param temperature   Temperature in Celsius multiplied by 10 (e.g., 375 = 37.5 °C).
     *                      Using int256 allows sub-zero temperatures as well.
     * @param humidity      Relative humidity as a percentage (0–100).
     * @param uvIndex       UV index value (0–20, where 11+ is extreme).
     * @param riskLevel     Overall heatwave risk on a scale of 1 (low) to 5 (extreme).
     * @param safetyAdvice  Human-readable safety guidance for the public.
     * @param timestamp     Unix timestamp (seconds) when the alert was published.
     * @param publisher     Ethereum address of the account that published this alert.
     */
    struct Alert {
        string  city;
        int256  temperature;   // °C × 10  (e.g., 375 = 37.5 °C)
        uint8   humidity;      // 0 – 100
        uint8   uvIndex;       // 0 – 20
        uint8   riskLevel;     // 1 – 5
        string  safetyAdvice;
        uint256 timestamp;
        address publisher;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // These live permanently on-chain and consume storage slots.
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Maps a city name to all alerts ever published for that city.
    ///         Allows efficient look-up of a city's full alert history.
    mapping(string => Alert[]) private cityAlerts;

    /// @notice A chronological list of every alert published across all cities.
    ///         Useful for iterating the complete alert history.
    Alert[] private allAlerts;

    // ─────────────────────────────────────────────────────────────────────────
    // EVENTS
    // Events are cheap to emit and allow off-chain apps (dApps, indexers) to
    // react to on-chain activity without polling storage.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted every time a new heatwave alert is successfully published.
     *
     * @param city        The city the alert was published for (indexed for fast filtering).
     * @param riskLevel   Risk level of the alert (1–5).
     * @param temperature Temperature in °C × 10.
     * @param timestamp   Block timestamp when the alert was published.
     * @param publisher   Address of the account that published the alert.
     */
    event HeatwaveAlertPublished(
        string  indexed city,
        uint8           riskLevel,
        int256          temperature,
        uint256         timestamp,
        address         publisher
    );

    /**
     * @notice Emitted when contract ownership is transferred to a new address.
     * @dev    OpenZeppelin's Ownable already emits `OwnershipTransferred`; this
     *         event is provided here as an explicit, named complement for clarity.
     *
     * @param previousOwner Address of the outgoing owner.
     * @param newOwner      Address of the incoming owner.
     */
    event OwnershipTransferredTo(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ─────────────────────────────────────────────────────────────────────────
    // CUSTOM ERRORS
    // Custom errors (introduced in Solidity 0.8.4) are more gas-efficient than
    // revert strings and give callers machine-readable failure reasons.
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Thrown when an empty string is supplied for a required field.
    error EmptyStringNotAllowed(string fieldName);

    /// @notice Thrown when humidity is outside the valid range 0–100.
    error HumidityOutOfRange(uint8 provided);

    /// @notice Thrown when uvIndex is outside the valid range 0–20.
    error UvIndexOutOfRange(uint8 provided);

    /// @notice Thrown when riskLevel is outside the valid range 1–5.
    error RiskLevelOutOfRange(uint8 provided);

    /// @notice Thrown when there are no alerts published yet.
    error NoAlertsPublished();

    /// @notice Thrown when the new owner address is the zero address.
    error InvalidOwnerAddress();

    // ─────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // Runs once at deployment. Sets the deploying address as the initial owner
    // by passing msg.sender to OpenZeppelin's Ownable constructor.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploys the HeatwaveProof contract and sets the deployer as owner.
     * @dev    `msg.sender` is the wallet or contract that sends the deploy transaction.
     */
    constructor() Ownable(msg.sender) {
        // No additional initialisation needed.
        // Ownable sets msg.sender as the owner automatically.
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WRITE FUNCTIONS (state-changing)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Publishes a new heatwave alert for a given city.
     *
     * @dev    Only the contract owner can call this function (`onlyOwner` modifier
     *         from OpenZeppelin's Ownable reverts for any other caller).
     *
     *         Input validation rules:
     *         - `city` must be a non-empty string.
     *         - `safetyAdvice` must be a non-empty string.
     *         - `humidity` must be in range [0, 100].
     *         - `uvIndex` must be in range [0, 20].
     *         - `riskLevel` must be in range [1, 5].
     *
     *         TODO: Chainlink AggregatorV3Interface — replace `temperature` parameter
     *               with a live on-chain feed value pulled from an AggregatorV3Interface
     *               oracle so the temperature cannot be manually manipulated.
     *
     *         TODO: AI oracle hook — verify riskLevel via off-chain AI model before
     *               publishing. The AI model should analyse temperature, humidity, and
     *               uvIndex and confirm or override the supplied riskLevel via a
     *               Chainlink Any API / Functions callback before the alert is stored.
     *
     * @param city          Name of the city (must not be empty).
     * @param temperature   Temperature in °C × 10 (e.g., 375 = 37.5 °C).
     * @param humidity      Relative humidity percentage (0–100).
     * @param uvIndex       UV index (0–20).
     * @param riskLevel     Heatwave risk level (1 = low … 5 = extreme).
     * @param safetyAdvice  Public safety guidance string (must not be empty).
     */
    function publishAlert(
        string  memory city,
        int256         temperature,
        uint8          humidity,
        uint8          uvIndex,
        uint8          riskLevel,
        string  memory safetyAdvice
    )
        external
        onlyOwner   // ← Only the owner wallet may call this function
    {
        // ── Input validation ──────────────────────────────────────────────────
        // Solidity does not have built-in string length; we check the byte length
        // of the encoded string instead (bytes() converts string → byte array).

        // Ensure city name is not an empty string
        if (bytes(city).length == 0) {
            revert EmptyStringNotAllowed("city");
        }

        // Ensure safety advice is not an empty string
        if (bytes(safetyAdvice).length == 0) {
            revert EmptyStringNotAllowed("safetyAdvice");
        }

        // Humidity must be a percentage: 0 to 100 inclusive
        if (humidity > 100) {
            revert HumidityOutOfRange(humidity);
        }

        // UV index scale tops out at 20 (beyond extreme)
        if (uvIndex > 20) {
            revert UvIndexOutOfRange(uvIndex);
        }

        // Risk level is a 1-to-5 ordinal scale; 0 is not valid
        if (riskLevel < 1 || riskLevel > 5) {
            revert RiskLevelOutOfRange(riskLevel);
        }

        // ── Build the Alert struct ────────────────────────────────────────────
        // We use block.timestamp for the on-chain time and msg.sender to record
        // who published the alert (always the owner at this point).
        Alert memory newAlert = Alert({
            city:        city,
            temperature: temperature,
            humidity:    humidity,
            uvIndex:     uvIndex,
            riskLevel:   riskLevel,
            safetyAdvice: safetyAdvice,
            timestamp:   block.timestamp,   // Current block's Unix timestamp
            publisher:   msg.sender         // Address that called this function
        });

        // ── Persist the alert in both storage locations ───────────────────────
        // 1. Append to the city-specific array (enables per-city queries)
        cityAlerts[city].push(newAlert);

        // 2. Append to the global array (enables total history queries)
        allAlerts.push(newAlert);

        // ── Emit event ───────────────────────────────────────────────────────
        // Off-chain listeners (front-ends, indexers) will receive this event
        // immediately after the transaction is mined.
        emit HeatwaveAlertPublished(
            city,
            riskLevel,
            temperature,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @notice Transfers ownership of the contract to `newOwner`.
     *
     * @dev    Overrides the inherited `transferOwnership` from OpenZeppelin's
     *         Ownable to add an explicit zero-address guard and emit our own
     *         named event alongside the standard `OwnershipTransferred` event.
     *
     *         Only the current owner can call this function.
     *
     * @param newOwner The address that will become the new contract owner.
     */
    function transferOwnership(address newOwner)
        public
        override
        onlyOwner   // ← Only the current owner can hand over ownership
    {
        // Guard against accidentally burning ownership by transferring to address(0)
        if (newOwner == address(0)) {
            revert InvalidOwnerAddress();
        }

        // Cache the current owner before the transfer for the event
        address previousOwner = owner();

        // Call OpenZeppelin's internal transfer logic (updates storage + emits
        // the standard OwnershipTransferred event)
        super.transferOwnership(newOwner);

        // Emit our own descriptive event for additional off-chain visibility
        emit OwnershipTransferredTo(previousOwner, newOwner);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ FUNCTIONS (view — free to call, do not modify state)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the most recently published alert across all cities.
     *
     * @dev    Reverts with `NoAlertsPublished` if `allAlerts` is empty.
     *         The latest alert is always the last element of the array
     *         (index = length - 1).
     *
     * @return The most recent `Alert` struct.
     */
    function getLatestAlert() external view returns (Alert memory) {
        // Make sure at least one alert exists before trying to access the array
        if (allAlerts.length == 0) {
            revert NoAlertsPublished();
        }

        // Return the last element — the most recently pushed alert
        return allAlerts[allAlerts.length - 1];
    }

    /**
     * @notice Returns all alerts ever published for a specific city.
     *
     * @dev    Returns an empty array (length 0) if no alerts exist for `city`
     *         rather than reverting — callers should check the array length.
     *
     * @param  city  The city name to query alerts for.
     * @return       An array of `Alert` structs for the requested city,
     *               ordered from oldest to newest.
     */
    function getAlertsByCity(string memory city)
        external
        view
        returns (Alert[] memory)
    {
        // Look up and return the city's alert history from the mapping.
        // Returns an empty array automatically if no alerts exist for this city.
        return cityAlerts[city];
    }

    /**
     * @notice Returns the total number of alerts published across all cities.
     *
     * @dev    This is a cheap O(1) read — Solidity tracks array length natively.
     *
     * @return count The total number of alerts in `allAlerts`.
     */
    function getTotalAlerts() external view returns (uint256 count) {
        // The length of the global array equals the total number of published alerts
        return allAlerts.length;
    }
}
