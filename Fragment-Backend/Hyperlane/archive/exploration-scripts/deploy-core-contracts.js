import { 
  HyperlaneCoreDeployer,
  HyperlaneProxyFactoryDeployer,
  EvmCoreModule,
  MultiProvider,
  serializeContracts
} from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
import yaml from "js-yaml";
import dotenv from "dotenv";

dotenv.config();

// Ethers v5 compatibility
const { providers, utils, Wallet } = ethers;

/**
 * Deploy Hyperlane Core contracts using the SDK directly
 */

async function deployCore() {
  console.log("🚀 Deploying Hyperlane Core Contracts with SDK\n");
  console.log("=".repeat(60));

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  // Load configurations
  const chainsConfig = yaml.load(fs.readFileSync("./configs/chains.yaml", "utf8"));
  const ismConfig = yaml.load(fs.readFileSync("./configs/ism.yaml", "utf8"));

  const wallet = new Wallet(process.env.PRIVATE_KEY);
  console.log(`📍 Deployer: ${wallet.address}\n`);

  // Prepare chain metadata for MultiProvider
  const chainMetadata = {};
  
  for (const [chainName, config] of Object.entries(chainsConfig)) {
    // Skip SagaEVM - has deploy restrictions
    if (chainName === 'sagaevm') {
      console.log(`📋 Skipping ${chainName} (deploy restrictions)...`);
      continue;
    }
    
    console.log(`📋 Preparing ${chainName}...`);
    
    chainMetadata[chainName] = {
      name: chainName,
      chainId: config.chainId,
      domainId: config.domainId,
      protocol: 'ethereum',
      rpcUrls: [{
        http: config.rpcUrls[0].http
      }],
      nativeToken: config.nativeToken,
      ...(config.blockExplorers && { blockExplorers: config.blockExplorers })
    };

    // Test connection
    try {
      const provider = new providers.JsonRpcProvider(config.rpcUrls[0].http);
      const balance = await provider.getBalance(wallet.address);
      console.log(`   Balance: ${utils.formatEther(balance)} ${config.nativeToken.symbol}`);
    } catch (error) {
      console.log(`   ❌ Connection error: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🔧 Setting up MultiProvider...\n");

  try {
    // Create MultiProvider properly
    const multiProvider = new MultiProvider(chainMetadata);
    
    // Set shared signer
    multiProvider.setSharedSigner(wallet);
    
    console.log("   Testing MultiProvider signers...");
    for (const chainName of Object.keys(chainMetadata)) {
      try {
        const signer = multiProvider.getSigner(chainName);
        const address = await signer.getAddress();
        console.log(`   ${chainName}: ${address}`);
      } catch (error) {
        console.log(`   ❌ ${chainName}: ${error.message}`);
      }
    }

    console.log("✅ MultiProvider configured\n");

    // Prepare Core config
    const coreConfig = {};
    for (const [chainName, config] of Object.entries(ismConfig)) {
      if (chainName === 'sagaevm') continue; // Skip SagaEVM
      coreConfig[chainName] = {
        owner: wallet.address,
        defaultIsm: {
          type: 'multisigIsm',
          threshold: config.threshold,
          validators: config.validators
        },
        defaultHook: {
          type: 'merkleTreeHook'
        },
        requiredHook: {
          type: 'protocolFee',
          beneficiary: wallet.address,
          owner: wallet.address,
          maxProtocolFee: utils.parseEther('1'),
          protocolFee: utils.parseEther('0')
        }
      };
    }

    console.log("📝 Core Configuration:");
    console.log(JSON.stringify(coreConfig, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    console.log("\n" + "=".repeat(60));

    // Deploy factories first
    console.log("\n1️⃣  Deploying Proxy Factories...\n");
    
    const factoryDeployer = new HyperlaneProxyFactoryDeployer(multiProvider);
    
    const factories = {};
    for (const chainName of Object.keys(chainMetadata)) {
      console.log(`   Deploying factories to ${chainName}...`);
      try {
        const chainFactories = await factoryDeployer.deploy({
          [chainName]: {}
        });
        factories[chainName] = chainFactories[chainName];
        console.log(`   ✅ Factories deployed on ${chainName}`);
      } catch (error) {
        console.log(`   ❌ Factory deployment failed on ${chainName}:`, error.message);
        throw error;
      }
    }

    console.log("\n2️⃣  Deploying Core Contracts...\n");
    
    // Deploy core contracts
    // Note: Pass factories directly, the deployer will access them correctly
    const coreDeployer = new HyperlaneCoreDeployer(multiProvider);
    coreDeployer.ismFactoryDeployer = factoryDeployer;
    
    console.log("   Starting deployment...");
    const coreContracts = await coreDeployer.deploy(coreConfig);
    
    console.log("\n✅ Core contracts deployed!\n");

    // Save deployment artifacts
    const timestamp = new Date().toISOString().split('T')[0];
    const deploymentFile = `./artifacts/core-deployment-${timestamp}.json`;
    
    const deploymentData = {};
    for (const [chainName, contracts] of Object.entries(coreContracts)) {
      deploymentData[chainName] = serializeContracts(contracts);
    }

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    
    console.log("=".repeat(60));
    console.log(`📄 Deployment saved to: ${deploymentFile}`);
    console.log("=".repeat(60));

    console.log("\n📋 Deployed Contracts:");
    for (const [chainName, contracts] of Object.entries(deploymentData)) {
      console.log(`\n${chainName.toUpperCase()}:`);
      for (const [name, address] of Object.entries(contracts)) {
        console.log(`   ${name}: ${address}`);
      }
    }

    console.log("\n✅ Hyperlane Core deployment complete!\n");
    
    return deploymentData;
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    throw error;
  }
}

deployCore()
  .then(() => {
    console.log("\n🎉 Success! Next step: Deploy Warp Route");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  });

