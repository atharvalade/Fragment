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
 * Upload entire CSV to Filecoin as ONE NEW DATASET
 * Returns array of CIDs for each fragment
 */
async function uploadEntireCSVToFilecoin(dataArray) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const filecoinDir = path.join(__dirname, '../Filecoin');
    const tempFile = path.join(filecoinDir, `temp-upload-${Date.now()}.csv`);
    
    // Write entire CSV file with all rows
    let csvContent = 'text\n';
    for (const item of dataArray) {
      const textContent = item.text || JSON.stringify(item);
      // No quotes or escaping - keep it simple
      csvContent += textContent + '\n';
    }
    
    fs.writeFileSync(tempFile, csvContent);
    console.log(`   📝 Wrote ${dataArray.length} rows to CSV`);
    
    // Upload using the working script (properly quote path with spaces)
    const { stdout } = await execAsync(`node upload.js "${tempFile}"`, {
      cwd: filecoinDir,
      timeout: 120000 // 2 minutes for multiple fragments
    });
    
    // Parse all CIDs from the output
    const cidMatches = stdout.matchAll(/(?:📦 CID:|Piece CID:)\s+(bafk[a-z0-9]+)/g);
    const cids = Array.from(cidMatches).map(match => match[1]);
    
    if (cids.length === 0) {
      console.error('Upload output:', stdout);
      throw new Error('Could not extract any CIDs from upload output');
    }
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    console.log(`   ✅ Uploaded ${cids.length} fragments to new dataset`);
    return cids;
  } catch (error) {
    console.error('Error uploading CSV to Filecoin:', error.message);
    throw error;
  }
}

/**
 * Upload data to Filecoin and get piece CID (single fragment - LEGACY)
 */
async function uploadToFilecoin(data, metadata = {}) {
  try {
    // Use the working upload.js script - but write CSV format
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const filecoinDir = path.join(__dirname, '../Filecoin');
    const tempFile = path.join(filecoinDir, `temp-upload-${Date.now()}.csv`);
    
    // Extract just the text content, ignoring id or other fields
    let textContent;
    if (data.data && typeof data.data === 'object') {
      // data = { fragmentIndex: 0, data: { id: "1", text: "..." }, ... }
      textContent = data.data.text || JSON.stringify(data.data);
    } else if (data.text) {
      textContent = data.text;
    } else if (typeof data === 'string') {
      textContent = data;
    } else {
      textContent = JSON.stringify(data);
    }
    
    // Escape quotes by doubling them and wrap in quotes
    const escapedText = textContent.replace(/"/g, '""');
    const csvContent = `text\n"${escapedText}"`;
    
    fs.writeFileSync(tempFile, csvContent);
    
    // Upload using the working script (properly quote path with spaces)
    const { stdout } = await execAsync(`node upload.js "${tempFile}"`, {
      cwd: filecoinDir,
      timeout: 60000
    });
    
    // Parse the output to get the CID (matches "📦 CID: bafk..." or "Piece CID: bafk...")
    const cidMatch = stdout.match(/(?:📦 CID:|Piece CID:)\s+(bafk[a-z0-9]+)/);
    if (!cidMatch) {
      console.error('Upload output:', stdout);
      throw new Error('Could not extract CID from upload output');
    }
    
    const cid = cidMatch[1];
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    return {
      cid: cid,
      cdnUrl: `https://0x9f93EebD463d4B7c991986a082d974E77b5a02Dc.calibration.filbeam.io/${cid}`,
      size: Buffer.byteLength(csvContent)
    };
  } catch (error) {
    console.error('Error uploading to Filecoin:', error.message);
    throw error;
  }
}

/**
 * Download data from Filecoin using piece CID
 */
async function downloadFromFilecoin(pieceCid) {
  try {
    // Use CDN URL directly - simple and fast!
    const walletAddress = '0x9f93EebD463d4B7c991986a082d974E77b5a02Dc';
    const cdnUrl = `https://${walletAddress}.calibration.filbeam.io/${pieceCid}`;
    
    const response = await fetch(cdnUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error downloading from Filecoin CDN:', error.message);
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
    // Option 2: Upload new data to Filecoin as ONE NEW DATASET
    else if (data && Array.isArray(data) && data.length > 0) {
      console.log(`\n📋 Creating job with ${data.length} new fragments in ONE NEW DATASET...`);
      
      // Upload entire CSV at once to create one new dataset
      pieceCids = await uploadEntireCSVToFilecoin(data);
      numFragments = data.length;
      
      console.log(`   ✅ Created new dataset with ${numFragments} fragments`);
    }
    else {
      return res.status(400).json({ error: 'Either datasetId or data array required' });
    }
    
    // Step 2: Calculate total payment and check balance
    const totalPayment = ethers.parseEther((numFragments * 0.1).toString());
    
    console.log(`\n💰 Total payment needed: ${ethers.formatEther(totalPayment)} wSAGA`);
    
    // Use same approach as wallets endpoint - provider instead of wallet
    const walletAddress = '0x9f93EebD463d4B7c991986a082d974E77b5a02Dc';
    const wSagaReadOnly = new ethers.Contract(
      process.env.SAGA_DOLLAR_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      sagaProvider
    );
    const balance = await wSagaReadOnly.balanceOf(walletAddress);
    console.log(`   Current balance: ${ethers.formatEther(balance)} wSAGA`);
    
    if (balance < totalPayment) {
      return res.status(400).json({ 
        error: 'Insufficient wSAGA balance',
        required: ethers.formatEther(totalPayment),
        current: ethers.formatEther(balance)
      });
    }
    
    // Step 3: Approve JobRouter to spend wSAGA (need wallet signer for write operation)
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
      
      // Download actual content from Filecoin
      let textContent = 'Loading...';
      if (task.pieceCid) {
        try {
          const inputData = await downloadFromFilecoin(task.pieceCid);
          textContent = inputData.data?.text || inputData.text || JSON.stringify(inputData);
        } catch (error) {
          console.error(`Could not download content for task ${taskId}:`, error.message);
          textContent = 'Error loading content';
        }
      }
      
      const fragment = {
        fragmentId,
        jobId,
        fragmentIndex: fragmentsList.length,
        data: { text: textContent },
        bountyAmount: 0.01,
        pieceCid: task.pieceCid,
        filecoinUrl: `https://${wallet.address}.calibration.filbeam.io/${task.pieceCid}`,
        blobId: task.pieceCid,
        status: ['pending', 'assigned', 'completed', 'failed'][Number(task.status)]
      };
      
      if (task.assignedWorker !== ethers.ZeroAddress) {
        fragment.workerId = task.assignedWorker;
      }
      
      if (task.resultCid) {
        // Check for 'unsafe' FIRST since 'unsafe' contains 'safe'
        let classification = 'unknown';
        if (task.resultCid.includes('unsafe')) {
          classification = 'unsafe';
        } else if (task.resultCid.includes('safe')) {
          classification = 'safe';
        }
        
        fragment.result = {
          classification: classification,
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
    
    console.log(`\n📊 Generating results CSV for job ${jobId}...`);
    
    // Get job from blockchain
    const job = await jobRouter.jobs(jobId);
    if (!job || !job.requester) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get all task IDs for this job
    const taskIds = await jobRouter.getJobTasks(jobId);
    console.log(`   Found ${taskIds.length} tasks`);
    
    // Generate CSV header
    let csv = 'Task ID,Input Text,AI Classification,Worker Address,Status\n';
    
    // Process each task
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const task = await jobRouter.tasks(taskId);
      
      console.log(`   Processing task ${taskId}...`);
      
      let inputText = 'N/A';
      let classification = 'N/A';
      const status = ['Pending', 'Assigned', 'Completed', 'Failed'][Number(task.status)];
      const workerAddr = task.assignedWorker === '0x0000000000000000000000000000000000000000' 
        ? 'Unassigned' 
        : task.assignedWorker;
      
      // Download input content from Filecoin if we have the CID
      if (task.pieceCid) {
        try {
          const inputData = await downloadFromFilecoin(task.pieceCid);
          inputText = inputData.data?.text || JSON.stringify(inputData);
        } catch (error) {
          console.error(`   Could not download input for task ${taskId}:`, error.message);
          inputText = 'Error loading input';
        }
      }
      
      // Parse result classification from resultCid
      if (task.resultCid && task.resultCid !== '') {
        console.log(`   Task ${taskId} resultCid: "${task.resultCid}"`);
        // Result format is like: "result-safe-task-1" or "result-unsafe-task-1"
        // Check for 'unsafe' FIRST since 'unsafe' contains 'safe'
        if (task.resultCid.includes('unsafe')) {
          classification = 'unsafe';
          console.log(`   -> Classified as: unsafe`);
        } else if (task.resultCid.includes('safe')) {
          classification = 'safe';
          console.log(`   -> Classified as: safe`);
        } else {
          classification = task.resultCid;
          console.log(`   -> Classified as: ${task.resultCid}`);
        }
      }
      
      // Escape quotes in text for CSV
      inputText = inputText.replace(/"/g, '""');
      
      csv += `${taskId.toString()},"${inputText}","${classification}","${workerAddr}","${status}"\n`;
    }
    
    console.log(`   ✅ CSV generated with ${taskIds.length} rows\n`);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=job_${jobId}_results.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error generating results CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WORKER MANAGEMENT
// ============================================================================

// Load worker wallets
const workerWalletsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'worker-wallets.json'), 'utf-8'));
const activeWorkers = new Map(); // Track active workers (workerId -> wallet instance)

// Cache for worker data (refresh every 30 seconds)
let workerDataCache = null;
let workerDataCacheTime = 0;
const WORKER_CACHE_TTL = 30000; // 30 seconds - aggressive caching

/**
 * GET /api/workers
 * Get all worker wallets and their balances (cached for performance)
 */
app.get('/api/workers', async (req, res) => {
  try {
    // Return cached data if still fresh
    const now = Date.now();
    if (workerDataCache && (now - workerDataCacheTime) < WORKER_CACHE_TTL) {
      return res.json({ workers: workerDataCache, cached: true });
    }
    
    console.log('\n👷 Refreshing worker balances cache...');
    
    const workers = [];
    
    for (const workerData of workerWalletsData) {
      // Get balances
      const mentBalance = await sagaProvider.getBalance(workerData.address);
      const wsagaBalance = await sagaDollar.balanceOf(workerData.address);
      
      // Check if registered on blockchain
      let isRegistered = false;
      try {
        const workerInfo = await jobRouter.workers(workerData.address);
        isRegistered = workerInfo && workerInfo.isActive ? true : false;
      } catch (error) {
        // Not registered - keep as false
        isRegistered = false;
      }
      
      workers.push({
        id: workerData.id,
        address: workerData.address,
        isActive: activeWorkers.has(workerData.id),
        isRegistered: isRegistered,
        balance: {
          ment: parseFloat(ethers.formatEther(mentBalance)),
          wsaga: parseFloat(ethers.formatEther(wsagaBalance))
        }
      });
    }
    
    // Update cache
    workerDataCache = workers;
    workerDataCacheTime = now;
    
    console.log(`   ✅ Cached ${workers.length} workers (${activeWorkers.size} active)\n`);
    
    res.json({ workers });
    
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workers/:workerId/start
 * Start a worker (activate it to listen for tasks)
 */
app.post('/api/workers/:workerId/start', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    console.log(`\n🚀 Starting worker ${workerId}...`);
    
    // Find worker data
    const workerData = workerWalletsData.find(w => w.id === workerId);
    if (!workerData) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // Create wallet instance
    const workerWallet = new ethers.Wallet(workerData.privateKey, sagaProvider);
    
    // Register worker on blockchain if not already registered
    const workerInfo = await jobRouter.workers(workerData.address);
    let txHash = null;
    if (!workerInfo.isActive) {
      console.log(`   Registering worker on blockchain (no wait)...`);
      const jobRouterWithWorker = jobRouter.connect(workerWallet);
      const tx = await jobRouterWithWorker.registerWorker();
      txHash = tx.hash;
      console.log(`   TX submitted: ${tx.hash} (confirming in background)`);
      // DON'T wait for confirmation - let it process in background
    }
    
    // Add to active workers immediately
    activeWorkers.set(workerId, workerWallet);
    
    console.log(`   ✅ Worker ${workerId} started instantly!\n`);
    
    res.json({
      success: true,
      workerId,
      address: workerData.address,
      txHash: txHash,
      message: 'Worker started successfully'
    });
    
  } catch (error) {
    console.error('Error starting worker:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workers/:workerId/stop
 * Stop a worker
 */
app.post('/api/workers/:workerId/stop', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    console.log(`\n🛑 Stopping worker ${workerId}...`);
    
    if (!activeWorkers.has(workerId)) {
      return res.status(400).json({ error: 'Worker is not active' });
    }
    
    activeWorkers.delete(workerId);
    
    console.log(`   ✅ Worker ${workerId} stopped\n`);
    
    res.json({
      success: true,
      workerId,
      message: 'Worker stopped successfully'
    });
    
  } catch (error) {
    console.error('Error stopping worker:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache for available tasks (refresh every 30 seconds)
let availableTasksCache = null;
let availableTasksCacheTime = 0;
const TASKS_CACHE_TTL = 30000; // 30 seconds - aggressive caching

/**
 * GET /api/workers/available-tasks
 * Get all available tasks that workers can claim (HEAVILY CACHED)
 */
app.get('/api/workers/available-tasks', async (req, res) => {
  try {
    // Return cached data if still fresh
    const now = Date.now();
    if (availableTasksCache && (now - availableTasksCacheTime) < TASKS_CACHE_TTL) {
      return res.json({ tasks: availableTasksCache, cached: true });
    }
    
    console.log('\n📋 Refreshing available tasks cache...');
    
    const taskCounter = await jobRouter.taskCounter();
    const availableTasks = [];
    
    // OPTIMIZATION: Only check the last 20 tasks (most recent ones)
    // Old completed tasks don't need to be scanned
    const startFrom = Math.max(1, Number(taskCounter) - 19);
    
    for (let i = startFrom; i <= taskCounter; i++) {
      const task = await jobRouter.tasks(i);
      
      // Check if task is pending or assigned to a worker but not yet completed
      if (Number(task.status) === 0 || Number(task.status) === 1) {
        availableTasks.push({
          taskId: i.toString(),
          jobId: task.jobId.toString(),
          status: ['Pending', 'Assigned', 'Completed', 'Failed'][Number(task.status)],
          pieceCid: task.pieceCid,
          assignedWorker: task.assignedWorker,
          bounty: '0.01' // wSAGA
        });
      }
    }
    
    // Update cache
    availableTasksCache = availableTasks;
    availableTasksCacheTime = now;
    
    console.log(`   ✅ Cached ${availableTasks.length} available tasks\n`);
    
    res.json({ tasks: availableTasks });
    
  } catch (error) {
    console.error('Error fetching available tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workers/:workerId/complete-task
 * Complete a task (simulated - wait 1s and return "safe")
 */
app.post('/api/workers/:workerId/complete-task', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    const { taskId, result } = req.body;
    
    console.log(`\n⚙️  Worker ${workerId} completing task ${taskId}...`);
    console.log(`   Request body:`, JSON.stringify(req.body));
    console.log(`   Result parameter: "${result}"`);
    
    // Find worker data
    const workerData = workerWalletsData.find(w => w.id === workerId);
    if (!workerData) {
      console.error(`   ❌ Worker ${workerId} not found in wallet data`);
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // Create wallet instance (don't require activeWorkers - workers can complete tasks anytime)
    const workerWallet = new ethers.Wallet(workerData.privateKey, sagaProvider);
    console.log(`   ✅ Worker wallet: ${workerWallet.address}`);
    
    // Get task details
    const task = await jobRouter.tasks(taskId);
    console.log(`   Task status: ${Number(task.status)} (0=Pending, 1=Assigned, 2=Completed, 3=Cancelled)`);
    console.log(`   Assigned to: ${task.assignedWorker}`);
    
    if (Number(task.status) !== 1) {
      console.error(`   ❌ Task is not assigned (status: ${Number(task.status)})`);
      return res.status(400).json({ error: `Task is not assigned (status: ${Number(task.status)})` });
    }
    
    // Check if assigned to this worker
    if (task.assignedWorker.toLowerCase() !== workerWallet.address.toLowerCase()) {
      console.error(`   ❌ Task assigned to ${task.assignedWorker}, not ${workerWallet.address}`);
      return res.status(400).json({ error: 'Task is not assigned to this worker' });
    }
    
    // Use the result from the request body (already computed by worker)
    const classification = result || 'safe';
    console.log(`   ✅ Classification from worker: ${classification}`);
    
    // Submit result to blockchain (skip Filecoin upload)
    console.log(`   📤 Submitting result to blockchain...`);
    const jobRouterWithWorker = jobRouter.connect(workerWallet);
    const resultCid = `result-${classification}-task-${taskId}`;
    
    const tx = await jobRouterWithWorker.submitResult(taskId, resultCid);
    console.log(`   TX submitted: ${tx.hash} (confirming in background)`);
    // DON'T wait for confirmation - respond immediately
    
    // Get current balance (will update in next cache refresh)
    const wsagaBalance = await sagaDollar.balanceOf(workerWallet.address);
    const estimatedNewBalance = parseFloat(ethers.formatEther(wsagaBalance)) + 0.01;
    
    console.log(`   💰 Estimated new balance: ${estimatedNewBalance} wSAGA`);
    console.log(`   🎉 Task ${taskId} submitted instantly!\n`);
    
    // Only invalidate available tasks cache (worker balances update slowly anyway)
    availableTasksCache = null;
    
    res.json({
      success: true,
      taskId: taskId.toString(),
      workerId,
      classification,
      txHash: tx.hash,
      explorerUrl: getExplorerUrl(tx.hash),
      bountyEarned: '0.01',
      newBalance: estimatedNewBalance
    });
    
  } catch (error) {
    console.error('Error completing task:', error);
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

