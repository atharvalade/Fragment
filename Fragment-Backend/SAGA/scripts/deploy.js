import hre from "hardhat";
import fs from "fs";

const { ethers } = hre;

async function main() {
  console.log("🚀 Deploying Fragment contracts to SAGA Chainlet...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} MENT\n`);

  // Deploy MockSAGADollar (for testing - use real SAGA Dollar in production)
  console.log("1️⃣  Deploying MockSAGADollar...");
  const MockSAGADollar = await ethers.getContractFactory("MockSAGADollar");
  const sagaDollar = await MockSAGADollar.deploy();
  await sagaDollar.waitForDeployment();
  const sagaDollarAddress = await sagaDollar.getAddress();
  console.log(`   ✅ MockSAGADollar deployed to: ${sagaDollarAddress}\n`);

  // Deploy FragmentJobRouter
  console.log("2️⃣  Deploying FragmentJobRouter...");
  const FragmentJobRouter = await ethers.getContractFactory("FragmentJobRouter");
  const jobRouter = await FragmentJobRouter.deploy(sagaDollarAddress);
  await jobRouter.waitForDeployment();
  const jobRouterAddress = await jobRouter.getAddress();
  console.log(`   ✅ FragmentJobRouter deployed to: ${jobRouterAddress}\n`);

  // Save deployment info
  const deployment = {
    network: "fragment-saga-chainlet",
    chainId: 2763843736868000,
    deployer: deployer.address,
    contracts: {
      MockSAGADollar: sagaDollarAddress,
      FragmentJobRouter: jobRouterAddress
    },
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("=".repeat(60));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: SAGA Fragment Chainlet`);
  console.log(`Chain ID: 2763843736868000`);
  console.log(`\nContracts:`);
  console.log(`  MockSAGADollar:     ${sagaDollarAddress}`);
  console.log(`  FragmentJobRouter:  ${jobRouterAddress}`);
  console.log(`\nDeployer: ${deployer.address}`);
  console.log("=".repeat(60));

  console.log("\n💾 Deployment info saved to deployment.json");
  console.log("\n📝 Next steps:");
  console.log("1. Update .env with contract addresses");
  console.log("2. Approve FragmentJobRouter to spend SAGA Dollar");
  console.log("3. Register workers");
  console.log("4. Submit jobs\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

