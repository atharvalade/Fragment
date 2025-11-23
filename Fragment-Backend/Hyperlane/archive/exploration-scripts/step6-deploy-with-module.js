import { EvmCoreModule, MultiProvider } from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * STEP 6: Deploy using EvmCoreModule.deploy() instead
 */

console.log("🚀 STEP 6: Deploying with EvmCoreModule\n");
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

async function deployWithModule() {
  try {
    const multiProvider = new MultiProvider(chainMetadata);
    multiProvider.setSharedSigner(wallet);
    console.log("✅ MultiProvider configured\n");
    
    // Core config
    const config = {
      owner: wallet.address,
      defaultIsm: {
        type: 'merkleRootMultisigIsm',
        threshold: 1,
        validators: [wallet.address]
      },
      defaultHook: {
        type: 'merkleTreeHook'
      },
      requiredHook: {
        type: 'protocolFee',
        beneficiary: wallet.address,
        owner: wallet.address,
        maxProtocolFee: ethers.utils.parseEther('1'),
        protocolFee: ethers.utils.parseEther('0')
      }
    };
    
    console.log("📝 Config prepared\n");
    console.log("🚀 Deploying core module...\n");
    
    // Use EvmCoreModule.deploy()
    const coreModule = await EvmCoreModule.deploy({
      config,
      chain: 'fragment',
      multiProvider
    });
    
    console.log("\n✅ Core module deployed!\n");
    console.log("Module type:", typeof coreModule);
    console.log("Module keys:", Object.keys(coreModule));
    
    // Extract deployed contract addresses
    const addresses = {};
    for (const [name, contract] of Object.entries(coreModule)) {
      if (contract && typeof contract === 'object' && contract.address) {
        addresses[name] = contract.address;
      } else if (typeof contract === 'string' && contract.startsWith('0x')) {
        addresses[name] = contract;
      }
    }
    
    console.log("\n📋 Deployed contracts:");
    for (const [name, address] of Object.entries(addresses)) {
      console.log(`   ${name}: ${address}`);
    }
    
    // Save
    const timestamp = new Date().toISOString().split('T')[0];
    const deploymentFile = `./artifacts/core-deployment-${timestamp}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      deployer: wallet.address,
      chain: 'fragment',
      addresses
    }, null, 2));
    
    console.log("\n" + "=".repeat(60));
    console.log(`📄 Saved to: ${deploymentFile}`);
    console.log("=".repeat(60));
    console.log("\n✅ Deployment complete!\n");
    
  } catch (error) {
    console.error("\n❌ Error:");
    console.error(error.message);
    console.error(error);
    throw error;
  }
}

deployWithModule()
  .then(() => {
    console.log("🎉 Success!");
    process.exit(0);
  })
  .catch(() => process.exit(1));

