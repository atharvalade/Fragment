# Hyperlane Bridge Quick Start

Bridge SAGA Dollar from SagaEVM to Fragment Chainlet in 5 steps.

## Prerequisites

- Node.js 20+
- Wallet with:
  - GAS tokens on SagaEVM
  - MENT tokens on Fragment
  - SAGA Dollar on SagaEVM

## Setup (5 minutes)

```bash
# 1. Install
npm install

# 2. Configure
echo "PRIVATE_KEY=your_key_here" > .env

# 3. Verify setup
npm run verify
```

## Deploy (10 minutes)

```bash
# 1. Deploy Hyperlane core contracts
npm run deploy:core
# ✅ Creates: artifacts/core-deployment-*.json

# 2. Deploy Warp Route (token bridge)
npm run deploy:warp
# ✅ Creates: artifacts/warp-route-deployment-*.json

# 3. Setup validator & relayer
npm run deploy:kurtosis
# ✅ Opens browser, click "Run"
# ⏳ Wait 15 minutes for sync
```

## Test (2 minutes)

```bash
# 1. Test cross-chain messaging
npm run send:message
# ✅ Should confirm delivery

# 2. Check balances
npm run balance
# ✅ Shows GAS, MENT, SAGA Dollar
```

## Bridge (1 minute)

```bash
# Get warp route address
cat artifacts/warp-route-deployment-*.json
# Copy "sagaevm" -> "HypERC20Collateral" address

# Bridge 10 SAGA Dollar to Fragment
npm run bridge 10 0xYourWarpRouteAddress

# ⏳ Wait 1-5 minutes
# ✅ Check Fragment balance
npm run balance artifacts/warp-route-deployment-*.json
```

## Verify

You should see:
- ✅ 10 SAGA Dollar locked on SagaEVM
- ✅ 10 wSAGA minted on Fragment
- ✅ Transaction on SagaEVM explorer
- ✅ Message delivered (Kurtosis logs)

## Use in Fragment

Now integrate wSAGA with your Fragment contracts:

```bash
# Update FragmentJobRouter to use wSAGA
cd ../SAGA
# Edit scripts/deploy.js with wSAGA address
npx hardhat run scripts/deploy.js --network fragment
```

See `scripts/integration-guide.md` for full details.

## Troubleshooting

### Deployment fails
```bash
# Check balances
npm run balance

# Need GAS on SagaEVM
# Need MENT on Fragment
```

### Message not delivered
```bash
# Check Kurtosis logs (relayer must be synced)
# Wait up to 5 minutes
```

### Bridge stuck
```bash
# Verify relayer is running
# Check Kurtosis Cloud dashboard
# Look for "synced" in logs
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run verify` | Check deployment status |
| `npm run balance` | Check token balances |
| `npm run deploy:core` | Deploy Hyperlane |
| `npm run deploy:warp` | Deploy token bridge |
| `npm run deploy:kurtosis` | Setup validator/relayer |
| `npm run send:message` | Test cross-chain |
| `npm run bridge <amount> <address>` | Bridge tokens |

## Files

```
Hyperlane/
├── configs/
│   ├── chains.yaml         # Network configs
│   ├── ism.yaml            # Security module
│   └── warp-route.yaml     # Bridge config
├── scripts/
│   ├── bridge-saga-dollar.js    # Bridge script
│   ├── check-balances.js        # Balance checker
│   └── verify-setup.js          # Setup verifier
└── artifacts/               # Deployment outputs
```

## Next Steps

1. ✅ Bridge complete
2. 🔄 Update SAGA contracts with wSAGA
3. 🔄 Test job submission with real tokens
4. 🔄 Workers earn real SAGA Dollar
5. 🔄 Bridge earnings back to SagaEVM

Full guide: `README.md`
Integration: `scripts/integration-guide.md`

