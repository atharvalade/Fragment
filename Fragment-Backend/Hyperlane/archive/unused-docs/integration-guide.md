# Integration Guide: Using Bridged SAGA Dollar in Fragment

After successfully bridging SAGA Dollar to the Fragment chainlet, you'll have wrapped SAGA (wSAGA) tokens. Here's how to integrate them with your existing Fragment smart contracts.

## Step 1: Get wSAGA Contract Address

After Warp Route deployment, find the address in:
```bash
cat artifacts/warp-route-deployment-*.json
```

Look for: `fragment.HypERC20` - this is your wSAGA address

## Step 2: Update FragmentJobRouter Contract

Replace the MockSAGADollar address with the real wSAGA address:

### Option A: Redeploy with wSAGA

1. Edit `/Fragment-Backend/SAGA/scripts/deploy.js`:

```javascript
// BEFORE:
const sagaDollar = await MockSAGADollar.deploy("SAGA Dollar", "SAGA");

// AFTER:
const WSAGA_ADDRESS = "0x..."; // wSAGA from warp-route-deployment.json
const sagaDollar = { address: WSAGA_ADDRESS }; // Use existing wSAGA
```

2. Redeploy:
```bash
cd /Users/atharvalade/Documents/Hackathon\ Projects/Fragment/Fragment-Backend/SAGA
npx hardhat run scripts/deploy.js --network fragment
```

### Option B: Update Existing Contract

If FragmentJobRouter allows changing the payment token:

```javascript
// Call setter function (if exists)
await fragmentJobRouter.setPaymentToken(wSagaAddress);
```

## Step 3: Update Worker Scripts

Update all worker scripts to use wSAGA:

### `/Fragment-Backend/SAGA/scripts/register-worker.js`

No changes needed - workers just register

### `/Fragment-Backend/SAGA/scripts/submit-job.js`

```javascript
// Update SAGA Dollar address
const SAGA_DOLLAR_ADDRESS = "0x..."; // wSAGA address from Hyperlane

// Rest stays the same - approval and job submission work identically
```

### `/Fragment-Backend/SAGA/scripts/submit-result.js`

No changes needed - payment is automatic

## Step 4: Fund Workers with wSAGA

Workers need wSAGA to receive payments. Two options:

### Option 1: Bridge SAGA Dollar to Fragment

```bash
cd /Users/atharvalade/Documents/Hackathon\ Projects/Fragment/Fragment-Backend/Hyperlane

# Bridge 100 SAGA Dollar to Fragment
npm run bridge 100 0xYourWarpRouteAddress
```

Then transfer wSAGA to workers:
```javascript
const wSAGA = new ethers.Contract(wSagaAddress, ERC20_ABI, signer);
await wSAGA.transfer(workerAddress, ethers.parseEther("10"));
```

### Option 2: Direct Contract Funding

Fund the FragmentJobRouter with wSAGA for worker payments:

```javascript
const wSAGA = new ethers.Contract(wSagaAddress, ERC20_ABI, requesterSigner);

// Approve router to hold funds
await wSAGA.approve(jobRouterAddress, ethers.parseEther("1000"));

// Transfer to router for escrow
await wSAGA.transfer(jobRouterAddress, ethers.parseEther("1000"));
```

## Step 5: Update Frontend

If you have a UI, update token addresses:

```javascript
// BEFORE:
const SAGA_DOLLAR = "0xMockSagaDollar...";

// AFTER:
const SAGA_DOLLAR = "0xWrappedSagaDollar..."; // wSAGA from Hyperlane
```

## Step 6: Test End-to-End Flow

1. **Bridge SAGA Dollar**:
```bash
cd /Users/atharvalade/Documents/Hackathon\ Projects/Fragment/Fragment-Backend/Hyperlane
npm run bridge 10 0xYourWarpRouteAddress
```

2. **Check wSAGA balance**:
```bash
npm run balance artifacts/warp-route-deployment-*.json
```

3. **Submit job with real wSAGA**:
```bash
cd /Users/atharvalade/Documents/Hackathon\ Projects/Fragment/Fragment-Backend/SAGA
npm run submit-job 2216 content_moderation
```

4. **Worker completes task and gets paid in wSAGA**:
```bash
npm run submit-result 1
```

5. **Worker bridges earnings back to SagaEVM** (if desired):
```bash
# Connect worker wallet to Fragment
# Call wSAGA.transferRemote() to bridge back to SagaEVM
```

## Benefits of Using Real SAGA Dollar

✅ **Real Economy**: Workers earn actual SAGA Dollar, not test tokens
✅ **Interoperability**: Bridge between SagaEVM and Fragment freely
✅ **Liquidity**: SAGA Dollar has real value and can be traded
✅ **Trust**: Transparent on-chain payments with real tokens

## Architecture Diagram

```
User (SagaEVM)
    |
    | 1. Bridge SAGA $ via Hyperlane
    ↓
Fragment Chainlet (wSAGA)
    |
    | 2. Submit job (lock wSAGA in contract)
    ↓
FragmentJobRouter Contract
    |
    | 3. Assign tasks to workers
    ↓
Workers (macOS app)
    |
    | 4. Complete AI inference
    | 5. Submit results
    |
    | 6. Receive wSAGA payment
    ↓
Workers can bridge back to SagaEVM or use wSAGA in Fragment ecosystem
```

## Full Payment Flow

```javascript
// 1. Requester bridges SAGA Dollar to Fragment
// (Hyperlane handles this)

// 2. Requester submits job with wSAGA escrow
const wSAGA = new ethers.Contract(wSagaAddress, ERC20_ABI, requesterSigner);
await wSAGA.approve(jobRouter.address, totalPayment);
await jobRouter.submitJob(datasetId, paymentPerTask, taskType);

// 3. Worker completes task
await jobRouter.submitTaskResult(taskId, resultCid);

// 4. Worker receives wSAGA payment (automatic)
// wSAGA transferred from contract to worker

// 5. Worker can bridge back to SagaEVM if desired
const wSAGAWorker = new ethers.Contract(wSagaAddress, WARP_ABI, workerSigner);
await wSAGAWorker.transferRemote(
  5464, // SagaEVM domain
  workerAddressBytes32,
  amountTobridge
);
```

## Monitoring

### Check wSAGA supply on Fragment
```bash
cast call $WSAGA_ADDRESS "totalSupply()" --rpc-url $FRAGMENT_RPC
```

### Check job router wSAGA balance
```bash
cast call $WSAGA_ADDRESS "balanceOf(address)" $JOB_ROUTER_ADDRESS --rpc-url $FRAGMENT_RPC
```

### Track bridges
All bridge transactions are logged in `bridge-{timestamp}.json` files

## Troubleshooting

### "Insufficient wSAGA balance"
- Bridge more SAGA Dollar from SagaEVM
- Check bridge completed: `npm run balance`

### "Approval failed"
- Ensure requester has wSAGA on Fragment
- Check allowance is sufficient

### "Worker not paid"
- Verify job router has wSAGA balance
- Check task status: `npm run get-job`

### "Bridge stuck"
- Check relayer is synced (Kurtosis logs)
- Wait up to 5 minutes for delivery
- Verify on Hyperlane Explorer

## Next: macOS App Integration

Your macOS worker app should:
1. Display wSAGA balance (real earnings)
2. Show bridge option to SagaEVM
3. Track earnings in USD (if SAGA Dollar price feed available)
4. Allow workers to cash out via bridge

This makes Fragment a real, functional compute marketplace with real economic incentives!

