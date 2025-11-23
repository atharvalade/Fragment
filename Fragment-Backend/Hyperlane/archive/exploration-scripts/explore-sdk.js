import * as HyperlaneSDK from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";

/**
 * Explore what's available in the Hyperlane SDK
 */

console.log("🔍 Exploring Hyperlane SDK\n");
console.log("=".repeat(60));

console.log("\n📦 Available exports from @hyperlane-xyz/sdk:");
console.log(Object.keys(HyperlaneSDK).sort().join("\n"));

console.log("\n" + "=".repeat(60));
console.log("\n🔧 Checking for deployment-related classes:");

const deploymentRelated = Object.keys(HyperlaneSDK).filter(key => 
  key.toLowerCase().includes('deploy') || 
  key.toLowerCase().includes('core') ||
  key.toLowerCase().includes('factory') ||
  key.toLowerCase().includes('mailbox')
);

console.log(deploymentRelated.join("\n"));

console.log("\n" + "=".repeat(60));
console.log("\n📝 Key classes and their types:");

for (const key of ['HyperlaneCore', 'HyperlaneDeployer', 'EvmCoreModule', 'ProxyFactoryFactories']) {
  if (HyperlaneSDK[key]) {
    console.log(`\n${key}:`);
    console.log(`  Type: ${typeof HyperlaneSDK[key]}`);
    if (typeof HyperlaneSDK[key] === 'function' || typeof HyperlaneSDK[key] === 'object') {
      console.log(`  Properties/Methods:`, Object.getOwnPropertyNames(HyperlaneSDK[key]).slice(0, 10).join(', '));
    }
  }
}

console.log("\n" + "=".repeat(60));

