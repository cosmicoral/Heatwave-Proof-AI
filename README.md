# 🌡️ HeatwaveProof — Blockchain-Based Heatwave Early Warning dApp

A decentralized early warning system that lets an authorized emergency authority publish **official heatwave safety alerts** on-chain, permanently and transparently.

---

## 📁 Project Structure

```
contracts/
  HeatwaveProof.sol       ← Main smart contract
artifacts/
  HeatwaveProof.json      ← Compiled ABI + bytecode
README.md                 ← This file
```

---

## 🧠 How It Works

1. The **contract owner** (emergency authority) calls `publishAlert()` with city conditions.
2. The alert is stored on-chain in two places: a **global list** and a **per-city list**.
3. A `HeatwaveAlertPublished` event is emitted for real-time off-chain listeners.
4. Anyone can **read** alerts — no wallet needed for queries.

---

## 📦 Smart Contract: `HeatwaveProof.sol`

### Alert Data Fields

| Field | Type | Description |
|---|---|---|
| `city` | `string` | City name |
| `temperature` | `int256` | °C × 10 (e.g., 375 = 37.5 °C) |
| `humidity` | `uint8` | Relative humidity % (0–100) |
| `uvIndex` | `uint8` | UV index (0–20) |
| `riskLevel` | `uint8` | Risk level 1 (low) → 5 (extreme) |
| `safetyAdvice` | `string` | Public safety guidance text |
| `timestamp` | `uint256` | Unix timestamp of publication |
| `publisher` | `address` | Wallet address of publisher |

### Functions

| Function | Access | Description |
|---|---|---|
| `publishAlert(...)` | Owner only | Publish a new heatwave alert |
| `getLatestAlert()` | Public | Get the most recent alert |
| `getAlertsByCity(city)` | Public | Get all alerts for a city |
| `getTotalAlerts()` | Public | Get total alert count |
| `transferOwnership(addr)` | Owner only | Transfer admin rights |

### Validation Rules

- `city` → non-empty string
- `safetyAdvice` → non-empty string
- `humidity` → 0 to 100
- `uvIndex` → 0 to 20
- `riskLevel` → 1 to 5

---

## 🚀 Deploying in Remix

1. Open `contracts/HeatwaveProof.sol` in Remix IDE
2. Compile with **Solidity 0.8.34**
3. In **Deploy & Run**, select environment (e.g., Remix VM or Injected Provider)
4. Click **Deploy**
5. The deploying wallet becomes the **owner/admin**

---

## 🔮 Publishing an Alert (Example)

Call `publishAlert` with:

```
city:         "Dubai"
temperature:  425        ← 42.5 °C
humidity:     30
uvIndex:      14
riskLevel:    5
safetyAdvice: "Avoid outdoor activity between 10am–6pm. Stay hydrated."
```

---

## 🔗 Future Integrations (Roadmap)

### Chainlink Weather Oracle
> **TODO** in `publishAlert()`: Replace the manual `temperature` parameter with a live price-feed-style value from a `Chainlink AggregatorV3Interface` oracle. This prevents data manipulation and ensures alerts reflect real-world sensor data.

```solidity
// Example hook (not yet active):
// AggregatorV3Interface priceFeed = AggregatorV3Interface(oracleAddress);
// (, int256 liveTemp, , , ) = priceFeed.latestRoundData();
```

### AI Risk Verification
> **TODO** in `publishAlert()`: Before storing an alert, call an off-chain AI model (via Chainlink Functions or Any API) that analyses `temperature`, `humidity`, and `uvIndex` to confirm or override the submitted `riskLevel`. This prevents incorrect or malicious risk classifications.

```solidity
// Example hook (not yet active):
// bytes32 requestId = chainlinkFunctions.sendRequest(aiVerifyRiskLevel(temperature, humidity, uvIndex));
// Store alert only after AI callback confirms riskLevel
```

---

## 🛡️ Security Notes

- Only the **owner** can publish alerts — all other callers are rejected
- All inputs are **validated** before storage
- Uses **custom errors** (gas-efficient vs. revert strings)
- Ownership transfer requires a **non-zero address**
- No ETH is stored or transferred — purely a data registry

---

## 📡 Listening to Events (JavaScript)

```javascript
contract.on("HeatwaveAlertPublished", (city, riskLevel, temperature, timestamp, publisher) => {
  console.log(`🚨 Alert for ${city}: Risk Level ${riskLevel}, Temp ${temperature / 10}°C`);
});
```

---

## 🧩 Tech Stack

- **Solidity 0.8.34**
- **OpenZeppelin Ownable** (access control)
- **Remix IDE** (development & deployment)
- **Chainlink** *(planned — oracle integration)*
- **Chainlink Functions / AI Oracle** *(planned — risk verification)*

---

*Built for transparency, resilience, and public safety. On-chain alerts can never be deleted or tampered with.*
