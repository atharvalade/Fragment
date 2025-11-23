import { HyperlaneCoreDeployer, HyperlaneProxyFactoryDeployer, MultiProvider } from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/**
 * STEP 1: Explore the actual API of the deployer classes
 */

console.log("🔍 STEP 1: Exploring Deployer Classes\n");
console.log("=".repeat(60));

// 1. Check HyperlaneProxyFactoryDeployer
console.log("\n1️⃣  HyperlaneProxyFactoryDeployer:");
console.log("   Type:", typeof HyperlaneProxyFactoryDeployer);
console.log("   Methods:");
const factoryMethods = Object.getOwnPropertyNames(HyperlaneProxyFactoryDeployer.prototype);
factoryMethods.forEach(m => console.log(`      - ${m}`));

// 2. Check HyperlaneCoreDeployer
console.log("\n2️⃣  HyperlaneCoreDeployer:");
console.log("   Type:", typeof HyperlaneCoreDeployer);
console.log("   Methods:");
const coreMethods = Object.getOwnPropertyNames(HyperlaneCoreDeployer.prototype);
coreMethods.forEach(m => console.log(`      - ${m}`));

// 3. Check constructor parameters
console.log("\n3️⃣  Constructor Info:");
console.log("   HyperlaneProxyFactoryDeployer.length:", HyperlaneProxyFactoryDeployer.length);
console.log("   HyperlaneCoreDeployer.length:", HyperlaneCoreDeployer.length);

// 4. Try creating instances to see what's needed
console.log("\n4️⃣  Testing Instantiation:");

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

try {
  const multiProvider = new MultiProvider(chainMetadata);
  multiProvider.setSharedSigner(wallet);
  console.log("   ✅ MultiProvider created");
  
  // Try creating factory deployer
  const factoryDeployer = new HyperlaneProxyFactoryDeployer(multiProvider);
  console.log("   ✅ HyperlaneProxyFactoryDeployer created");
  console.log("   Factory Deployer properties:");
  Object.keys(factoryDeployer).forEach(key => {
    console.log(`      - ${key}: ${typeof factoryDeployer[key]}`);
  });
  
  // Try creating core deployer with different params
  console.log("\n   Testing HyperlaneCoreDeployer constructors:");
  
  try {
    const coreDeployer1 = new HyperlaneCoreDeployer(multiProvider);
    console.log("   ✅ HyperlaneCoreDeployer(multiProvider) works");
    console.log("   Core Deployer properties:");
    Object.keys(coreDeployer1).forEach(key => {
      console.log(`      - ${key}: ${typeof coreDeployer1[key]}`);
    });
  } catch (e) {
    console.log("   ❌ HyperlaneCoreDeployer(multiProvider):", e.message);
  }
  
  try {
    const coreDeployer2 = new HyperlaneCoreDeployer(multiProvider, factoryDeployer);
    console.log("   ✅ HyperlaneCoreDeployer(multiProvider, factoryDeployer) works");
  } catch (e) {
    console.log("   ❌ HyperlaneCoreDeployer(multiProvider, factoryDeployer):", e.message);
  }
  
  try {
    const coreDeployer3 = new HyperlaneCoreDeployer(multiProvider, {});
    console.log("   ✅ HyperlaneCoreDeployer(multiProvider, {}) works");
  } catch (e) {
    console.log("   ❌ HyperlaneCoreDeployer(multiProvider, {}):", e.message);
  }
  
} catch (error) {
  console.log("   ❌ Error:", error.message);
}

console.log("\n" + "=".repeat(60));
console.log("✅ Exploration complete\n");

