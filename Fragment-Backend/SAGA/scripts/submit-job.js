import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Submit a job to Fragment contract
 * Reads dataset pieces from Filecoin and creates tasks
 */
async function submitJob(datasetId, taskType = "content_moderation") {
  console.log("📋 Submitting job to Fragment contract...\n");

  // Load deployment info
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found. Run npm run deploy first");
  }
  
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  
  // Connect to SAGA Chainlet
  const provider = new ethers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log(`📍 Wallet: ${wallet.address}`);
  
  // Load contract ABIs
  const jobRouterABI = JSON.parse(
    fs.readFileSync("artifacts/contracts/FragmentJobRouter.sol/FragmentJobRouter.json", "utf-8")
  ).abi;
  
  const sagaDollarABI = JSON.parse(
    fs.readFileSync("artifacts/contracts/MockSAGADollar.sol/MockSAGADollar.json", "utf-8")
  ).abi;

  const jobRouter = new ethers.Contract(
    deployment.contracts.FragmentJobRouter,
    jobRouterABI,
    wallet
  );
  
  const sagaDollar = new ethers.Contract(
    deployment.contracts.MockSAGADollar,
    sagaDollarABI,
    wallet
  );

  // Load pieces from Filecoin (from all-pieces.json)
  const filecoinDataPath = "../Filecoin/all-pieces.json";
  if (!fs.existsSync(filecoinDataPath)) {
    throw new Error(`${filecoinDataPath} not found. Run Filecoin download first`);
  }

  const allPieces = JSON.parse(fs.readFileSync(filecoinDataPath, "utf-8"));
  
  // Filter pieces by dataset ID
  const datasetPieces = allPieces.filter(p => p.datasetId === datasetId);
  
  if (datasetPieces.length === 0) {
    throw new Error(`No pieces found for dataset ${datasetId}`);
  }

  console.log(`📦 Dataset ID: ${datasetId}`);
  console.log(`📝 Task Type: ${taskType}`);
  console.log(`🔢 Total Tasks: ${datasetPieces.length}`);
  
  const pieceCids = datasetPieces.map(p => p.cid);
  const totalPayment = ethers.parseEther((datasetPieces.length * 0.1).toString());
  
  console.log(`💰 Total Payment: ${ethers.formatEther(totalPayment)} SAGA Dollar\n`);

  // Check balance
  const balance = await sagaDollar.balanceOf(wallet.address);
  console.log(`💳 Your balance: ${ethers.formatEther(balance)} SAGA Dollar`);
  
  if (balance < totalPayment) {
    console.log(`⚠️  Insufficient balance. Minting tokens...`);
    const mintTx = await sagaDollar.mint(wallet.address, totalPayment);
    await mintTx.wait();
    console.log(`✅ Minted ${ethers.formatEther(totalPayment)} SAGA Dollar\n`);
  }

  // Approve contract to spend tokens
  console.log("🔓 Approving contract to spend SAGA Dollar...");
  const approveTx = await sagaDollar.approve(
    deployment.contracts.FragmentJobRouter,
    totalPayment
  );
  await approveTx.wait();
  console.log("✅ Approved\n");

  // Submit job
  console.log("📤 Submitting job to contract...");
  const tx = await jobRouter.submitJob(datasetId, pieceCids, taskType);
  console.log(`   Transaction hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);

  // Parse events to get job ID
  const jobSubmittedEvent = receipt.logs
    .map(log => {
      try {
        return jobRouter.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(log => log && log.name === "JobSubmitted");

  if (jobSubmittedEvent) {
    const jobId = jobSubmittedEvent.args.jobId;
    console.log("=".repeat(60));
    console.log("✅ JOB SUBMITTED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`Job ID: ${jobId}`);
    console.log(`Dataset ID: ${datasetId}`);
    console.log(`Tasks: ${datasetPieces.length}`);
    console.log(`Payment: ${ethers.formatEther(totalPayment)} SAGA Dollar`);
    console.log("=".repeat(60));
    
    // Save job info
    fs.writeFileSync(`job-${jobId}.json`, JSON.stringify({
      jobId: jobId.toString(),
      datasetId,
      taskType,
      totalTasks: datasetPieces.length,
      pieceCids,
      totalPayment: ethers.formatEther(totalPayment),
      transactionHash: tx.hash,
      submittedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n💾 Job info saved to job-${jobId}.json`);
    console.log(`\n📝 Workers can now claim tasks for job ${jobId}\n`);
    
    return jobId;
  }
}

// CLI usage
const datasetId = parseInt(process.argv[2]) || 2216;
const taskType = process.argv[3] || "content_moderation";

submitJob(datasetId, taskType)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

