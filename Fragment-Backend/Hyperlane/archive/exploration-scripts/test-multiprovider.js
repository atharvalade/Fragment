import { MultiProvider } from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

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

console.log("Creating MultiProvider...");
const multiProvider = new MultiProvider(chainMetadata);

console.log("\nMultiProvider methods:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(multiProvider)).sort().join("\n"));

console.log("\n\nTrying different signer methods:");

// Try method 1
try {
  multiProvider.setSharedSigner(wallet);
  console.log("✅ setSharedSigner works");
} catch (e) {
  console.log("❌ setSharedSigner:", e.message);
}

// Try method 2
try {
  multiProvider.setSharedSigner(wallet.privateKey);
  console.log("✅ setSharedSigner with privateKey works");
} catch (e) {
  console.log("❌ setSharedSigner with privateKey:", e.message);
}

// Test getSigner
try {
  const signer = multiProvider.getSigner("fragment");
  const address = await signer.getAddress();
  console.log(`✅ getSigner works: ${address}`);
} catch (e) {
  console.log("❌ getSigner:", e.message);
}

