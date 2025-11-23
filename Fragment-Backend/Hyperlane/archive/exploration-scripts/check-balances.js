import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

async function checkBalances() {
  console.log("💰 Checking Balances Across Networks\n");
  console.log("=".repeat(60));

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const address = wallet.address;

  console.log(`📍 Wallet: ${address}\n`);

  // SagaEVM
  console.log("🔷 SagaEVM (Chain ID: 5464)");
  console.log("-".repeat(60));
  
  const sagaProvider = new ethers.JsonRpcProvider("https://5464.rpc.thirdweb.com");
  const sagaWallet = wallet.connect(sagaProvider);

  try {
    // Native GAS balance
    const gasBalance = await sagaProvider.getBalance(address);
    console.log(`   GAS: ${ethers.formatEther(gasBalance)} GAS`);

    // SAGA Dollar balance
    const sagaDollarAddress = "0xB76144F87DF95816e8c55C240F874C554B4553C3";
    const sagaDollar = new ethers.Contract(sagaDollarAddress, ERC20_ABI, sagaWallet);
    
    const dBalance = await sagaDollar.balanceOf(address);
    const dDecimals = await sagaDollar.decimals();
    const dSymbol = await sagaDollar.symbol();
    
    console.log(`   ${dSymbol}: ${ethers.formatUnits(dBalance, dDecimals)} ${dSymbol}`);
    console.log(`   💰 Total SAGA Dollar: ${ethers.formatUnits(dBalance, dDecimals)}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log();

  // Fragment Chainlet
  console.log("🔶 Fragment Chainlet");
  console.log("-".repeat(60));
  
  const fragmentProvider = new ethers.JsonRpcProvider(
    "https://fragment-2763843736868000-1.jsonrpc.sagarpc.io"
  );
  const fragmentWallet = wallet.connect(fragmentProvider);

  try {
    // Native MENT balance
    const mentBalance = await fragmentProvider.getBalance(address);
    console.log(`   MENT: ${ethers.formatEther(mentBalance)} MENT`);

    // Check if Warp Route is deployed
    const warpRouteFile = process.argv[2];
    if (warpRouteFile) {
      console.log(`\n   📄 Checking wrapped SAGA Dollar balance...`);
      
      const fs = await import("fs");
      const deployment = JSON.parse(fs.default.readFileSync(warpRouteFile, "utf8"));
      
      if (deployment.fragment?.HypERC20) {
        const wSagaAddress = deployment.fragment.HypERC20;
        const wSaga = new ethers.Contract(wSagaAddress, ERC20_ABI, fragmentWallet);
        
        const wBalance = await wSaga.balanceOf(address);
        const wDecimals = await wSaga.decimals();
        const wSymbol = await wSaga.symbol();
        
        console.log(`   ${wSymbol}: ${ethers.formatUnits(wBalance, wDecimals)} ${wSymbol}`);
      }
    } else {
      console.log(`\n   ℹ️  To check wSAGA balance, provide deployment file:`);
      console.log(`   node scripts/check-balances.js artifacts/warp-route-deployment-*.json`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Balance check complete\n");
}

checkBalances()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

