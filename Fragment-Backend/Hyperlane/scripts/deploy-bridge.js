import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🌉 Deploying SAGA Dollar Bridge to Fragment\n");
  console.log("=".repeat(60));

  // Connect to Fragment
  const provider = new ethers.providers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`📍 Deployer: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} MENT\n`);

  // Load compiled contract
  const contractJson = JSON.parse(
    fs.readFileSync("./artifacts/contracts/SagaDollarBridge.sol/SagaDollarBridge.json", "utf8")
  );

  // Deploy SagaDollarBridge
  console.log("🚀 Deploying SagaDollarBridge...");
  const SagaDollarBridge = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    deployer
  );
  const bridge = await SagaDollarBridge.deploy();
  await bridge.deployed();

  console.log(`✅ SagaDollarBridge deployed: ${bridge.address}\n`);

  // Get token details
  const name = await bridge.name();
  const symbol = await bridge.symbol();
  const operator = await bridge.bridgeOperator();

  console.log("📋 Contract Details:");
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Bridge Operator: ${operator}`);
  console.log(`   Owner: ${deployer.address}\n`);

  // Save deployment
  const deployment = {
    timestamp: new Date().toISOString(),
    network: "fragment",
    chainId: 2763843736868000,
    deployer: deployer.address,
    contracts: {
      sagaDollarBridge: bridge.address
    },
    details: {
      name,
      symbol,
      bridgeOperator: operator
    }
  };

  fs.writeFileSync(
    "./artifacts/bridge-deployment.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("=".repeat(60));
  console.log("📄 Saved to: ./artifacts/bridge-deployment.json");
  console.log("=".repeat(60));

  console.log("\n✅ Bridge deployed successfully!\n");
  console.log("📝 Next steps:");
  console.log("1. Bridge SAGA Dollar from SagaEVM using: npm run bridge:deposit");
  console.log("2. Check balance: npm run balance");
  console.log("3. Withdraw back to SagaEVM: npm run bridge:withdraw\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

