import { HyperlaneProxyFactoryDeployer, MultiProvider } from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * STEP 2: Deploy factory contracts and see what we get
 */

console.log("🏭 STEP 2: Deploying Proxy Factories\n");
console.log("=".repeat(60));

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
console.log(`📍 Deployer: ${wallet.address}\n`);

const chainMetadata = {
  fragment: {
    name: "fragment",
    chainId: 2763843736868000,
    domainId: 27638,
    protocol: "ethereum",
    rpcUrls: [{ http: "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io" }],
    nativeToken: { name: "MENT", symbol: "MENT", decimals: 18 }
  }
};

async function deployFactories() {
  try {
    const multiProvider = new MultiProvider(chainMetadata);
    multiProvider.setSharedSigner(wallet);
    console.log("✅ MultiProvider created\n");
    
    const factoryDeployer = new HyperlaneProxyFactoryDeployer(multiProvider);
    console.log("📦 Deploying factories...\n");
    
    const factories = await factoryDeployer.deploy({ fragment: {} });
    
    console.log("\n✅ Factories deployed!\n");
    console.log("Factory result structure:");
    console.log("   Type:", typeof factories);
    console.log("   Keys:", Object.keys(factories));
    
    if (factories.fragment) {
      console.log("\n   fragment factories:");
      console.log("      Type:", typeof factories.fragment);
      console.log("      Keys:", Object.keys(factories.fragment));
      
      console.log("\n   Deployed contracts:");
      for (const [name, contract] of Object.entries(factories.fragment)) {
        console.log(`      ${name}:`, contract.address || contract);
      }
    }
    
    // Check what factoryDeployer has after deployment
    console.log("\n   factoryDeployer.deployedContracts:");
    console.log("      Keys:", Object.keys(factoryDeployer.deployedContracts));
    if (factoryDeployer.deployedContracts.fragment) {
      console.log("      fragment:", Object.keys(factoryDeployer.deployedContracts.fragment));
    }
    
    // Save for next step
    const timestamp = new Date().toISOString().split('T')[0];
    const output = {
      timestamp,
      deployer: wallet.address,
      factories: {}
    };
    
    for (const [chain, contracts] of Object.entries(factories)) {
      output.factories[chain] = {};
      for (const [name, contract] of Object.entries(contracts)) {
        output.factories[chain][name] = contract.address || contract;
      }
    }
    
    fs.writeFileSync('./artifacts/factories-deployed.json', JSON.stringify(output, null, 2));
    console.log("\n📄 Saved to: ./artifacts/factories-deployed.json");
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Step 2 complete - Factories deployed\n");
    
    return { factoryDeployer, factories };
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    throw error;
  }
}

deployFactories()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

