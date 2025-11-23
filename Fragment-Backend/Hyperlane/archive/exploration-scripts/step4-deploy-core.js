import { 
  HyperlaneCoreDeployer,
  HyperlaneIsmFactory,
  MultiProvider 
} from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * STEP 4: Deploy Hyperlane Core contracts
 */

console.log("🚀 STEP 4: Deploying Hyperlane Core Contracts\n");
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

async function deployCore() {
  try {
    // Setup MultiProvider
    const multiProvider = new MultiProvider(chainMetadata);
    multiProvider.setSharedSigner(wallet);
    console.log("✅ MultiProvider configured\n");
    
    // Load factories
    const factoriesData = JSON.parse(fs.readFileSync('./artifacts/factories-deployed.json', 'utf8'));
    console.log("✅ Loaded factory addresses\n");
    
    // Create IsmFactory instance
    const ismFactory = HyperlaneIsmFactory.fromAddressesMap(factoriesData.factories, multiProvider);
    console.log("✅ IsmFactory created\n");
    
    // Create CoreDeployer with factories and ismFactory
    const coreDeployer = new HyperlaneCoreDeployer(multiProvider, factoriesData.factories, ismFactory);
    console.log("✅ CoreDeployer created");
    console.log(`   ismFactory defined: ${coreDeployer.ismFactory !== undefined}`);
    console.log(`   ismFactory has getContracts: ${typeof coreDeployer.ismFactory.getContracts}\n`);
    
    // Prepare core config
    const coreConfig = {
      fragment: {
        owner: wallet.address,
        defaultIsm: {
          type: 'multisigIsm',
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
      }
    };
    
    console.log("📝 Core Configuration:");
    console.log(JSON.stringify(coreConfig, (k, v) => 
      v && v.type === 'BigNumber' ? v.toString() : v
    , 2));
    console.log();
    
    // Deploy!
    console.log("🚀 Starting deployment...\n");
    const coreContracts = await coreDeployer.deploy(coreConfig);
    
    console.log("\n✅ Core contracts deployed!\n");
    
    // Process and save results
    const deploymentData = {
      timestamp: new Date().toISOString(),
      deployer: wallet.address,
      chains: {}
    };
    
    for (const [chainName, contracts] of Object.entries(coreContracts)) {
      console.log(`${chainName.toUpperCase()}:`);
      deploymentData.chains[chainName] = {};
      
      for (const [name, contract] of Object.entries(contracts)) {
        const address = contract.address || contract;
        console.log(`   ${name}: ${address}`);
        deploymentData.chains[chainName][name] = address;
      }
      console.log();
    }
    
    // Save deployment
    const timestamp = new Date().toISOString().split('T')[0];
    const deploymentFile = `./artifacts/core-deployment-${timestamp}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    
    console.log("=".repeat(60));
    console.log(`📄 Saved to: ${deploymentFile}`);
    console.log("=".repeat(60));
    console.log("\n✅ Step 4 complete - Core deployed!\n");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    console.error(error);
    throw error;
  }
}

deployCore()
  .then(() => {
    console.log("🎉 Success! Hyperlane core is deployed on Fragment chainlet");
    process.exit(0);
  })
  .catch(() => process.exit(1));

