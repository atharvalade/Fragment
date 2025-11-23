import { HyperlaneIsmFactory, MultiProvider } from "@hyperlane-xyz/sdk";
import { ethers } from "ethers";
import fs from "fs";
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

const multiProvider = new MultiProvider(chainMetadata);
multiProvider.setSharedSigner(wallet);

const factoriesData = JSON.parse(fs.readFileSync('./artifacts/factories-deployed.json', 'utf8'));
const ismFactory = HyperlaneIsmFactory.fromAddressesMap(factoriesData.factories, multiProvider);

console.log("IsmFactory object:");
console.log("  Type:", typeof ismFactory);
console.log("  Keys:", Object.keys(ismFactory));
console.log("  Constructor:", ismFactory.constructor.name);
console.log("\nPrototype methods:");
Object.getOwnPropertyNames(Object.getPrototypeOf(ismFactory)).forEach(m => {
  console.log(`  - ${m}: ${typeof ismFactory[m]}`);
});

console.log("\nChecking for getContracts:");
console.log("  ismFactory.getContracts:", typeof ismFactory.getContracts);
console.log("  ismFactory.chainMap:", typeof ismFactory.chainMap);

if (ismFactory.chainMap) {
  console.log("\nchainMap:");
  console.log("  Keys:", Object.keys(ismFactory.chainMap));
}

