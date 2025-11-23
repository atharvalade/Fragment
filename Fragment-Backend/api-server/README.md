# Fragment API Server

The central integration layer connecting Frontend, MacOS Workers, SAGA Blockchain, and Filecoin.

## Features

✅ **Real Blockchain Transactions** - All jobs submitted to SAGA Chainlet with Filecoin PCIDs  
✅ **Filecoin Integration** - Uploads/downloads fragments with CDN support  
✅ **Worker Management** - Fragment claiming and result submission  
✅ **SAGA Dollar Payments** - Automatic bounty distribution (0.1 SAGA per fragment)  
✅ **Real-time Job Tracking** - Query job status and fragment progress  
✅ **CSV Results Export** - Download aggregated results  

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
PRIVATE_KEY=your_private_key_here
PORT=3001
SAGA_RPC_URL=https://fragment-2763843736868000-1.jsonrpc.sagarpc.io
SAGA_DOLLAR_ADDRESS=0x728d0f06Bf6D63B4bC9ca7C879D042DDAC66e8A3
JOB_ROUTER_ADDRESS=0xEA48756e27ae679eDE5479dCCB2B29289d320c36
FILECOIN_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

### 3. Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Create Job
```http
POST /api/jobs
Content-Type: application/json

{
  "data": [
    { "text": "This is a test sentence" },
    { "text": "Another sentence to process" }
  ],
  "jobType": "gemma-text-classification",
  "bountyPerFragment": 0.1,
  "prompt": "Classify as safe or unsafe"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "1",
  "totalFragments": 2,
  "transactionHash": "0x123...",
  "explorerUrl": "https://sagaevm.sagaexplorer.io/tx/0x123...",
  "blockNumber": 12345
}
```

**What happens:**
1. Each fragment uploaded to Filecoin → gets Piece CID
2. All Piece CIDs submitted to FragmentJobRouter contract
3. 0.1 SAGA Dollar × fragment count locked in contract
4. Tasks auto-assigned to available workers
5. Returns Job ID and blockchain explorer link

### Get Job Status
```http
GET /api/jobs/:jobId
```

**Response:**
```json
{
  "jobId": "1",
  "totalFragments": 2,
  "completedFragments": 1,
  "status": "active",
  "transactionHash": "0x123...",
  "explorerUrl": "https://sagaevm.sagaexplorer.io/tx/0x123...",
  "fragments": [
    {
      "fragmentId": "1000",
      "jobId": "1",
      "fragmentIndex": 0,
      "data": { "text": "..." },
      "bountyAmount": 0.1,
      "pieceCid": "baga6ea4seaq...",
      "filecoinUrl": "https://ADDRESS.calibration.filbeam.io/PCID",
      "status": "completed",
      "workerId": "0xWorker...",
      "result": {
        "filecoinUrl": "https://...",
        "blobId": "baga6ea4seaq..."
      }
    }
  ]
}
```

### Get Available Fragments (Workers)
```http
GET /api/fragments/available?capability=gemma-text-classification
```

**Response:**
```json
{
  "count": 5,
  "fragments": [
    {
      "fragmentId": "1000",
      "jobId": "1",
      "fragmentIndex": 0,
      "data": { "text": "..." },
      "bountyAmount": 0.1,
      "pieceCid": "baga6ea4seaq...",
      "filecoinUrl": "https://...",
      "status": "pending"
    }
  ]
}
```

### Claim Fragment (Worker)
```http
POST /api/fragments/:fragmentId/claim
Content-Type: application/json

{
  "workerId": "worker-uuid-123"
}
```

### Submit Result (Worker)
```http
POST /api/fragments/:fragmentId/complete
Content-Type: application/json

{
  "result": {
    "text": "Original text",
    "label": "safe"
  },
  "workerId": "worker-uuid-123"
}
```

**What happens:**
1. Result uploaded to Filecoin → gets Result CID
2. Result CID submitted to blockchain
3. 0.1 SAGA Dollar released to worker
4. Fragment marked as completed

### Get Wallet Balances
```http
GET /api/wallets
```

### Download Results CSV
```http
GET /api/jobs/:jobId/results
```

Returns CSV file with all completed fragment results.

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `PRIVATE_KEY`
   - `SAGA_DOLLAR_ADDRESS`
   - `JOB_ROUTER_ADDRESS`
   - `ALLOWED_ORIGINS`

### Deploy to Railway/Render

1. Push to GitHub
2. Connect repository in Railway/Render
3. Set environment variables
4. Deploy!

## Architecture

```
┌─────────────────┐
│   Frontend      │ (Next.js on Vercel)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Server    │ (This server - Node.js/Express)
└────┬────┬───┬───┘
     │    │   │
     ▼    ▼   ▼
┌────────┐ ┌──────────┐ ┌──────────────┐
│ SAGA   │ │ Filecoin │ │ MacOS Worker │
│Chainlet│ │  Storage │ │  (Swift App) │
└────────┘ └──────────┘ └──────────────┘
```

## Flow

**Job Submission:**
1. User submits CSV/text via Frontend
2. API uploads each row to Filecoin (gets PCIDs)
3. API submits job to blockchain with PCIDs array
4. Blockchain locks SAGA Dollar bounties
5. Tasks auto-assigned to workers

**Worker Processing:**
1. Worker polls `/api/fragments/available`
2. Worker claims fragment via `/api/fragments/:id/claim`
3. Worker downloads data from Filecoin using PCID
4. Worker runs AI inference (Gemma)
5. Worker uploads result to Filecoin (gets Result CID)
6. Worker submits via `/api/fragments/:id/complete`
7. API submits Result CID to blockchain
8. Blockchain releases bounty to worker

## Smart Contract Integration

The API server directly interacts with:

- **FragmentJobRouter** (`0xEA48756e27ae679eDE5479dCCB2B29289d320c36`)
  - `submitJob(datasetId, pieceCids[], taskType)` - Create job with Filecoin PCIDs
  - `getJob(jobId)` - Query job status
  - `getTask(taskId)` - Query task details
  - `submitResult(taskId, resultCid)` - Submit result CID

- **MockSAGADollar** (`0x728d0f06Bf6D63B4bC9ca7C879D042DDAC66e8A3`)
  - `balanceOf(address)` - Check balance
  - `approve(spender, amount)` - Approve spending
  - `mint(to, amount)` - Mint tokens (testnet only)

## Filecoin Integration

Uses **Synapse SDK** for Filecoin Calibration testnet:

- **Upload**: `storage.upload(data, metadata)` → Returns Piece CID
- **Download**: `storage.download(pieceCid)` → Returns data
- **CDN**: Automatic via `withCDN: true` for fast global access

## Security Notes

- ✅ CORS configured for specific origins only
- ✅ Private key stored in environment variables
- ✅ Real blockchain transactions (no mocking)
- ✅ Filecoin PCIDs used for data integrity
- ⚠️ For production: Use a database instead of in-memory storage
- ⚠️ For production: Implement authentication/API keys

## Troubleshooting

**"Insufficient SAGA Dollar balance"**
- Server auto-mints tokens on testnet
- Check wallet has MENT tokens for gas

**"Failed to upload to Filecoin"**
- Ensure PRIVATE_KEY has USDFC tokens on Filecoin Calibration
- Run setup: `cd ../Filecoin && npm run setup`

**"Transaction reverted"**
- Check contract addresses in `.env`
- Verify contracts are deployed: `cd ../SAGA && npm run deploy`

**CORS errors**
- Add frontend URL to `ALLOWED_ORIGINS` in `.env`

## License

MIT

