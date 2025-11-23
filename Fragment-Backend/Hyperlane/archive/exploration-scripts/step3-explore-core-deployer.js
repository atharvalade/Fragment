import { 
  HyperlaneCoreDeployer,
  HyperlaneProxyFactoryDeployer,
  HyperlaneIsmFactory,
  MultiProvider 
} from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * STEP 3: Figure out correct CoreDeployer parameters
 */

console.log("🔍 STEP 3: Exploring CoreDeployer Parameters\n");
console.log("=".repeat(60));

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
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

async function exploreCore() {
  const multiProvider = new MultiProvider(chainMetadata);
  multiProvider.setSharedSigner(wallet);
  
  // Load deployed factories
  const factoriesData = JSON.parse(fs.readFileSync('./artifacts/factories-deployed.json', 'utf8'));
  console.log("✅ Loaded factories from previous deployment\n");
  
  const factoryDeployer = new HyperlaneProxyFactoryDeployer(multiProvider);
  console.log("✅ Created factoryDeployer\n");
  
  // Check if HyperlaneIsmFactory exists
  console.log("1️⃣  Checking HyperlaneIsmFactory:");
  console.log("   Exists:", typeof HyperlaneIsmFactory);
  if (HyperlaneIsmFactory) {
    console.log("   Methods:", Object.getOwnPropertyNames(HyperlaneIsmFactory.prototype).slice(0, 10));
    console.log("   Constructor length:", HyperlaneIsmFactory.length);
  }
  
  console.log("\n2️⃣  Testing CoreDeployer parameter combinations:");
  
  // Test 1: (multiProvider)
  try {
    const deployer1 = new HyperlaneCoreDeployer(multiProvider);
    console.log("   ✅ new HyperlaneCoreDeployer(multiProvider)");
    console.log("      - ismFactory:", deployer1.ismFactory);
    console.log("      - hookDeployer:", typeof deployer1.hookDeployer);
  } catch (e) {
    console.log("   ❌", e.message);
  }
  
  // Test 2: (multiProvider, factoryAddresses)
  try {
    const deployer2 = new HyperlaneCoreDeployer(multiProvider, factoriesData.factories);
    console.log("   ✅ new HyperlaneCoreDeployer(multiProvider, factoriesData.factories)");
    console.log("      - ismFactory:", deployer2.ismFactory);
  } catch (e) {
    console.log("   ❌", e.message);
  }
  
  // Test 3: Try creating an IsmFactory
  if (HyperlaneIsmFactory) {
    try {
      const ismFactory = HyperlaneIsmFactory.fromAddressesMap(
        factoriesData.factories, 
        multiProvider
      );
      console.log("   ✅ HyperlaneIsmFactory.fromAddressesMap() works");
      console.log("      Type:", typeof ismFactory);
      console.log("      Methods:", Object.keys(ismFactory).slice(0, 10));
      
      // Test 4: (multiProvider, factories, ismFactory)
      const deployer3 = new HyperlaneCoreDeployer(multiProvider, factoriesData.factories, ismFactory);
      console.log("   ✅ new HyperlaneCoreDeployer(multiProvider, factories, ismFactory)");
      console.log("      - ismFactory:", typeof deployer3.ismFactory);
      console.log("      - ismFactory defined:", deployer3.ismFactory !== undefined);
      
    } catch (e) {
      console.log("   ❌ IsmFactory creation:", e.message);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ Step 3 complete - Understood CoreDeployer params\n");
}

exploreCore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });

