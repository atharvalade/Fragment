# Archive Directory

This directory contains exploration, debugging, and deprecated files from the Hyperlane bridge development process.

## 📁 Structure

### `exploration-scripts/`
Contains all the exploratory and debugging scripts used to understand the Hyperlane SDK v5 and develop the bridge:

**Step-by-step exploration:**
- `step1-explore-deployer.js` - Initial exploration of HyperlaneProxyFactoryDeployer
- `step2-deploy-factories.js` - Deployed ISM factories
- `step3-explore-core-deployer.js` - Explored HyperlaneCoreDeployer
- `step4-deploy-core.js` - Failed attempt at core deployment
- `step5-use-module.js` - Discovered EvmCoreModule
- `step6-deploy-with-module.js` - Successfully deployed Hyperlane core contracts
- `step7-explore-warp.js` - Explored Warp Route deployment

**Debugging scripts:**
- `explore-sdk.js` - Dynamically inspected SDK exports
- `test-multiprovider.js` - Tested MultiProvider functionality
- `debug-ismfactory.js` - Debugged ISM factory issues

**Deprecated implementations:**
- `deploy-hyperlane.js` - Initial deployment attempt
- `deploy-core-contracts.js` - Alternative deployment script
- `simple-transfer.js` - Hackathon-friendly workaround (deprecated)
- `bridge-saga-dollar.js` - Old bridge script (replaced by bridge-deposit.js)
- `verify-setup.js` - Setup verification
- `check-balances.js` - Balance checking utility

### `old-configs/`
Contains the Hyperlane configuration files used during the Hyperlane core deployment:
- `configs/chains.yaml` - Chain metadata for SagaEVM and Fragment
- `configs/ism.yaml` - Interchain Security Module configuration
- `configs/warp-route.yaml` - Warp Route configuration (not fully used)

### `unused-docs/`
Contains documentation that was superseded by the final documentation:
- `HYPERLANE_STATUS.md` - Interim status updates
- `QUICKSTART.md` - Early quickstart guide
- `integration-guide.md` - Initial integration documentation

## 🎯 What's Still Active

The main Hyperlane directory now contains only the production-ready files:

**Active Scripts:**
- `bridge-deposit.js` - Deposit SAGA Dollar from SagaEVM to Fragment
- `bridge-status.js` - Check bridge status and balances
- `deploy-bridge.js` - Deploy the SagaDollarBridge contract

**Active Contracts:**
- `contracts/SagaDollarBridge.sol` - The wSAGA bridge contract

**Active Documentation:**
- `BRIDGING_JOURNEY.md` - Complete technical journey
- `DEPLOYMENT_SUCCESS.md` - Hyperlane core deployment record
- `QUICK_REFERENCE.md` - Quick reference guide
- `BRIDGE_COMPLETE.md` - Final bridge status

## 📚 Why Archive These?

These files represent the iterative development process of understanding Hyperlane SDK v5, which had significant API changes from the tutorial we followed. They're preserved for:

1. **Learning reference** - Understanding how we explored the SDK
2. **Debugging context** - If issues arise, we can reference the exploration
3. **Documentation** - Shows the journey from confusion to working solution
4. **Future work** - May be useful if we revisit full Hyperlane Warp Route deployment

## 🔮 Future Considerations

If you want to implement a full Hyperlane Warp Route (instead of the custom bridge), these exploration scripts will be valuable references for:
- Understanding the SDK structure
- Deploying to both SagaEVM and Fragment (when SagaEVM permissions allow)
- Setting up validators and relayers
- Configuring ISMs and Warp Routes

---

*For current usage instructions, see the main documentation files in the parent directory.*

