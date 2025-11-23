import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Verify Hyperlane deployment and readiness
 */

async function verifySetup() {
  console.log("🔍 Verifying Hyperlane Bridge Setup\n");
  console.log("=".repeat(60));

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const address = wallet.address;

  console.log(`📍 Wallet: ${address}\n`);

  const checks = [];

  // 1. Check core deployment
  console.log("1️⃣  Checking Hyperlane Core Deployment...");
  const coreFiles = fs.readdirSync("./artifacts").filter(f => f.startsWith("core-deployment-"));
  
  if (coreFiles.length === 0) {
    console.log("   ❌ No core deployment found");
    console.log("   Run: npm run deploy:core");
    checks.push(false);
  } else {
    const latestCore = coreFiles.sort().reverse()[0];
    console.log(`   ✅ Found: ${latestCore}`);
    
    const coreData = JSON.parse(fs.readFileSync(`./artifacts/${latestCore}`, "utf8"));
    
    if (coreData.sagaevm?.mailbox && coreData.fragment?.mailbox) {
      console.log(`   ✅ Mailbox deployed on SagaEVM: ${coreData.sagaevm.mailbox}`);
      console.log(`   ✅ Mailbox deployed on Fragment: ${coreData.fragment.mailbox}`);
      checks.push(true);
    } else {
      console.log("   ❌ Mailbox contracts not found in deployment");
      checks.push(false);
    }
  }

  console.log();

  // 2. Check warp route deployment
  console.log("2️⃣  Checking Warp Route Deployment...");
  const warpFiles = fs.readdirSync("./artifacts").filter(f => f.startsWith("warp-route-deployment-"));
  
  if (warpFiles.length === 0) {
    console.log("   ❌ No warp route deployment found");
    console.log("   Run: npm run deploy:warp");
    checks.push(false);
  } else {
    const latestWarp = warpFiles.sort().reverse()[0];
    console.log(`   ✅ Found: ${latestWarp}`);
    
    const warpData = JSON.parse(fs.readFileSync(`./artifacts/${latestWarp}`, "utf8"));
    
    if (warpData.sagaevm?.HypERC20Collateral && warpData.fragment?.HypERC20) {
      console.log(`   ✅ HypERC20Collateral on SagaEVM: ${warpData.sagaevm.HypERC20Collateral}`);
      console.log(`   ✅ HypERC20 on Fragment: ${warpData.fragment.HypERC20}`);
      checks.push(true);
    } else {
      console.log("   ❌ Warp route contracts not found in deployment");
      checks.push(false);
    }
  }

  console.log();

  // 3. Check agent config
  console.log("3️⃣  Checking Validator/Relayer Config...");
  const agentFiles = fs.readdirSync("./artifacts").filter(f => f.startsWith("agent-config-"));
  
  if (agentFiles.length === 0) {
    console.log("   ❌ No agent config found");
    console.log("   This is generated with core deployment");
    checks.push(false);
  } else {
    const latestAgent = agentFiles.sort().reverse()[0];
    console.log(`   ✅ Found: ${latestAgent}`);
    console.log("   ⚠️  Make sure to deploy validator/relayer with Kurtosis");
    console.log("   Run: npm run deploy:kurtosis");
    checks.push(true);
  }

  console.log();

  // 4. Check balances
  console.log("4️⃣  Checking Token Balances...");
  
  const sagaProvider = new ethers.JsonRpcProvider("https://5464.rpc.thirdweb.com");
  const fragmentProvider = new ethers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );

  try {
    const gasBalance = await sagaProvider.getBalance(address);
    const mentBalance = await fragmentProvider.getBalance(address);

    console.log(`   SagaEVM GAS: ${ethers.formatEther(gasBalance)}`);
    console.log(`   Fragment MENT: ${ethers.formatEther(mentBalance)}`);

    if (gasBalance > ethers.parseEther("0.1") && mentBalance > ethers.parseEther("0.1")) {
      console.log("   ✅ Sufficient balances for transactions");
      checks.push(true);
    } else {
      console.log("   ⚠️  Low balance - may need more tokens");
      checks.push(true); // Warning, not error
    }

    // Check SAGA Dollar
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    const sagaDollar = new ethers.Contract(
      "0xB76144F87DF95816e8c55C240F874C554B4553C3",
      ERC20_ABI,
      sagaProvider
    );
    
    const dBalance = await sagaDollar.balanceOf(address);
    console.log(`   SAGA Dollar: ${ethers.formatEther(dBalance)}`);
    
    if (dBalance > 0) {
      console.log("   ✅ SAGA Dollar available for bridging");
    } else {
      console.log("   ⚠️  No SAGA Dollar - get some from SagaEVM first");
    }
  } catch (error) {
    console.log(`   ❌ Error checking balances: ${error.message}`);
    checks.push(false);
  }

  console.log("\n" + "=".repeat(60));
  
  const allPassed = checks.every(c => c);
  
  if (allPassed) {
    console.log("✅ ALL CHECKS PASSED - Ready to bridge!");
    console.log("\n📝 Next steps:");
    console.log("1. Ensure validator/relayer are running (Kurtosis)");
    console.log("2. Wait 15 minutes for relayer to sync");
    console.log("3. Test with: npm run send:message");
    console.log("4. Bridge tokens with: npm run bridge <amount> <warpAddress>");
  } else {
    console.log("❌ SETUP INCOMPLETE - See errors above");
    console.log("\n📝 Complete these steps:");
    if (!checks[0]) console.log("- Deploy Hyperlane core contracts");
    if (!checks[1]) console.log("- Deploy Warp Route");
    if (!checks[2]) console.log("- Setup validator/relayer with Kurtosis");
  }
  
  console.log("=".repeat(60) + "\n");
}

verifySetup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error.message);
    process.exit(1);
  });

