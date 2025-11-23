# Fragment SAGA Smart Contracts

SAGA Chainlet smart contracts for routing Filecoin dataset tasks to workers with automatic payment in SAGA Dollar.

## Overview

The Fragment system enables distributed processing of Filecoin datasets:
1. **Upload CSV to Filecoin** → Creates dataset with pieces (fragments)
2. **Submit Job** → Contract creates tasks from dataset pieces
3. **Workers Process** → Auto-assigned, download from Filecoin, run AI inference
4. **Submit Results** → Upload to Filecoin, get paid 0.1 SAGA Dollar per task

## Architecture

```
┌─────────────────────┐
│  Filecoin Storage   │  Datasets & Pieces (CDN-enabled)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ FragmentJobRouter   │  Smart Contract (SAGA Chainlet)
│  - Auto-assigns     │
│  - Escrows payment  │
│  - Releases 0.1 $   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Workers (macOS)   │  Process & Submit Results
└─────────────────────┘
```

## Smart Contracts

### FragmentJobRouter
- **Job Management**: Submit jobs with dataset ID
- **Task Routing**: Auto-assigns tasks to available workers
- **Payment**: Escrows SAGA Dollar, pays 0.1 per task on completion
- **Worker Registry**: Tracks worker status (Active/Busy/Inactive)

### MockSAGADollar
- ERC20 test token (replace with real SAGA Dollar in production)
- Free minting for testing

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:
```env
PRIVATE_KEY=your_private_key_here
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Deploy to SAGA Chainlet

```bash
npm run deploy
```

This deploys:
- MockSAGADollar (test token)
- FragmentJobRouter (job routing contract)

Saves addresses to `deployment.json`.

## Usage Flow

### Step 1: Upload Data to Filecoin

```bash
cd ../Filecoin
npm run upload
npm run datasets  # Get dataset ID
```

### Step 2: Register as Worker

```bash
npm run register-worker
```

This registers your wallet as an available worker.

### Step 3: Submit a Job

```bash
npm run submit-job <datasetId> <taskType>

# Example:
npm run submit-job 2216 content_moderation
```

**What happens:**
1. Fetches pieces from Filecoin dataset
2. Creates one task per piece
3. Escrows 0.1 SAGA Dollar × number of tasks
4. Auto-assigns tasks to available workers
5. Returns Job ID

### Step 4: Worker Processes Task

```bash
npm run submit-result <taskId>

# Example:
npm run submit-result 1
```

**Worker flow:**
1. Downloads piece from Filecoin using CID
2. Runs AI inference (mock content moderation)
3. Uploads result to Filecoin
4. Submits result CID to contract
5. Gets paid 0.1 SAGA Dollar immediately

### Step 5: Check Job Status

```bash
npm run get-job <jobId>

# Example:
npm run get-job 1
```

Shows:
- Job progress (completed/total tasks)
- Task statuses
- Worker assignments
- Result CIDs with CDN URLs

## Contract Addresses

After deployment, addresses saved in `deployment.json`:

**SAGA Fragment Chainlet:**
- Chain ID: `2763843736868000`
- RPC: `https://fragment-2763843736868000-1.jsonrpc.sagarpc.io`
- Genesis Account: `0x9f93EebD463d4B7c991986a082d974E77b5a02Dc` (100,000 MENT)

## Payment Model

- **Cost per task**: 0.1 SAGA Dollar
- **Payment timing**: Immediate upon result submission
- **Escrow**: Full payment locked in contract when job submitted
- **Refund**: Available if job cancelled before tasks completed

## Task Auto-Assignment

Workers are automatically assigned tasks when:
1. Job is submitted (assigns to active workers)
2. Worker completes a task (becomes active again)
3. Worker registers (gets pending tasks)

**Status flow:**
```
Inactive → Active → Busy → Active (after completion)
                ↓
            Auto-assign next task
```

## Integration with macOS App

Your macOS app should:

1. **Start Worker**
   ```javascript
   // Call register-worker.js
   // Sets worker to Active status
   ```

2. **Listen for Assignments**
   ```javascript
   // Poll contract for TaskAssigned events
   // Filter by worker address
   ```

3. **Process & Submit**
   ```javascript
   // Call submit-result.js with taskId
   // Handles download, process, upload, submit
   ```

## File Structure

```
SAGA/
├── contracts/
│   ├── FragmentJobRouter.sol      # Main contract
│   ├── MockSAGADollar.sol         # Test token
├── scripts/
│   ├── deploy.js                  # Deploy contracts
│   ├── submit-job.js              # Submit job
│   ├── register-worker.js         # Register worker
│   ├── submit-result.js           # Process & submit result
│   └── get-job.js                 # Check job status
├── deployment.json                # Contract addresses
└── README.md
```

## Testing

Full end-to-end test:

```bash
# 1. Deploy
npm run deploy

# 2. Register worker
npm run register-worker

# 3. Submit job (uses dataset 2216 with 5 tasks)
npm run submit-job 2216

# 4. Process first task
npm run submit-result 1

# 5. Check progress
npm run get-job 1

# 6. Process remaining tasks
npm run submit-result 2
npm run submit-result 3
npm run submit-result 4
npm run submit-result 5
```

## Events

Contract emits events for tracking:
- `JobSubmitted(jobId, requester, datasetId, totalTasks)`
- `WorkerRegistered(worker)`
- `TaskAssigned(taskId, jobId, worker, pieceCid)`
- `TaskCompleted(taskId, jobId, worker, resultCid)`
- `PaymentReleased(taskId, worker, amount)`

## Security

- ✅ ReentrancyGuard on payment functions
- ✅ Worker verification (only assigned worker can submit)
- ✅ Status checks (task must be Assigned)
- ✅ ERC20 approve/transferFrom pattern
- ✅ Escrow system (payment locked until completion)

## Next Steps

1. ✅ Deploy contracts
2. ✅ Test with mock worker
3. 🔄 Integrate with macOS worker app
4. 🔄 Build frontend UI for job submission
5. 🔄 Replace MockSAGADollar with real SAGA Dollar

## Resources

- [SAGA Chainlet Explorer](https://sagaevm.sagaexplorer.io/)
- [SAGA Dollar](https://coltstable.com)
- [Filecoin Synapse SDK](https://docs.filecoin.cloud)

