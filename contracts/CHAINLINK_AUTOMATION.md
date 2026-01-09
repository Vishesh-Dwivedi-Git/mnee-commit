# Chainlink Automation Integration Guide

## Overview

The `Commit.sol` contract implements Chainlink Automation (formerly Keepers) to automatically settle expired commitments without requiring manual intervention or centralized cron jobs.

## How It Works

### 1. AutomationCompatible Interface

The contract implements `AutomationCompatibleInterface` with two key functions:

```solidity
function checkUpkeep(bytes calldata /* checkData */) 
    external view returns (bool upkeepNeeded, bytes memory performData)

function performUpkeep(bytes calldata performData) external
```

### 2. Settlement Logic Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Chainlink Automation Network (Off-chain)                 │
│    - Calls checkUpkeep() every block                        │
│    - No gas cost (view function)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. checkUpkeep() scans commitments                          │
│    - Iterates through up to 50 commitments                  │
│    - Finds settleable ones (expired + Active state)         │
│    - Returns: (true, encoded IDs) if any found              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (if upkeepNeeded = true)
┌─────────────────────────────────────────────────────────────┐
│ 3. Chainlink calls performUpkeep() ON-CHAIN                 │
│    - Sends transaction from forwarder contract              │
│    - Costs gas (paid from LINK balance)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. performUpkeep() batch settles                            │
│    - Decodes commitment IDs from performData                │
│    - Validates each commitment state                        │
│    - Calls settle() for each valid ID                       │
│    - settle() restricted to onlyForwarder modifier          │
└─────────────────────────────────────────────────────────────┘
```

## Security Features

### 1. Forwarder-Only Settlement

```solidity
modifier onlyForwarder() {
    if (msg.sender != forwarder) revert OnlyForwarder();
    _;
}

function settle(uint256 _commitId) 
    public 
    onlyForwarder 
    inState(_commitId, State.Active) 
    nonReentrant
```

**Why?** Prevents malicious actors from calling `settle()` to trigger unintended settlements. Only the Chainlink forwarder contract can execute automated settlements.

### 2. State Validation in performUpkeep

```solidity
function performUpkeep(bytes calldata performData) external override {
    uint256[] memory settleableIds = abi.decode(performData, (uint256[]));
    
    for (uint256 i = 0; i < settleableIds.length; i++) {
        uint256 commitId = settleableIds[i];
        Commitment storage c = commitments[commitId];
        
        // Double-check conditions (race condition protection)
        if (c.state != State.Active) continue;
        if (block.timestamp < c.deadline + c.duration) continue;
        
        settle(commitId);
    }
}
```

**Why?** Protects against race conditions where a commitment's state changes between `checkUpkeep()` and `performUpkeep()` execution.

### 3. Batch Size Limit

```solidity
uint256 private constant MAX_BATCH_SIZE = 50;
```

**Why?** Prevents gas limit errors by capping the number of commitments scanned per check. Adjust based on gas profiling.

## Deployment Steps

### 1. Deploy Contract

```bash
# Update MNEE token and arbitrator addresses in DeployAutomation.s.sol
# For Sepolia testnet:
forge script script/DeployAutomation.s.sol:DeployAutomation \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 2. Fund Contract with LINK

The Chainlink Automation network requires LINK tokens to pay for gas:

```bash
# Get LINK token address for your network:
# Sepolia: 0x779877A7B0D9E8603169DdbD7836e478b4624789
# Mainnet: 0x514910771AF9Ca656af840dff83E8264EcF986CA

# Transfer LINK to your Commit contract
cast send 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  "transfer(address,uint256)" \
  <COMMIT_CONTRACT_ADDRESS> \
  5000000000000000000 \ # 5 LINK
  --private-key $PRIVATE_KEY
```

### 3. Register Upkeep on Chainlink UI

Visit: https://automation.chain.link

**Registration Parameters:**

| Field | Value |
|-------|-------|
| Upkeep name | MNEE Commit Auto-Settlement |
| Target contract address | `<COMMIT_CONTRACT_ADDRESS>` |
| Admin address | Your deployer address |
| Gas limit | `500000` (adjust based on testing) |
| Check data | `0x` (empty) |
| Trigger | `Custom logic` |
| Starting balance | `5 LINK` |

### 4. Set Forwarder Address

After registration, Chainlink provides a **forwarder contract address**. Set it:

```bash
cast send <COMMIT_CONTRACT_ADDRESS> \
  "setForwarder(address)" \
  <FORWARDER_ADDRESS_FROM_CHAINLINK> \
  --private-key $PRIVATE_KEY
```

**Find forwarder address:**
1. Go to your upkeep on https://automation.chain.link
2. Click "View Details"
3. Copy "Forwarder" address from upkeep details

## Testing Automation

### 1. Local Testing (Manual)

```solidity
// In test/Commit.t.sol
function testCheckUpkeep() public {
    // Create commitment
    uint256 commitId = createTestCommitment();
    
    // Warp past deadline
    vm.warp(block.timestamp + 31 days);
    
    // Check upkeep
    (bool upkeepNeeded, bytes memory performData) = commit.checkUpkeep("");
    assertTrue(upkeepNeeded);
    
    uint256[] memory ids = abi.decode(performData, (uint256[]));
    assertEq(ids.length, 1);
    assertEq(ids[0], commitId);
}

function testPerformUpkeep() public {
    // Create and expire commitment
    uint256 commitId = createTestCommitment();
    vm.warp(block.timestamp + 31 days);
    
    // Get perform data
    (, bytes memory performData) = commit.checkUpkeep("");
    
    // Set forwarder (test address)
    commit.setForwarder(address(this));
    
    // Perform upkeep
    commit.performUpkeep(performData);
    
    // Verify settlement
    (,,,,,, Commit.State state) = commit.commitments(commitId);
    assertEq(uint(state), uint(Commit.State.Completed));
}
```

### 2. Testnet Verification

```bash
# 1. Create a commitment that expires in 5 minutes (for testing)
cast send <COMMIT_CONTRACT_ADDRESS> \
  "createCommitment(...)" \
  --private-key $CREATOR_KEY

# 2. Wait 5 minutes

# 3. Call checkUpkeep manually
cast call <COMMIT_CONTRACT_ADDRESS> \
  "checkUpkeep(bytes)" \
  "0x"

# 4. Monitor Chainlink UI for automatic execution
# The upkeep should trigger within ~1 minute after deadline
```

### 3. Monitor Events

```bash
# Watch for CommitmentSettled events
cast logs --address <COMMIT_CONTRACT_ADDRESS> \
  --event "CommitmentSettled(uint256,address,uint256)" \
  --rpc-url $SEPOLIA_RPC_URL \
  --follow
```

## Gas Optimization

### Recommended Settings

Based on typical commitment settlements:

- **Gas limit per upkeep:** `500000` (handles ~10 settlements)
- **LINK funding:** `5 LINK` minimum (refill when < 1 LINK)
- **Batch size:** `50` (adjust if gas limit errors occur)

### Cost Analysis

Estimate LINK costs:

```
Cost per settlement = (Gas used × Gas price × ETH/USD) / LINK/USD
```

Example (Sepolia testnet):
- Gas: ~150,000 per settlement
- Gas price: 20 gwei
- ETH price: $3000
- LINK price: $15

```
Cost = (150000 × 20 × 10^-9 × 3000) / 15
     = 0.6 LINK per settlement
```

**For production:** Monitor LINK balance and set up automated refills or alerts.

## Troubleshooting

### Upkeep Not Triggering

**Possible causes:**

1. **Insufficient LINK balance**
   ```bash
   # Check LINK balance
   cast call 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
     "balanceOf(address)(uint256)" \
     <COMMIT_CONTRACT_ADDRESS>
   ```

2. **Forwarder not set**
   ```bash
   # Check forwarder address
   cast call <COMMIT_CONTRACT_ADDRESS> "forwarder()(address)"
   ```

3. **checkUpkeep returning false**
   ```bash
   # Manually call checkUpkeep
   cast call <COMMIT_CONTRACT_ADDRESS> "checkUpkeep(bytes)" "0x"
   ```

4. **Upkeep paused**
   - Check Chainlink UI if upkeep is active

### Gas Limit Exceeded

If `performUpkeep` fails with out-of-gas:

1. Reduce `MAX_BATCH_SIZE` in contract
2. Increase gas limit in Chainlink UI
3. Profile gas usage with `forge test --gas-report`

### Forwarder Rejection

Error: `OnlyForwarder()`

**Fix:** Verify forwarder address matches Chainlink's:

```bash
# Get forwarder from Chainlink UI, then set:
cast send <COMMIT_CONTRACT_ADDRESS> \
  "setForwarder(address)" \
  <CORRECT_FORWARDER_ADDRESS> \
  --private-key $OWNER_KEY
```

## Best Practices

1. **Start with small LINK balance** (1-5 LINK) and monitor usage
2. **Set up alerts** for low LINK balance via Chainlink UI
3. **Test on testnet first** with fast expiry times (5-10 min)
4. **Monitor gas costs** and adjust batch size accordingly
5. **Use events** to track automated settlements in your backend
6. **Keep forwarder address secure** - only owner can change it

## Additional Resources

- [Chainlink Automation Docs](https://docs.chain.link/chainlink-automation)
- [Automation Registry](https://docs.chain.link/chainlink-automation/overview/automation-contracts)
- [LINK Token Addresses](https://docs.chain.link/resources/link-token-contracts)
- [Gas Price Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses)

## Mainnet Considerations

Before deploying to mainnet:

1. **Security audit** of Chainlink integration
2. **Gas profiling** with realistic commitment volumes
3. **LINK refill strategy** (manual vs automated)
4. **Multi-sig ownership** for `setForwarder()` and `setArbitrator()`
5. **Emergency pause mechanism** (consider adding)
6. **Monitoring setup** (events, LINK balance, failed upkeeps)
