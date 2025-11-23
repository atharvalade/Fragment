# 🚀 Fragment - Complete Demo Guide

## System Status
✅ **Contract Deployed:** 0xfCc003692211708EBdfd20aEaEF7a50B8Af8946d  
✅ **Bounty:** 0.01 wSAGA per task  
✅ **Workers:** 10 wallets funded with 100 MENT each  
✅ **AI Model:** Gemma 3 (local inference via llama-server)  

## Running Services
- **API Server:** http://localhost:3001 ✅
- **Frontend:** http://localhost:3002 ✅
- **AI Server:** http://localhost:8080 ✅

---

## 🎬 Demo Flow

### Step 1: Submit Job (Frontend)
1. Open: http://localhost:3002/submit
2. Select **Dataset 2216** (7 fragments)
3. Click **"Submit Job"**
4. Watch job creation + blockchain transaction
5. See 7 tasks created on-chain

### Step 2: Start Workers (MacOS App)
1. Open **Fragment.app** from Xcode
2. Navigate to **"Worker"** tab
3. Click **"Start Worker"** on Worker #1
   - Worker registers on blockchain
   - Starts listening for tasks
   - Shows address + balances (MENT + wSAGA)

### Step 3: Watch AI Processing
**What happens automatically:**
1. ⚡ Worker detects assigned task
2. 📥 Downloads content from Filecoin
3. 🤖 Runs Gemma 3 AI inference locally
4. 📊 Classifies as SAFE/UNSAFE
5. 📤 Submits result to blockchain
6. 💰 Receives 0.01 wSAGA bounty
7. 🔄 Immediately picks up next task

**You'll see:**
- Current task ID in worker card
- "Processing Task #X" status
- Balance increasing: 0.00 → 0.01 → 0.02 wSAGA
- Automatic progression through tasks

### Step 4: Add More Workers
1. Click **"Add New Worker"** button
2. New worker appears (Worker #2)
3. Click **"Start Worker"** on Worker #2
4. Watch parallel processing:
   - Worker #1: Task #1
   - Worker #2: Task #2
   - Both running AI simultaneously
5. Add up to 10 workers total!

### Step 5: View Results (Frontend)
1. Go back to: http://localhost:3002/submit
2. Click **"Download Results CSV"**
3. See all tasks with:
   - Input text
   - AI classification (safe/unsafe)
   - Worker address
   - Status

---

## 🎯 Key Features Demonstrated

### Blockchain Integration
- Real smart contract calls
- Task assignment on-chain
- Bounty transfers (0.01 wSAGA/task)
- Worker registration
- All transactions on SAGA Fragment Chainlet

### Filecoin Integration
- Dataset storage
- Content retrieval via CDN
- Piece CIDs as task identifiers

### AI Inference
- **Local Gemma 3 model**
- Content moderation (hate speech, violence)
- Real-time classification
- Streaming responses

### Multi-Worker System
- 10 independent workers
- Parallel task processing
- Individual balance tracking
- Auto-task pickup after completion
- Visual progress indicators

---

## 📊 Expected Results

**For 7 Tasks (Dataset 2216):**
- Total bounty pool: 0.07 wSAGA
- With 1 worker: ~7-10 seconds total
- With 3 workers: ~3-5 seconds total
- With 7+ workers: ~2-3 seconds total

**Each Worker Shows:**
- Unique wallet address
- MENT balance (gas): 100
- wSAGA balance: increases with each task
- Current processing status
- Tasks completed count

---

## 🔧 Troubleshooting

**If workers don't pick up tasks:**
- Check API logs: `tail -f /tmp/api-server.log`
- Verify job submission: `curl http://localhost:3001/api/jobs/1`
- Check available tasks: `curl http://localhost:3001/api/workers/available-tasks`

**If AI inference fails:**
- Ensure llama-server is running: `lsof -i :8080`
- Check ChatService logs in Xcode console

**If balances don't update:**
- Workers poll every 2 seconds
- Manual refresh: Stop and restart worker

---

## 🎉 Success Metrics

✅ Job submitted to blockchain  
✅ Workers registered and listening  
✅ Tasks downloaded from Filecoin  
✅ AI classifications complete  
✅ Results submitted on-chain  
✅ Bounties transferred to workers  
✅ CSV download with full results  

**All systems operational!** 🚀
