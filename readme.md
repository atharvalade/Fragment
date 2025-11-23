# ⚡ Fragment

**Decentralized AI Compute Network on SAGA Chainlet with Filecoin Storage**

Fragment is a decentralized compute network that enables AI inference tasks to be distributed across multiple worker nodes (MacOS devices), with all data stored on Filecoin and payments made via wSAGA (Wrapped SAGA Dollar) on a custom SAGA chainlet.

## 🎯 Overview

Fragment breaks down AI moderation tasks into "fragments" that are processed by distributed workers running local AI models. Each fragment:
- Is stored on **Filecoin** for decentralized, permanent storage
- Is assigned to workers via **smart contracts** on the Fragment SAGA Chainlet
- Pays **0.01 wSAGA** bounty per completed task
- Returns results that are aggregated and made available via the frontend

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │ (Next.js)
│  localhost:3002 │ - Submit jobs
└────────┬────────┘ - View results
         │         - Monitor progress
         ↓
┌─────────────────┐
│   API Server    │ (Express.js)
│  localhost:3001 │ - Job orchestration
└────────┬────────┘ - Blockchain interaction
         │         - Filecoin upload/download
         ↓
┌─────────────────────────────────────┐
│                                     │
│   Fragment SAGA Chainlet            │
│   (Custom blockchain)               │
│                                     │
│   - FragmentJobRouter.sol           │
│   - Worker registration             │
│   - Task assignment                 │
│   - Bounty payments (wSAGA)         │
│                                     │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│   MacOS Worker App (Swift)          │
│   - Listens for tasks               │
│   - Downloads from Filecoin         │
│   - Runs local Gemma 3 AI model     │
│   - Submits results to blockchain   │
│   - Receives bounty                 │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Filecoin (via Synapse SDK)       │
│   - CDN: calibration.filbeam.io     │
│   - Stores input data (fragments)   │
│   - Stores AI results               │
└─────────────────────────────────────┘
```

## 📁 Project Structure

```
Fragment/
├── Fragment-Backend/
│   ├── SAGA/                    # Smart contracts
│   │   ├── contracts/
│   │   │   ├── FragmentJobRouter.sol     # Main contract
│   │   │   └── MockSAGADollar.sol        # (Deprecated, now using wSAGA)
│   │   ├── scripts/
│   │   │   ├── deploy-with-wsaga.js      # Deploy with real wSAGA token
│   │   │   ├── fund-workers.js           # Fund worker wallets with MENT
│   │   │   ├── submit-job.js
│   │   │   └── get-job.js
│   │   ├── worker-wallets.json           # 10 generated worker wallets
│   │   └── deployment.json               # Contract addresses
│   │
│   ├── Filecoin/                # Filecoin integration
│   │   ├── upload.js            # Upload data to Filecoin
│   │   ├── download.js          # Download/query datasets
│   │   └── all-pieces.json      # Cached dataset info
│   │
│   ├── Hyperlane/               # Cross-chain bridge (wSAGA)
│   │   ├── contracts/
│   │   │   └── SagaDollarBridge.sol
│   │   └── scripts/
│   │       ├── deploy-bridge.js
│   │       └── bridge-deposit.js
│   │
│   └── api-server/              # Main backend API
│       ├── server.js            # Express server
│       └── .env                 # Configuration
│
├── Fragment-Frontend/           # Next.js web interface
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── submit/
│   │   │   └── page.tsx        # Job submission UI
│   │   └── jobs/
│   │       └── page.tsx        # Job tracking UI
│   └── lib/
│       ├── config.ts           # API configuration
│       └── utils.ts
│
├── Fragment-Swift/              # MacOS worker app
│   └── Fragment/
│       ├── Services/
│       │   ├── WorkerService.swift      # Worker orchestration
│       │   ├── ChatService.swift        # Gemma 3 AI inference
│       │   └── LlamaServerManager.swift # llama.cpp server
│       ├── Views/
│       │   ├── JobsView.swift           # Main worker view
│       │   └── WorkerWindow.swift       # Per-worker window
│       ├── Models/
│       │   └── SystemMonitor.swift      # Resource monitoring
│       └── gemma-3-4b-it-q4_0.gguf      # Local AI model
│
└── readme.md                    # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for backend & frontend)
- **Xcode** 15+ (for MacOS worker app)
- **Hardhat** (for smart contracts)
- **Filecoin account** with Synapse SDK credentials
- **SAGA Chainlet** RPC access

### 1. Smart Contract Deployment

```bash
cd Fragment-Backend/SAGA

# Install dependencies
npm install

# Configure .env with your private key
echo "PRIVATE_KEY=your_private_key_here" > .env
echo "SAGA_RPC_URL=https://fragment-2763843736868000-1.jsonrpc.sagarpc.io" >> .env
echo "SAGA_DOLLAR_ADDRESS=0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E" >> .env

# Deploy FragmentJobRouter with wSAGA
npm run deploy:wsaga

# Generate and fund worker wallets
node scripts/generate-wallets.js
node scripts/fund-workers.js
```

**Deployed Contracts:**
- **FragmentJobRouter**: `0xfCc003692211708EBdfd20aEaEF7a50B8Af8946d`
- **wSAGA (Wrapped SAGA Dollar)**: `0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E`

### 2. API Server Setup

```bash
cd Fragment-Backend/api-server

# Install dependencies
npm install

# Configure .env
cat > .env << EOF
PORT=3001
PRIVATE_KEY=your_deployer_private_key
SAGA_RPC_URL=https://fragment-2763843736868000-1.jsonrpc.sagarpc.io
JOB_ROUTER_ADDRESS=0xfCc003692211708EBdfd20aEaEF7a50B8Af8946d
SAGA_DOLLAR_ADDRESS=0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E
SYNAPSE_API_KEY=your_synapse_api_key
WALLET_ADDRESS=0x9f93EebD463d4B7c991986a082d974E77b5a02Dc
EOF

# Start the API server
node server.js
```

The API server will start on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd Fragment-Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:3002`

### 4. MacOS Worker App Setup

```bash
cd Fragment-Swift/Fragment

# Open in Xcode
open Fragment.xcodeproj

# Build and run
# The app will connect to http://localhost:3001/api
```

**Requirements:**
- MacOS 13.0+
- Apple Silicon (M1/M2/M3) for optimal AI performance
- ~5GB disk space for Gemma 3 model

## 📊 Smart Contract Details

### FragmentJobRouter.sol

**Key Functions:**

```solidity
// Submit a new job (user pays upfront)
function submitJob(
    uint256 datasetId,
    string[] calldata pieceCids
) external returns (uint256 jobId)

// Worker registration
function registerWorker() external

// Auto-assigns tasks to active workers
function _autoAssignTasks() internal

// Worker submits result
function submitResult(
    uint256 taskId, 
    string calldata resultCid
) external
```

**Payment Model:**
- **Cost**: 0.01 wSAGA per fragment
- **Payment**: User pre-approves and pays total when submitting job
- **Distribution**: Workers receive bounty when submitting valid results
- **Token**: wSAGA (ERC20 wrapped SAGA Dollar)

**Task States:**
- `Pending (0)`: Task created, awaiting assignment
- `Assigned (1)`: Task assigned to a worker
- `Completed (2)`: Worker submitted result, bounty paid
- `Cancelled (3)`: Task cancelled

## 🔄 User Flow

### 1. Submit Job

**Frontend** → **API Server** → **Blockchain**

```javascript
// User selects existing Filecoin dataset or uploads new data
POST /api/jobs
{
  "jobType": "gemma-text-classification",
  "bountyPerFragment": 0.01,
  "datasetId": 2216,  // OR upload new data
  "data": [{ "text": "..." }]
}

// Response
{
  "jobId": "13",
  "totalFragments": 19,
  "transactionHash": "0x...",
  "explorerUrl": "https://fragment-2763843736868000-1.sagaexplorer.io/tx/0x..."
}
```

### 2. Worker Registration

**MacOS App** → **API Server** → **Blockchain**

```javascript
// Worker registers on blockchain
POST /api/workers/:workerId/start

// Worker polls for available tasks
GET /api/workers/available-tasks
```

### 3. Task Processing

**MacOS App** workflow:

1. **Poll** for available tasks (every 3 seconds)
2. **Claim** task (auto-assigned by contract)
3. **Download** input from Filecoin CDN
4. **Run** Gemma 3 AI inference locally
5. **Submit** result to blockchain
6. **Receive** 0.01 wSAGA bounty

### 4. Results Aggregation

**Frontend** → **API Server** → **Blockchain** + **Filecoin**

```javascript
// Download aggregated results
GET /api/jobs/:jobId/results

// Returns CSV:
// Input,Classification
// "This is great!",safe
// "I hate you",unsafe
```

## 🌐 API Endpoints

### Jobs

- `POST /api/jobs` - Create new job
- `GET /api/jobs/:jobId` - Get job status and task details
- `GET /api/jobs/:jobId/results` - Download results CSV

### Workers

- `GET /api/workers` - List all workers with balances
- `POST /api/workers/:workerId/start` - Register worker
- `POST /api/workers/:workerId/stop` - Deactivate worker
- `GET /api/workers/available-tasks` - Get pending/assigned tasks
- `POST /api/workers/:workerId/complete-task` - Submit task result

### Datasets

- `GET /api/datasets` - List all Filecoin datasets

### Wallets

- `GET /api/wallets` - Get wallet balances (MENT & wSAGA)

## 🧠 AI Model

**Gemma 3 4B** (Quantized Q4_0)
- **Size**: ~2.5GB
- **Format**: GGUF
- **Engine**: llama.cpp
- **Task**: Text safety classification (safe/unsafe)

**Prompt:**
```
Classify the following text as 'safe' or 'unsafe' based on harmful content (hate speech, violence, sexual content, etc.). Respond with only 'safe' or 'unsafe'.
```

## 💾 Filecoin Integration

**Synapse SDK** (via CDN)
- **Network**: Calibration testnet
- **CDN URL**: `https://0x9f93EebD463d4B7c991986a082d974E77b5a02Dc.calibration.filbeam.io/{CID}`
- **Upload**: Via `upload.js` script
- **Download**: Direct CDN fetch (no SDK required)

**Current Dataset**: 2216 (19 fragments)

## 🔐 Security

- **Worker Wallets**: 10 pre-generated wallets with private keys in `worker-wallets.json`
- **Payment**: Pre-approved ERC20 transfers, no direct ETH handling
- **Task Assignment**: Auto-assigned by smart contract, workers can't choose
- **Result Submission**: Only assigned worker can submit

## 📈 Performance Optimizations

- **Caching**: 
  - Worker list cached for 10 seconds
  - Available tasks cached for 30 seconds
  - Cache invalidated on task completion
  
- **RPC Optimization**:
  - Only scan last 20 tasks (not all)
  - Batch blockchain calls where possible
  
- **Instant API Responses**:
  - Worker registration returns immediately (tx sent to background)
  - Task completion returns immediately (tx sent to background)

## 🐛 Debugging

### Check API Server Logs
```bash
# API server logs all blockchain interactions
tail -f Fragment-Backend/api-server/server.log
```

### Check Blockchain Status
```bash
cd Fragment-Backend/SAGA
node scripts/get-job.js <jobId>
```

### Check Worker Balances
```bash
curl http://localhost:3001/api/workers | jq
```

### Check Available Tasks
```bash
curl http://localhost:3001/api/workers/available-tasks | jq
```

## 🎯 Demo Flow

1. **Start API Server**: `cd Fragment-Backend/api-server && node server.js`
2. **Start Frontend**: `cd Fragment-Frontend && npm run dev`
3. **Open MacOS App**: Launch Fragment.app in Xcode
4. **Submit Job**: Go to `http://localhost:3002/submit`, select dataset 2216
5. **Add Workers**: Click "Add Worker" in MacOS app (add 3-5 workers)
6. **Start Workers**: Click "Start Worker" for each worker
7. **Watch Progress**: Monitor frontend for real-time updates
8. **Download Results**: Once 100% complete, download CSV with classifications

## 📝 Notes

- **Gas Token**: MENT (native token on Fragment Chainlet)
- **Payment Token**: wSAGA (Wrapped SAGA Dollar, ERC20)
- **Block Explorer**: https://fragment-2763843736868000-1.sagaexplorer.io/
- **Block Time**: ~2 seconds
- **Task Completion**: ~5-10 seconds per task (including AI inference)

## 🚧 Known Issues

- **CSV Upload**: Currently appends to existing dataset (2216) due to Filecoin fund limitations
- **Worker Registration**: First registration takes ~10 seconds for blockchain confirmation
- **Task Assignment**: Auto-assignment happens on `registerWorker()` and `submitResult()`

## 🔮 Future Improvements

- [ ] Support for multiple AI models
- [ ] Dynamic pricing based on task complexity
- [ ] Worker reputation system
- [ ] Result verification via multiple workers
- [ ] Frontend deployment to Vercel
- [ ] iOS worker support
- [ ] GPU acceleration for AI inference
- [ ] Real-time WebSocket updates instead of polling

## 📄 License

MIT

## 🙏 Acknowledgments

- **SAGA Protocol** - Custom chainlet infrastructure
- **Filecoin** - Decentralized storage via Synapse SDK
- **Hyperlane** - Cross-chain messaging for wSAGA bridge
- **Gemma** - Google's open-source LLM
- **llama.cpp** - Efficient LLM inference

---

**Built with ⚡ by Fragment Team**
