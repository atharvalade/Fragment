import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Register a worker (mock for testing - in production this would be the worker daemon)
 */
async function registerWorker() {
  console.log("👷 Registering worker...\n");

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

  console.log(`📍 Worker Address: ${wallet.address}`);
  
  // Load contract ABI
  const jobRouterABI = JSON.parse(
    fs.readFileSync("artifacts/contracts/FragmentJobRouter.sol/FragmentJobRouter.json", "utf-8")
  ).abi;

  const jobRouter = new ethers.Contract(
    deployment.contracts.FragmentJobRouter,
    jobRouterABI,
    wallet
  );

  // Check if already registered
  const workerInfo = await jobRouter.getWorker(wallet.address);
  if (workerInfo.workerAddress !== ethers.ZeroAddress) {
    console.log("⚠️  Already registered!");
    console.log(`   Status: ${getStatusName(workerInfo.status)}`);
    console.log(`   Tasks Completed: ${workerInfo.tasksCompleted.toString()}`);
    console.log(`   Total Earnings: ${ethers.formatEther(workerInfo.totalEarnings)} SAGA Dollar\n`);
    
    // Update status to Active if needed
    if (workerInfo.status !== 1n) { // 1 = Active
      console.log("🔄 Setting status to Active...");
      const tx = await jobRouter.updateWorkerStatus(1); // 1 = Active
      await tx.wait();
      console.log("✅ Status updated to Active\n");
    }
    
    return;
  }

  // Register
  console.log("📝 Registering as worker...");
  const tx = await jobRouter.registerWorker();
  console.log(`   Transaction hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);

  console.log("=".repeat(60));
  console.log("✅ WORKER REGISTERED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log(`Address: ${wallet.address}`);
  console.log(`Status: Active`);
  console.log(`Ready to process tasks`);
  console.log("=".repeat(60));
  
  console.log("\n📝 Worker is now active and can be auto-assigned tasks");
  console.log("💡 Tasks will be automatically assigned when jobs are submitted\n");
}

function getStatusName(status) {
  const statuses = ["Inactive", "Active", "Busy"];
  return statuses[Number(status)] || "Unknown";
}

// Run registration
registerWorker()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

