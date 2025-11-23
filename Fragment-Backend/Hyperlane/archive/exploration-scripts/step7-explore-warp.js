import { EvmERC20WarpModule } from "@hyperlane-xyz/sdk";

/**
 * STEP 7: Explore Warp Route deployment
 */

console.log("🔍 STEP 7: Exploring Warp Route Deployment\n");
console.log("=".repeat(60));

console.log("\n1️⃣  EvmERC20WarpModule:");
console.log("   Type:", typeof EvmERC20WarpModule);
console.log("   Methods:", Object.getOwnPropertyNames(EvmERC20WarpModule.prototype).slice(0, 15));
console.log("   Static methods:", Object.getOwnPropertyNames(EvmERC20WarpModule).filter(m => !m.startsWith('_')));
console.log("   Constructor length:", EvmERC20WarpModule.length);

console.log("\n=".repeat(60));
console.log("✅ Exploration complete\n");

