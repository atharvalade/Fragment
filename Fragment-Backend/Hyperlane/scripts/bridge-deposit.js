import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Simulate bridging SAGA Dollar from SagaEVM to Fragment
 * 
 * For hackathon: You (as bridge operator) register deposits
 * For production: Hyperlane Warp Route would handle this automatically
 */

const SAGA_DOLLAR_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

const BRIDGE_ABI = [
  "function registerDeposit(address user, uint256 amount, bytes32 sagaEvmTxHash) external",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)"
];

async function bridgeDeposit() {
  console.log("🌉 Bridging SAGA Dollar from SagaEVM to Fragment\n");
  console.log("=".repeat(60));

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  const amount = process.argv[2];
  if (!amount) {
    console.error("Usage: npm run bridge:deposit <amount>");
    console.error("Example: npm run bridge:deposit 10");
    process.exit(1);
  }

  // Load bridge deployment
  const bridgeData = JSON.parse(fs.readFileSync("./artifacts/bridge-deployment.json", "utf8"));
  const bridgeAddress = bridgeData.contracts.sagaDollarBridge;

  console.log(`📍 Bridge Contract: ${bridgeAddress}`);
  console.log(`💵 Amount to Bridge: ${amount} SAGA Dollar\n`);

  // Connect to SagaEVM
  console.log("1️⃣  Checking SAGA Dollar on SagaEVM...");
  const sagaProvider = new ethers.providers.JsonRpcProvider("https://5464.rpc.thirdweb.com");
  const sagaWallet = new ethers.Wallet(process.env.PRIVATE_KEY, sagaProvider);
  
  const sagaDollarAddress = "0xB76144F87DF95816e8c55C240F874C554B4553C3";
  const sagaDollar = new ethers.Contract(sagaDollarAddress, SAGA_DOLLAR_ABI, sagaWallet);

  const balance = await sagaDollar.balanceOf(sagaWallet.address);
  const decimals = await sagaDollar.decimals();
  const symbol = await sagaDollar.symbol();

  console.log(`   Balance: ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);

  const amountWei = ethers.utils.parseUnits(amount, decimals);
  
  if (balance.lt(amountWei)) {
    throw new Error(`Insufficient balance. You have ${ethers.utils.formatUnits(balance, decimals)} ${symbol}`);
  }

  console.log("   ✅ Sufficient balance\n");

  // For hackathon: Simulate the lock on SagaEVM
  console.log("2️⃣  Simulating lock on SagaEVM...");
  console.log("   (In production, SAGA Dollar would be locked in Hyperlane contract)");
  
  // Generate a fake transaction hash for demo
  const fakeDepositTx = ethers.utils.id(`deposit-${sagaWallet.address}-${amount}-${Date.now()}`);
  console.log(`   Mock SagaEVM TX: ${fakeDepositTx}\n`);

  // Connect to Fragment
  console.log("3️⃣  Registering deposit on Fragment...");
  const fragmentProvider = new ethers.providers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const fragmentWallet = new ethers.Wallet(process.env.PRIVATE_KEY, fragmentProvider);

  const bridge = new ethers.Contract(bridgeAddress, BRIDGE_ABI, fragmentWallet);

  // Register the deposit (as bridge operator)
  const tx = await bridge.registerDeposit(
    fragmentWallet.address,
    amountWei,
    fakeDepositTx
  );

  console.log(`   📝 Transaction: ${tx.hash}`);
  await tx.wait();
  console.log("   ✅ Deposit registered\n");

  // Check wSAGA balance
  console.log("4️⃣  Checking wSAGA balance on Fragment...");
  const wSagaBalance = await bridge.balanceOf(fragmentWallet.address);
  const wSagaSymbol = await bridge.symbol();
  
  console.log(`   Balance: ${ethers.utils.formatUnits(wSagaBalance, decimals)} ${wSagaSymbol}\n`);

  console.log("=".repeat(60));
  console.log("✅ BRIDGE COMPLETE!");
  console.log("=".repeat(60));
  console.log(`💰 You now have ${amount} wSAGA on Fragment chainlet`);
  console.log(`📍 wSAGA Contract: ${bridgeAddress}`);
  console.log(`🔗 Use it in FragmentJobRouter for worker payments!\n`);

  // Save bridge record
  const record = {
    timestamp: new Date().toISOString(),
    direction: "SagaEVM → Fragment",
    amount: amount,
    user: fragmentWallet.address,
    sagaEvmTxHash: fakeDepositTx,
    fragmentTxHash: tx.hash,
    wSagaBalance: ethers.utils.formatUnits(wSagaBalance, decimals)
  };

  const records = [];
  if (fs.existsSync("./artifacts/bridge-records.json")) {
    const existing = JSON.parse(fs.readFileSync("./artifacts/bridge-records.json", "utf8"));
    records.push(...existing);
  }
  records.push(record);

  fs.writeFileSync("./artifacts/bridge-records.json", JSON.stringify(records, null, 2));
  console.log("📄 Bridge record saved to: ./artifacts/bridge-records.json\n");
}

bridgeDeposit()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Bridge failed:", error.message);
    process.exit(1);
  });

