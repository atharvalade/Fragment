# Fragment Hyperlane Bridge

Bridge SAGA Dollar (D) from SagaEVM to Fragment Chainlet using Hyperlane.

## Overview

This setup allows you to:
- Transfer SAGA Dollar from SagaEVM (collateral chain) to Fragment Chainlet (synthetic chain)
- Get wrapped SAGA Dollar (wSAGA) on Fragment that's 1:1 backed by locked SAGA Dollar on SagaEVM
- Transfer back from Fragment to SagaEVM to unlock original SAGA Dollar

## Architecture

```
SagaEVM (Collateral)                Fragment (Synthetic)
==================                  ===================
SAGA Dollar (D)                     Wrapped SAGA (wSAGA)
0xB76144...                         [Deployed by Warp Route]
    ↓                                   ↑
HypERC20Collateral ─────────────────→ HypERC20
(locks SAGA $)      Hyperlane        (mints wSAGA 1:1)
```

## Prerequisites

1. **Hyperlane CLI**: `npm install -g @hyperlane-xyz/cli`
2. **Funds on both chains**:
   - GAS tokens on SagaEVM (for transactions + bridge gas)
   - MENT tokens on Fragment (for validator/relayer)
3. **SAGA Dollar** on SagaEVM: `0xB76144F87DF95816e8c55C240F874C554B4553C3`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env`:
```env
PRIVATE_KEY=your_private_key_here
```

⚠️ **Important**: This wallet will be your validator and relayer. Make sure it has:
- GAS tokens on SagaEVM
- MENT tokens on Fragment chainlet
- SAGA Dollar tokens to bridge

### 3. Deploy Hyperlane Core Contracts

```bash
npm run deploy:core
```

This deploys:
- Mailbox contracts (both chains)
- Interchain Security Module (ISM)
- Validator announcement contracts
- All required Hyperlane infrastructure

**Output**: `artifacts/core-deployment-{timestamp}.json` and `artifacts/agent-config-{timestamp}.json`

### 4. Deploy Warp Route

```bash
npm run deploy:warp
```

This deploys:
- `HypERC20Collateral` on SagaEVM (locks SAGA Dollar)
- `HypERC20` on Fragment (mints wSAGA)

**Output**: `artifacts/warp-route-deployment-{timestamp}.json`

### 5. Setup Validator & Relayer with Kurtosis

```bash
npm run deploy:kurtosis
```

This will:
1. Generate a Kurtosis Cloud link
2. Open browser with pre-filled configuration
3. Deploy validator and relayer in the cloud

**Steps**:
- Sign in with GitHub
- Click "Run" on the Hyperlane package
- Wait 15 minutes for sync (check logs for "synced" status)

### 6. Test the Bridge

First, test with a simple message:

```bash
npm run send:message
```

If message delivers successfully, you're ready to bridge tokens!

### 7. Bridge SAGA Dollar

```bash
npm run bridge <amount> <warpRouteAddress>

# Example:
npm run bridge 10 0x1234567890abcdef...
```

**Where to find Warp Route address**: 
Check `artifacts/warp-route-deployment-{timestamp}.json` → `sagaevm` → `HypERC20Collateral`

## Usage Examples

### Bridge 10 SAGA Dollar to Fragment

```bash
# Warp Route address from deployment artifacts
npm run bridge 10 0xYourWarpRouteAddress
```

**What happens**:
1. Approves Warp Route to spend SAGA Dollar
2. Locks 10 SAGA Dollar on SagaEVM
3. Sends cross-chain message via Hyperlane
4. Relayer delivers message to Fragment
5. Mints 10 wSAGA on Fragment

**Wait time**: 1-5 minutes depending on relayer

### Check Bridge Status

- **SagaEVM Explorer**: https://sagaevm.sagaexplorer.io/tx/{txHash}
- **Kurtosis Logs**: Check relayer logs for message delivery
- **Hyperlane Explorer**: Track message by ID (if supported)

### Bridge Back to SagaEVM

Use the same bridge script but from Fragment chainlet:
1. Connect to Fragment RPC
2. Call `transferRemote` on HypERC20 contract
3. Burns wSAGA on Fragment
4. Unlocks SAGA Dollar on SagaEVM

## Configuration Files

### `configs/chains.yaml`
Defines SagaEVM and Fragment network parameters:
- RPC URLs
- Chain IDs
- Domain IDs (for Hyperlane)
- Native tokens

### `configs/ism.yaml`
Interchain Security Module configuration:
- Multisig threshold (1/1 for single validator)
- Validator addresses

### `configs/warp-route.yaml`
Warp Route configuration:
- Base chain (SagaEVM with SAGA Dollar)
- Synthetic chains (Fragment with wSAGA)
- Token details

## Deployment Artifacts

After deployment, you'll have:

```
Hyperlane/
├── artifacts/
│   ├── core-deployment-{timestamp}.json     # Mailbox addresses
│   ├── agent-config-{timestamp}.json        # Validator/Relayer config
│   ├── warp-route-deployment-{timestamp}.json  # Warp Route addresses
│   └── warp-config-{timestamp}.json         # UI config (optional)
└── bridge-{timestamp}.json                   # Bridge transaction records
```

## Contract Addresses

After deployment, key contracts:

**SagaEVM**:
- Mailbox: (from core-deployment.json)
- HypERC20Collateral: (from warp-route-deployment.json)

**Fragment**:
- Mailbox: (from core-deployment.json)
- HypERC20 (wSAGA): (from warp-route-deployment.json)

## Troubleshooting

### "Insufficient GAS balance"
You need GAS tokens on SagaEVM to pay for:
- Approve transaction
- Bridge transaction
- Cross-chain gas payment

### "Message not delivered"
Check:
1. Relayer is running (Kurtosis logs)
2. Relayer is synced (look for "synced" in logs)
3. Validator signed the message
4. Wait up to 5 minutes

### "Domain ID too large error"
Already handled in `chains.yaml` - Fragment uses domainId 27638 instead of actual chainId

### Relayer not syncing
- Wait 15 minutes minimum
- Check Kurtosis Cloud logs
- Ensure both chains are accessible via RPC

## Advanced: Custom UI

To build a frontend for your bridge:
1. Fork [Hyperlane Warp UI](https://github.com/hyperlane-xyz/hyperlane-warp-ui-template)
2. Copy `artifacts/warp-config-{timestamp}.json` to `src/consts/tokens.yaml`
3. Add chain configs to `src/consts/chains.yaml`
4. Run `yarn build && yarn dev`

## Cost Estimation

**One-time setup**:
- Deploy core: ~0.1-0.2 GAS per chain
- Deploy Warp Route: ~0.05-0.1 GAS per chain
- Kurtosis: Free (cloud instances)

**Per bridge transaction**:
- Approve: ~0.001 GAS
- Bridge: ~0.01-0.02 GAS + cross-chain gas fee
- Cross-chain gas: Varies (quoted automatically)

## Security Notes

- ✅ Uses multisig ISM (configurable threshold)
- ✅ Tokens locked on origin chain (not bridged)
- ✅ 1:1 backing guarantee
- ⚠️ Single validator = centralized (okay for hackathon/testnet)
- ⚠️ For production: Use 2/3 or 3/5 multisig

## Resources

- [Hyperlane Docs](https://docs.hyperlane.xyz)
- [Saga Docs](https://docs.saga.xyz)
- [SAGA Dollar Info](https://coltstable.com)
- [Original Tutorial](https://medium.com/@leonardo.digi/stack-exploder-bridging-your-saga-chainlet-assets-across-evm-networks-using-hyperlane)

## Integration with Fragment

After bridge is setup, your macOS app/frontend can:
1. Check wSAGA balance on Fragment
2. Use wSAGA for worker payments (instead of mock token)
3. Workers can bridge earnings back to SagaEVM
4. Real SAGA Dollar economy across chains!

## Next Steps

1. ✅ Deploy Hyperlane core
2. ✅ Deploy Warp Route
3. ✅ Setup validator/relayer
4. ✅ Bridge SAGA Dollar
5. 🔄 Update Fragment contracts to use wSAGA
6. 🔄 Integrate with macOS worker app

