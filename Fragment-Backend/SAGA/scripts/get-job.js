import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Get job status and task details
 */
async function getJobStatus(jobId) {
  console.log(`📊 Fetching job ${jobId} status...\n`);

  // Load deployment info
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found");
  }
  
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  
  // Connect to SAGA Chainlet
  const provider = new ethers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Load contract ABI
  const jobRouterABI = JSON.parse(
    fs.readFileSync("artifacts/contracts/FragmentJobRouter.sol/FragmentJobRouter.json", "utf-8")
  ).abi;

  const jobRouter = new ethers.Contract(
    deployment.contracts.FragmentJobRouter,
    jobRouterABI,
    wallet
  );

  // Get job details
  const job = await jobRouter.getJob(jobId);
  
  if (job.jobId === 0n) {
    throw new Error(`Job ${jobId} not found`);
  }

  console.log("=".repeat(60));
  console.log("📋 JOB DETAILS");
  console.log("=".repeat(60));
  console.log(`Job ID: ${job.jobId}`);
  console.log(`Requester: ${job.requester}`);
  console.log(`Dataset ID: ${job.datasetId}`);
  console.log(`Task Type: ${job.taskType}`);
  console.log(`Total Tasks: ${job.totalTasks}`);
  console.log(`Completed: ${job.completedTasks}`);
  console.log(`Progress: ${Math.round(Number(job.completedTasks) / Number(job.totalTasks) * 100)}%`);
  console.log(`Total Payment: ${ethers.formatEther(job.totalPayment)} SAGA Dollar`);
  console.log(`Status: ${job.isCancelled ? 'Cancelled' : 'Active'}`);
  console.log(`Created: ${new Date(Number(job.createdAt) * 1000).toISOString()}`);
  console.log("=".repeat(60));

  // Get task IDs
  const taskIds = await jobRouter.getJobTasks(jobId);
  
  console.log(`\n📝 Tasks (${taskIds.length}):\n`);
  
  // Get task details
  for (let i = 0; i < Math.min(taskIds.length, 20); i++) {
    const taskId = taskIds[i];
    const task = await jobRouter.getTask(taskId);
    
    const statusNames = ["Pending", "Assigned", "Completed", "Failed"];
    const status = statusNames[Number(task.status)];
    
    console.log(`[${i + 1}] Task ${taskId}`);
    console.log(`    Status: ${status}`);
    console.log(`    Piece CID: ${task.pieceCid}`);
    
    if (task.assignedWorker !== ethers.ZeroAddress) {
      console.log(`    Worker: ${task.assignedWorker}`);
    }
    
    if (task.resultCid) {
      console.log(`    Result CID: ${task.resultCid}`);
      console.log(`    🌐 https://${task.assignedWorker}.calibration.filbeam.io/${task.resultCid}`);
    }
    
    console.log("");
  }
  
  if (taskIds.length > 20) {
    console.log(`... and ${taskIds.length - 20} more tasks\n`);
  }

  // Show pending tasks
  const pendingCount = await jobRouter.getPendingTasksCount();
  console.log(`📌 Pending tasks in queue: ${pendingCount}\n`);
}

// CLI usage
const jobId = parseInt(process.argv[2]);

if (!jobId) {
  console.error("Usage: npm run get-job <jobId>");
  process.exit(1);
}

getJobStatus(jobId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

