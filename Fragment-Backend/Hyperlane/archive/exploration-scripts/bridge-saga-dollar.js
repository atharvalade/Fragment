import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Bridge SAGA Dollar from SagaEVM to Fragment Chainlet
 * 
 * Prerequisites:
 * 1. Hyperlane core contracts deployed
 * 2. Warp Route deployed
 * 3. Validator and Relayer running (Kurtosis)
 */

// Warp Route ABI (minimal - just what we need)
const WARP_ROUTE_ABI = [
  "function transferRemote(uint32 _destination, bytes32 _recipient, uint256 _amountOrId) external payable returns (bytes32 messageId)",
  "function balanceOf(address account) external view returns (uint256)",
  "function quoteGasPayment(uint32 _destinationDomain) external view returns (uint256)",
];

// ERC20 ABI for approvals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

async function bridgeSagaDollar(amount, warpRouteAddress) {
  console.log("🌉 Bridging SAGA Dollar from SagaEVM to Fragment Chainlet\n");

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env");
  }

  if (!warpRouteAddress) {
    throw new Error("Please provide Warp Route address (from deployment artifacts)");
  }

  // Connect to SagaEVM
  const sagaProvider = new ethers.JsonRpcProvider("https://5464.rpc.thirdweb.com");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, sagaProvider);

  console.log(`📍 Wallet: ${wallet.address}\n`);

  // SAGA Dollar contract
  const sagaDollarAddress = "0xB76144F87DF95816e8c55C240F874C554B4553C3";
  const sagaDollar = new ethers.Contract(sagaDollarAddress, ERC20_ABI, wallet);

  // Warp Route contract (HypERC20Collateral on SagaEVM)
  const warpRoute = new ethers.Contract(warpRouteAddress, WARP_ROUTE_ABI, wallet);

  // 1. Check balance
  console.log("💰 Checking SAGA Dollar balance...");
  const balance = await sagaDollar.balanceOf(wallet.address);
  const decimals = await sagaDollar.decimals();
  const symbol = await sagaDollar.symbol();
  
  console.log(`   Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

  const amountWei = ethers.parseUnits(amount.toString(), decimals);
  
  if (balance < amountWei) {
    throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  }

  // 2. Check/Set allowance
  console.log("\n🔓 Checking allowance...");
  const allowance = await sagaDollar.allowance(wallet.address, warpRouteAddress);
  
  if (allowance < amountWei) {
    console.log(`   Approving Warp Route to spend ${amount} ${symbol}...`);
    const approveTx = await sagaDollar.approve(warpRouteAddress, amountWei);
    console.log(`   Transaction: ${approveTx.hash}`);
    await approveTx.wait();
    console.log("   ✅ Approved");
  } else {
    console.log("   ✅ Already approved");
  }

  // 3. Quote gas payment
  console.log("\n⛽ Calculating gas for cross-chain transfer...");
  const fragmentDomainId = 27638; // From chains.yaml
  const gasPayment = await warpRoute.quoteGasPayment(fragmentDomainId);
  console.log(`   Gas payment required: ${ethers.formatEther(gasPayment)} GAS`);

  // 4. Bridge tokens
  console.log(`\n🌉 Bridging ${amount} ${symbol} to Fragment Chainlet...`);
  
  // Convert address to bytes32 (Hyperlane format)
  const recipientBytes32 = ethers.zeroPadValue(wallet.address, 32);

  const transferTx = await warpRoute.transferRemote(
    fragmentDomainId,
    recipientBytes32,
    amountWei,
    { value: gasPayment }
  );

  console.log(`   📝 Transaction hash: ${transferTx.hash}`);
  console.log(`   🔗 https://sagaevm.sagaexplorer.io/tx/${transferTx.hash}`);
  
  const receipt = await transferTx.wait();
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);

  // Parse message ID from events
  const messageId = receipt.logs
    .map(log => {
      try {
        return warpRoute.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find(log => log && log.name === "SentTransferRemote")?.args?.messageId;

  if (messageId) {
    console.log(`   📨 Message ID: ${messageId}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ BRIDGE INITIATED");
  console.log("=".repeat(60));
  console.log(`Amount: ${amount} ${symbol}`);
  console.log(`From: SagaEVM`);
  console.log(`To: Fragment Chainlet`);
  console.log(`Recipient: ${wallet.address}`);
  console.log("\n⏳ Waiting for relayer to deliver message...");
  console.log("   This may take 1-5 minutes depending on relayer sync");
  console.log("=".repeat(60));

  // Save bridge info
  const bridgeInfo = {
    transactionHash: transferTx.hash,
    from: "sagaevm",
    to: "fragment",
    amount: amount.toString(),
    amountWei: amountWei.toString(),
    token: symbol,
    sender: wallet.address,
    recipient: wallet.address,
    messageId: messageId?.toString(),
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    `bridge-${Date.now()}.json`,
    JSON.stringify(bridgeInfo, null, 2)
  );

  console.log("\n💾 Bridge details saved");
  console.log("\n📝 Next steps:");
  console.log("1. Wait for relayer to process (check Kurtosis logs)");
  console.log("2. Check Fragment chainlet for wrapped SAGA Dollar");
  console.log("3. Use Hyperlane Explorer to track message delivery\n");
}

// CLI usage
const amount = parseFloat(process.argv[2]);
const warpRouteAddress = process.argv[3];

if (!amount || !warpRouteAddress) {
  console.error("Usage: npm run bridge <amount> <warpRouteAddress>");
  console.error("Example: npm run bridge 10 0x1234...");
  console.error("\nWarp Route address can be found in warp-route-deployment-{timestamp}.json after deployment");
  process.exit(1);
}

bridgeSagaDollar(amount, warpRouteAddress)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Bridge failed:", error.message);
    process.exit(1);
  });

