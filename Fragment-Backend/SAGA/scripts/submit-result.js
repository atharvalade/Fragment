import { ethers } from "ethers";
import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Submit task result (worker flow)
 * 1. Download piece from Filecoin
 * 2. Process it (mock AI inference)
 * 3. Upload result to Filecoin
 * 4. Submit result CID to contract
 */
async function submitResult(taskId) {
  console.log(`🤖 Processing and submitting result for task ${taskId}...\n`);

  // Load deployment info
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found");
  }
  
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  
  // Connect to SAGA Chainlet
  const sagaProvider = new ethers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, sagaProvider);

  console.log(`📍 Worker: ${wallet.address}\n`);
  
  // Load contract ABI
  const jobRouterABI = JSON.parse(
    fs.readFileSync("artifacts/contracts/FragmentJobRouter.sol/FragmentJobRouter.json", "utf-8")
  ).abi;

  const jobRouter = new ethers.Contract(
    deployment.contracts.FragmentJobRouter,
    jobRouterABI,
    wallet
  );

  // Get task details
  console.log("1️⃣  Fetching task details...");
  const task = await jobRouter.getTask(taskId);
  
  if (task.assignedWorker !== wallet.address) {
    throw new Error("Task not assigned to you");
  }
  
  if (task.status !== 1n) { // 1 = Assigned
    throw new Error(`Task status is ${task.status}, expected Assigned (1)`);
  }
  
  console.log(`   Task ID: ${taskId}`);
  console.log(`   Job ID: ${task.jobId}`);
  console.log(`   Piece CID: ${task.pieceCid}\n`);

  // Download piece from Filecoin
  console.log("2️⃣  Downloading piece from Filecoin...");
  const filecoinProvider = new ethers.JsonRpcProvider(RPC_URLS.calibration.http);
  const filecoinWallet = wallet.connect(filecoinProvider);
  const synapse = await Synapse.create({ signer: filecoinWallet });
  
  const pieceData = await synapse.storage.download(task.pieceCid);
  const decodedText = new TextDecoder().decode(pieceData);
  const parsedData = JSON.parse(decodedText.trim());
  
  console.log(`   ✅ Downloaded piece`);
  console.log(`   Content: ${JSON.stringify(parsedData).substring(0, 80)}...\n`);

  // Mock AI processing (content moderation)
  console.log("3️⃣  Processing with AI (content moderation)...");
  const result = await mockContentModeration(parsedData);
  console.log(`   ✅ Processing complete`);
  console.log(`   Result: ${result.is_safe ? '✅ Safe' : '❌ Unsafe'} (confidence: ${result.confidence})\n`);

  // Upload result to Filecoin
  console.log("4️⃣  Uploading result to Filecoin...");
  const resultData = JSON.stringify({
    taskId: taskId.toString(),
    jobId: task.jobId.toString(),
    originalPieceCid: task.pieceCid,
    input: parsedData,
    output: result,
    processedAt: new Date().toISOString(),
    worker: wallet.address
  });
  
  const paddedResult = resultData.padEnd(127, ' ');
  const resultBytes = new TextEncoder().encode(paddedResult);
  
  // Create storage context with CDN
  const storage = await synapse.storage.createContext({ withCDN: true });
  const { pieceCid: resultCid } = await storage.upload(resultBytes, {
    metadata: {
      taskId: taskId.toString(),
      taskType: "content_moderation_result"
    }
  });
  
  const resultCidV1 = resultCid.toV1().toString();
  console.log(`   ✅ Result uploaded to Filecoin`);
  console.log(`   Result CID: ${resultCidV1}`);
  console.log(`   🌐 CDN URL: https://${wallet.address}.calibration.filbeam.io/${resultCidV1}\n`);

  // Submit result to contract
  console.log("5️⃣  Submitting result to contract...");
  const tx = await jobRouter.submitResult(taskId, resultCidV1);
  console.log(`   Transaction hash: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);

  // Get payment info from events
  const paymentEvent = receipt.logs
    .map(log => {
      try {
        return jobRouter.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(log => log && log.name === "PaymentReleased");

  if (paymentEvent) {
    const payment = paymentEvent.args.amount;
    console.log("=".repeat(60));
    console.log("✅ TASK COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`Task ID: ${taskId}`);
    console.log(`Result CID: ${resultCidV1}`);
    console.log(`Payment: ${ethers.formatEther(payment)} SAGA Dollar`);
    console.log(`Worker: ${wallet.address}`);
    console.log("=".repeat(60));
  }
  
  console.log("\n💰 Payment received!");
  console.log("🎯 Worker is now active and ready for more tasks\n");
}

/**
 * Mock AI content moderation
 * In production, this would call actual AI models
 */
async function mockContentModeration(data) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const text = data.data?.text || data.text || "";
  
  // Simple keyword-based mock moderation
  const unsafeKeywords = ["hate", "die", "kill", "attack"];
  const is_safe = !unsafeKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  return {
    is_safe,
    confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
    categories: {
      hate_speech: !is_safe,
      violence: !is_safe,
      appropriate: is_safe
    },
    text: text
  };
}

// CLI usage
const taskId = parseInt(process.argv[2]);

if (!taskId) {
  console.error("Usage: npm run submit-result <taskId>");
  process.exit(1);
}

submitResult(taskId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

