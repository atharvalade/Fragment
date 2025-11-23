import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const BRIDGE_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function bridgeOperator() view returns (address)",
  "function owner() view returns (address)",
  "function withdrawalRequestCount() view returns (uint256)",
  "function getWithdrawalRequest(uint256) view returns (address user, uint256 amount, uint256 timestamp, bool fulfilled, bytes32 sagaEvmTxHash)"
];

async function checkStatus() {
  console.log("📊 SAGA Dollar Bridge Status\n");
  console.log("=".repeat(60));

  const bridgeData = JSON.parse(fs.readFileSync("./artifacts/bridge-deployment.json", "utf8"));
  const bridgeAddress = bridgeData.contracts.sagaDollarBridge;

  const provider = new ethers.providers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const bridge = new ethers.Contract(bridgeAddress, BRIDGE_ABI, provider);

  console.log("🌉 Bridge Contract");
  console.log(`   Address: ${bridgeAddress}`);
  console.log(`   Name: ${await bridge.name()}`);
  console.log(`   Symbol: ${await bridge.symbol()}`);
  console.log(`   Owner: ${await bridge.owner()}`);
  console.log(`   Bridge Operator: ${await bridge.bridgeOperator()}\n`);

  const totalSupply = await bridge.totalSupply();
  console.log("💰 Token Statistics");
  console.log(`   Total wSAGA on Fragment: ${ethers.utils.formatEther(totalSupply)}`);
  console.log(`   (Backed 1:1 by SAGA Dollar on SagaEVM)\n`);

  const balance = await bridge.balanceOf(wallet.address);
  console.log("👤 Your Balance");
  console.log(`   Address: ${wallet.address}`);
  console.log(`   wSAGA: ${ethers.utils.formatEther(balance)}\n`);

  const withdrawalCount = await bridge.withdrawalRequestCount();
  console.log("🔄 Withdrawal Requests");
  console.log(`   Total: ${withdrawalCount.toString()}`);
  
  if (withdrawalCount.gt(0)) {
    for (let i = 0; i < withdrawalCount.toNumber(); i++) {
      const request = await bridge.getWithdrawalRequest(i);
      console.log(`\n   Request #${i}:`);
      console.log(`      User: ${request.user}`);
      console.log(`      Amount: ${ethers.utils.formatEther(request.amount)}`);
      console.log(`      Status: ${request.fulfilled ? '✅ Fulfilled' : '⏳ Pending'}`);
      if (request.fulfilled) {
        console.log(`      SagaEVM TX: ${request.sagaEvmTxHash}`);
      }
    }
  }

  // Load bridge records
  if (fs.existsSync("./artifacts/bridge-records.json")) {
    const records = JSON.parse(fs.readFileSync("./artifacts/bridge-records.json", "utf8"));
    console.log(`\n📜 Bridge History (${records.length} transactions)`);
    records.slice(-5).forEach((record, i) => {
      console.log(`\n   ${records.length - 5 + i + 1}. ${record.direction}`);
      console.log(`      Amount: ${record.amount}`);
      console.log(`      Time: ${new Date(record.timestamp).toLocaleString()}`);
      console.log(`      Fragment TX: ${record.fragmentTxHash}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Status check complete\n");
}

checkStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

