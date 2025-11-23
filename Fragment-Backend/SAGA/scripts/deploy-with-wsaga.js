import hre from "hardhat";
import fs from "fs";

const { ethers } = hre;

async function main() {
  console.log("🚀 Deploying FragmentJobRouter with wSAGA...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} MENT\n`);

  // Use existing wSAGA token (bridged SAGA Dollar)
  const wSAGA_ADDRESS = "0xE71d2ea77309Ee3CaC224B8A5537fEcD7f217C9E";
  console.log(`💰 Using wSAGA token at: ${wSAGA_ADDRESS}\n`);

  // Deploy FragmentJobRouter with wSAGA
  console.log("1️⃣  Deploying FragmentJobRouter with wSAGA...");
  const FragmentJobRouter = await ethers.getContractFactory("FragmentJobRouter");
  const jobRouter = await FragmentJobRouter.deploy(wSAGA_ADDRESS);
  await jobRouter.waitForDeployment();
  const jobRouterAddress = await jobRouter.getAddress();
  console.log(`   ✅ FragmentJobRouter deployed to: ${jobRouterAddress}\n`);

  // Save deployment info
  const deployment = {
    network: "fragment-saga-chainlet",
    chainId: 2763843736868000,
    deployer: deployer.address,
    contracts: {
      wSAGA: wSAGA_ADDRESS,
      FragmentJobRouter: jobRouterAddress,
      MockSAGADollar: "0x728d0f06Bf6D63B4bC9ca7C879D042DDAC66e8A3" // Keep old reference
    },
    deployedAt: new Date().toISOString(),
    note: "Using wSAGA (bridged SAGA Dollar) for payments"
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
  console.log(`  wSAGA (Bridged):    ${wSAGA_ADDRESS}`);
  console.log(`  FragmentJobRouter:  ${jobRouterAddress}`);
  console.log(`\nDeployer: ${deployer.address}`);
  console.log("=".repeat(60));

  console.log("\n💾 Deployment info saved to deployment.json");
  console.log("\n📝 Next steps:");
  console.log("1. Update .env with new JOB_ROUTER_ADDRESS");
  console.log("2. Update SAGA_DOLLAR_ADDRESS to wSAGA address");
  console.log("3. Approve FragmentJobRouter to spend wSAGA");
  console.log("4. Register workers");
  console.log("5. Submit jobs\n");
  
  console.log("🔧 Environment variables to update:");
  console.log(`SAGA_DOLLAR_ADDRESS=${wSAGA_ADDRESS}`);
  console.log(`JOB_ROUTER_ADDRESS=${jobRouterAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

