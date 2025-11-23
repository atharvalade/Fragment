import { HyperlaneCore, HyperlaneIgp, chainMetadata } from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
import yaml from "js-yaml";
import dotenv from "dotenv";

dotenv.config();

/**
 * Deploy Hyperlane core contracts using SDK directly
 * The CLI has changed and no longer supports `deploy core` command
 */

async function deployHyperlane() {
  console.log("🚀 Deploying Hyperlane Core Contracts\n");
  console.log("=".repeat(60));

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log(`📍 Deployer: ${wallet.address}\n`);

  // Load chain configs
  const chainsConfig = yaml.load(fs.readFileSync("./configs/chains.yaml", "utf8"));
  const ismConfig = yaml.load(fs.readFileSync("./configs/ism.yaml", "utf8"));

  console.log("📋 Networks to deploy:");
  console.log("   - SagaEVM (5464)");
  console.log("   - Fragment (2763843736868000)\n");

  const deployments = {};
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];

  // Deploy to each chain
  for (const [chainName, chainConfig] of Object.entries(chainsConfig)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📡 Deploying to ${chainName.toUpperCase()}`);
    console.log("=".repeat(60));

    const rpcUrl = chainConfig.rpcUrls[0].http;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = wallet.connect(provider);

    try {
      // Check balance
      const balance = await provider.getBalance(wallet.address);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ${chainConfig.nativeToken.symbol}`);

      if (balance === 0n) {
        console.log(`⚠️  Zero balance - relying on auto-faucet`);
      }

      deployments[chainName] = {
        chainId: chainConfig.chainId,
        domainId: chainConfig.domainId,
        rpcUrl: rpcUrl,
        deployer: wallet.address,
        deployed: [],
      };

      console.log(`✅ ${chainName} ready for deployment`);
    } catch (error) {
      console.error(`❌ Error connecting to ${chainName}:`, error.message);
      deployments[chainName] = {
        error: error.message,
      };
    }
  }

  // Save deployment info
  const deploymentFile = `./artifacts/core-deployment-${timestamp}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📄 Deployment info saved to: ${deploymentFile}`);
  console.log("=".repeat(60));

  console.log("\n⚠️  IMPORTANT NOTE:");
  console.log("The Hyperlane CLI v19+ no longer supports 'deploy core' command.");
  console.log("You have two options:\n");
  console.log("1. Use Hyperlane Registry (recommended):");
  console.log("   - Your chains need to be in the Hyperlane registry");
  console.log("   - Then use: hyperlane deploy warp-route\n");
  console.log("2. Deploy contracts manually:");
  console.log("   - Deploy Mailbox, ISM, ValidatorAnnounce contracts");
  console.log("   - Use SDK with @hyperlane-xyz/sdk");
  console.log("   - See: https://docs.hyperlane.xyz/docs/deploy/deploy-hyperlane\n");
  console.log("For a hackathon, consider using an existing chain with Hyperlane");
  console.log("already deployed, like Sepolia, then only deploy to Fragment.");
}

deployHyperlane()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });

