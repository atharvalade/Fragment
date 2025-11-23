import { EvmCoreModule } from "@hyperlane-xyz/sdk";

console.log("Checking EvmCoreModule:");
console.log("  Type:", typeof EvmCoreModule);
console.log("  Methods:", Object.getOwnPropertyNames(EvmCoreModule.prototype).slice(0, 20));
console.log("  Static methods:", Object.getOwnPropertyNames(EvmCoreModule).slice(0, 20));
console.log("  Constructor length:", EvmCoreModule.length);

