import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// No longer importing - will implement inline with our wallet

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration - allow everything
app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json());

// ============================================================================
// BLOCKCHAIN SETUP
// ============================================================================

// Connect to SAGA Chainlet
const sagaProvider = new ethers.JsonRpcProvider(process.env.SAGA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, sagaProvider);

console.log(`🔐 Wallet address: ${wallet.address}`);

// Load contract ABIs
const jobRouterABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../SAGA/artifacts/contracts/FragmentJobRouter.sol/FragmentJobRouter.json'), 'utf-8')
).abi;

// Standard ERC20 ABI for wSAGA (no mint function - it's a bridged token!)
const wSagaABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

// Initialize contracts
const jobRouter = new ethers.Contract(
  process.env.JOB_ROUTER_ADDRESS,
  jobRouterABI,
  wallet
);

const sagaDollar = new ethers.Contract(
  process.env.SAGA_DOLLAR_ADDRESS,
  wSagaABI,
  wallet
);

// ============================================================================
// FILECOIN SETUP
// ============================================================================

// Initialize Filecoin with Synapse SDK
let synapseInstance = null;

async function getSynapse() {
  if (!synapseInstance) {
    try {
      const filecoinProvider = new ethers.JsonRpcProvider(RPC_URLS.calibration.http);
      const filecoinWallet = wallet.connect(filecoinProvider);
      
      console.log('   Initializing Synapse SDK...');
      synapseInstance = await Synapse.create({ 
        signer: filecoinWallet,
        withCDN: true 
      });
      console.log('   ✅ Synapse initialized');
    } catch (error) {
      console.error('   ❌ Synapse initialization failed:', error.message);
      throw error;
    }
  }
  return synapseInstance;
}

/**
 * Query all datasets by running the working download.js script
 */
async function getAllFilecoinDatasets() {
  try {
    console.log('📊 Querying Filecoin using download.js script...');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Run the working download.js script
    const filecoinDir = path.join(__dirname, '../Filecoin');
    const { stdout, stderr } = await execAsync('node download.js all', {
      cwd: filecoinDir,
      timeout: 60000 // 60 second timeout
    });
    
    if (stderr && !stderr.includes('warn')) {
      console.error('   Script stderr:', stderr);
    }
    
    // Read the generated all-pieces.json file
    const piecesPath = path.join(filecoinDir, 'all-pieces.json');
    const allPieces = JSON.parse(fs.readFileSync(piecesPath, 'utf-8'));
    
    // Group by dataset ID
    const datasetsMap = new Map();
    allPieces.forEach(piece => {
      if (!datasetsMap.has(piece.datasetId)) {
        datasetsMap.set(piece.datasetId, {
          datasetId: piece.datasetId,
          pieces: [],
          count: 0
        });
      }
      datasetsMap.get(piece.datasetId).pieces.push(piece);
      datasetsMap.get(piece.datasetId).count++;
    });
    
    const result = Array.from(datasetsMap.values());
    console.log(`   ✅ Found ${result.length} datasets with ${allPieces.length} total pieces`);
    
    return result;
    
  } catch (error) {
    console.error('Error querying Filecoin datasets:', error.message);
    return [];
  }
}

// ============================================================================
// IN-MEMORY JOB STORAGE (for demo - use DB in production)
// ============================================================================

const jobs = new Map();
const fragments = new Map();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Upload data to Filecoin and get piece CID
 */
async function uploadToFilecoin(data, metadata = {}) {
  try {
    const synapse = await getSynapse();
    const storage = await synapse.storage.createContext({ withCDN: true });
    
    // Prepare data (minimum 127 bytes for Filecoin)
    const jsonData = JSON.stringify(data);
    const paddedData = jsonData.padEnd(127, ' ');
    const bytes = new TextEncoder().encode(paddedData);
    
    // Upload
    const { pieceCid, size } = await storage.upload(bytes, { metadata });
    const cidV1 = pieceCid.toV1().toString();
    
    return {
      cid: cidV1,
      cdnUrl: `https://${wallet.address}.calibration.filbeam.io/${cidV1}`,
      size
    };
  } catch (error) {
    console.error('Error uploading to Filecoin:', error);
    throw error;
  }
}

/**
 * Download data from Filecoin using piece CID
 */
async function downloadFromFilecoin(pieceCid) {
  try {
    const synapse = await getSynapse();
    const data = await synapse.storage.download(pieceCid);
    const decoded = new TextDecoder().decode(data);
    return JSON.parse(decoded.trim());
  } catch (error) {
    console.error('Error downloading from Filecoin:', error);
    throw error;
  }
}

/**
 * Get blockchain explorer URL for transaction
 */
function getExplorerUrl(txHash) {
  return `https://sagaevm.sagaexplorer.io/tx/${txHash}`;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    wallet: wallet.address,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/datasets
 * Get available Filecoin datasets by querying blockchain events
 */
app.get('/api/datasets', async (req, res) => {
  try {
    const datasets = await getAllFilecoinDatasets();
    
    // Sort by datasetId in descending order (newest first)
    const datasetList = datasets.sort((a, b) => b.datasetId - a.datasetId);
    
    console.log(`✅ Returning ${datasetList.length} datasets`);
    
    res.json({
      count: datasetList.length,
      datasets: datasetList
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/jobs
 * Create a new job with fragments
 * - Option 1: Use existing Filecoin dataset (provide datasetId)
 * - Option 2: Upload new data to Filecoin (provide data array)
 */
app.post('/api/jobs', async (req, res) => {
  try {
    const { datasetId, data, jobType, bountyPerFragment, prompt } = req.body;
    
    let pieceCids = [];
    let numFragments = 0;
    let useExistingDataset = false;
    
    // Option 1: Use existing Filecoin dataset
    if (datasetId) {
      console.log(`\n📋 Creating job from existing dataset ${datasetId}...`);
      
      // Query blockchain for this dataset's pieces
      const allDatasets = await getAllFilecoinDatasets();
      const dataset = allDatasets.find(d => d.datasetId === parseInt(datasetId));
      
      if (!dataset || dataset.pieces.length === 0) {
        return res.status(404).json({ error: `Dataset ${datasetId} not found` });
      }
      
      pieceCids = dataset.pieces.map(p => p.cid);
      numFragments = pieceCids.length;
      useExistingDataset = true;
      
      console.log(`   ✅ Using ${numFragments} existing pieces from dataset ${datasetId}`);
    }
    // Option 2: Upload new data to Filecoin
    else if (data && Array.isArray(data) && data.length > 0) {
      console.log(`\n📋 Creating job with ${data.length} new fragments...`);
      
      // Upload each fragment to Filecoin
      for (let i = 0; i < data.length; i++) {
        const fragmentData = {
          fragmentIndex: i,
          data: data[i],
          jobType: jobType || 'gemma-text-classification',
          prompt: prompt,
          timestamp: new Date().toISOString()
        };
        
        console.log(`   [${i + 1}/${data.length}] Uploading fragment to Filecoin...`);
        const uploaded = await uploadToFilecoin(fragmentData, {
          fragmentIndex: i.toString(),
          jobType: jobType || 'gemma-text-classification'
        });
        
        pieceCids.push(uploaded.cid);
        console.log(`   ✅ Fragment ${i} uploaded: ${uploaded.cid}`);
      }
      
      numFragments = data.length;
    }
    else {
      return res.status(400).json({ error: 'Either datasetId or data array required' });
    }
    
    // Step 2: Calculate total payment and check balance
    const totalPayment = ethers.parseEther((numFragments * 0.1).toString());
    
    console.log(`\n💰 Total payment needed: ${ethers.formatEther(totalPayment)} wSAGA`);
    
    const balance = await sagaDollar.balanceOf(wallet.address);
    console.log(`   Current balance: ${ethers.formatEther(balance)} wSAGA`);
    
    if (balance < totalPayment) {
      return res.status(400).json({ 
        error: 'Insufficient wSAGA balance',
        required: ethers.formatEther(totalPayment),
        current: ethers.formatEther(balance)
      });
    }
    
    // Step 3: Approve JobRouter to spend SAGA Dollar
    console.log(`\n🔓 Approving contract to spend tokens...`);
    const approveTx = await sagaDollar.approve(
      process.env.JOB_ROUTER_ADDRESS,
      totalPayment
    );
    await approveTx.wait();
    console.log(`   ✅ Approved`);
    
    // Step 4: Submit job to blockchain with Filecoin piece CIDs
    console.log(`\n📤 Submitting job to blockchain...`);
    const blockchainDatasetId = datasetId || Date.now(); // Use provided or timestamp
    const tx = await jobRouter.submitJob(
      blockchainDatasetId,
      pieceCids, // Real Filecoin piece CIDs!
      jobType || 'gemma-text-classification'
    );
    
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log(`   Explorer: ${getExplorerUrl(tx.hash)}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    
    // Parse JobSubmitted event to get job ID
    const jobSubmittedEvent = receipt.logs
      .map(log => {
        try {
          return jobRouter.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find(log => log && log.name === 'JobSubmitted');
    
    if (!jobSubmittedEvent) {
      throw new Error('JobSubmitted event not found');
    }
    
    const jobId = jobSubmittedEvent.args.jobId.toString();
    
    // Step 5: Store job and fragments locally
    const jobData = {
      jobId,
      datasetId: blockchainDatasetId,
      requester: wallet.address,
      jobType: jobType || 'gemma-text-classification',
      prompt,
      totalFragments: numFragments,
      completedFragments: 0,
      status: 'active',
      bountyPerFragment: bountyPerFragment || 0.1,
      transactionHash: tx.hash,
      explorerUrl: getExplorerUrl(tx.hash),
      createdAt: new Date().toISOString(),
      useExistingDataset
    };
    
    jobs.set(jobId, jobData);
    
    console.log(`\n✅ Job created successfully!`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Fragments: ${numFragments}`);
    console.log(`   Dataset: ${useExistingDataset ? 'Existing' : 'New'}`);
    console.log(`   Explorer: ${getExplorerUrl(tx.hash)}\n`);
    
    res.json({
      success: true,
      jobId,
      totalFragments: numFragments,
      transactionHash: tx.hash,
      explorerUrl: getExplorerUrl(tx.hash),
      blockNumber: receipt.blockNumber,
      useExistingDataset
    });
    
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.reason || error.toString()
    });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get job status and all fragments
 */
app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job from blockchain
    const jobData = await jobRouter.getJob(jobId);
    
    // Get all task IDs for this job
    const taskIds = await jobRouter.getJobTasks(jobId);
    
    // Fetch all fragments
    const fragmentsList = [];
    for (const taskId of taskIds) {
      const task = await jobRouter.getTask(taskId);
      const fragmentId = taskId.toString();
      
      const fragment = fragments.get(fragmentId) || {
        fragmentId,
        jobId,
        fragmentIndex: fragmentsList.length,
        data: { text: 'Loading...' },
        bountyAmount: 0.1,
        pieceCid: task.pieceCid,
        filecoinUrl: `https://${wallet.address}.calibration.filbeam.io/${task.pieceCid}`,
        blobId: task.pieceCid,
        status: ['pending', 'assigned', 'completed', 'failed'][Number(task.status)]
      };
      
      // Update status from blockchain
      fragment.status = ['pending', 'assigned', 'completed', 'failed'][Number(task.status)];
      
      if (task.assignedWorker !== ethers.ZeroAddress) {
        fragment.workerId = task.assignedWorker;
      }
      
      if (task.resultCid) {
        fragment.result = {
          filecoinUrl: `https://${wallet.address}.calibration.filbeam.io/${task.resultCid}`,
          blobId: task.resultCid
        };
      }
      
      fragmentsList.push(fragment);
    }
    
    res.json({
      jobId,
      totalFragments: Number(jobData.totalTasks),
      completedFragments: Number(jobData.completedTasks),
      status: jobData.isCancelled ? 'cancelled' : 
              Number(jobData.completedTasks) === Number(jobData.totalTasks) ? 'completed' : 'active',
      fragments: fragmentsList,
      transactionHash: jobs.get(jobId)?.transactionHash,
      explorerUrl: jobs.get(jobId)?.explorerUrl
    });
    
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fragments/available
 * Get all pending fragments that workers can claim
 */
app.get('/api/fragments/available', async (req, res) => {
  try {
    const { capability } = req.query;
    
    // Get pending task count from blockchain
    const pendingCount = await jobRouter.getPendingTasksCount();
    
    // Filter fragments by status
    const availableFragments = Array.from(fragments.values())
      .filter(f => f.status === 'pending')
      .filter(f => !capability || f.jobType === capability);
    
    console.log(`📊 Available fragments: ${availableFragments.length}`);
    
    res.json({
      count: availableFragments.length,
      fragments: availableFragments
    });
    
  } catch (error) {
    console.error('Error fetching available fragments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fragments/:fragmentId/claim
 * Worker claims a fragment
 */
app.post('/api/fragments/:fragmentId/claim', async (req, res) => {
  try {
    const { fragmentId } = req.params;
    const { workerId } = req.body;
    
    console.log(`\n🎯 Worker ${workerId} claiming fragment ${fragmentId}...`);
    
    const fragment = fragments.get(fragmentId);
    if (!fragment) {
      return res.status(404).json({ error: 'Fragment not found' });
    }
    
    if (fragment.status !== 'pending') {
      return res.status(400).json({ error: 'Fragment not available' });
    }
    
    // Update fragment status
    fragment.status = 'claimed';
    fragment.workerId = workerId;
    fragment.claimedAt = new Date().toISOString();
    fragments.set(fragmentId, fragment);
    
    console.log(`   ✅ Fragment claimed by worker ${workerId.substring(0, 8)}...`);
    
    res.json(fragment);
    
  } catch (error) {
    console.error('Error claiming fragment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fragments/:fragmentId/complete
 * Worker submits result for a fragment
 */
app.post('/api/fragments/:fragmentId/complete', async (req, res) => {
  try {
    const { fragmentId } = req.params;
    const { result, workerId } = req.body;
    
    console.log(`\n📤 Worker ${workerId} completing fragment ${fragmentId}...`);
    
    const fragment = fragments.get(fragmentId);
    if (!fragment) {
      return res.status(404).json({ error: 'Fragment not found' });
    }
    
    if (fragment.status !== 'claimed') {
      return res.status(400).json({ error: 'Fragment not claimed' });
    }
    
    // Step 1: Upload result to Filecoin
    console.log(`   📤 Uploading result to Filecoin...`);
    const resultData = {
      fragmentId,
      jobId: fragment.jobId,
      input: fragment.data,
      output: result,
      workerId,
      completedAt: new Date().toISOString()
    };
    
    const uploaded = await uploadToFilecoin(resultData, {
      type: 'result',
      fragmentId
    });
    
    console.log(`   ✅ Result uploaded: ${uploaded.cid}`);
    
    // Step 2: Submit result to blockchain (if task exists on-chain)
    try {
      console.log(`   📤 Submitting to blockchain...`);
      const tx = await jobRouter.submitResult(fragmentId, uploaded.cid);
      await tx.wait();
      console.log(`   ✅ Result submitted to blockchain`);
    } catch (error) {
      console.log(`   ⚠️  Blockchain submission skipped (task may not exist on-chain)`);
    }
    
    // Step 3: Update fragment status
    fragment.status = 'completed';
    fragment.result = {
      filecoinUrl: uploaded.cdnUrl,
      blobId: uploaded.cid
    };
    fragment.completedAt = new Date().toISOString();
    fragments.set(fragmentId, fragment);
    
    // Update job completion count
    const job = jobs.get(fragment.jobId);
    if (job) {
      job.completedFragments++;
      jobs.set(fragment.jobId, job);
    }
    
    console.log(`   ✅ Fragment completed! Bounty: ${fragment.bountyAmount} SAGA\n`);
    
    res.json({
      fragmentId,
      status: 'completed',
      bountyAwarded: fragment.bountyAmount,
      result: fragment.result
    });
    
  } catch (error) {
    console.error('Error completing fragment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/wallets
 * Get wallet balances
 */
app.get('/api/wallets', async (req, res) => {
  try {
    // Exact same approach that worked in terminal test
    const walletAddress = '0x9f93EebD463d4B7c991986a082d974E77b5a02Dc';
    const wSAGA_ADDRESS = '0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E';
    
    // Get native balance
    const nativeBalance = await sagaProvider.getBalance(walletAddress);
    
    // Get wSAGA balance
    const wSAGA = new ethers.Contract(
      wSAGA_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      sagaProvider  // Use provider, not wallet
    );
    const wSagaBalance = await wSAGA.balanceOf(walletAddress);
    
    const nativeMENT = parseFloat(ethers.formatEther(nativeBalance));
    const wSaga = parseFloat(ethers.formatEther(wSagaBalance));
    
    res.json({
      walletA: {
        address: walletAddress,
        saga: nativeMENT,
        usdc: wSaga
      },
      walletB: {
        address: walletAddress,
        saga: nativeMENT,
        usdc: wSaga
      },
      walletC: {
        address: walletAddress,
        saga: nativeMENT,
        usdc: wSaga
      }
    });
    
  } catch (error) {
    console.error('Error fetching wallet balances:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jobs/:jobId/results
 * Download aggregated results as CSV
 */
app.get('/api/jobs/:jobId/results', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = jobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get all completed fragments
    const completedFragments = Array.from(fragments.values())
      .filter(f => f.jobId === jobId && f.status === 'completed')
      .sort((a, b) => a.fragmentIndex - b.fragmentIndex);
    
    // Generate CSV
    let csv = 'Fragment Index,Input Text,Result Label,Worker ID,Completed At\n';
    
    for (const fragment of completedFragments) {
      if (fragment.result?.blobId) {
        try {
          const resultData = await downloadFromFilecoin(fragment.result.blobId);
          const label = resultData.output?.label || 'unknown';
          csv += `${fragment.fragmentIndex},"${fragment.data.text}","${label}","${fragment.workerId}","${fragment.completedAt}"\n`;
        } catch (error) {
          console.error(`Error downloading result for fragment ${fragment.fragmentId}:`, error);
        }
      }
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=results_${jobId}.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error generating results CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('⚡ FRAGMENT API SERVER');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Wallet: ${wallet.address}`);
  console.log(`⛓️  SAGA Chainlet: ${process.env.SAGA_RPC_URL}`);
  console.log(`📦 Job Router: ${process.env.JOB_ROUTER_ADDRESS}`);
  console.log(`💰 SAGA Dollar: ${process.env.SAGA_DOLLAR_ADDRESS}`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   POST   /api/jobs                    - Create job`);
  console.log(`   GET    /api/jobs/:jobId             - Get job status`);
  console.log(`   GET    /api/fragments/available     - List available fragments`);
  console.log(`   POST   /api/fragments/:id/claim     - Claim fragment`);
  console.log(`   POST   /api/fragments/:id/complete  - Submit result`);
  console.log(`   GET    /api/wallets                 - Get balances`);
  console.log(`   GET    /api/jobs/:jobId/results     - Download results CSV`);
  console.log('='.repeat(60) + '\n');
});

export default app;

