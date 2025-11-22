import { CONTRACT_ADDRESSES } from "@filoz/synapse-sdk";
import { ethers } from "ethers";

/**
 * Get USDFC token information for Filecoin Calibration
 */
async function getTokenInfo() {
  console.log("🔍 USDFC Token Information\n");

  try {
    // 1. Get USDFC token address from Synapse SDK
    const usdfc_address = CONTRACT_ADDRESSES.USDFC.calibration;
    
    console.log("📋 USDFC Token Details (Filecoin Calibration):");
    console.log("=".repeat(60));
    console.log(`✅ Token Contract Address: ${usdfc_address}`);
    console.log("✅ Token Symbol: USDFC");
    console.log("✅ Token Decimals: 18 (standard ERC-20)");
    console.log("=".repeat(60));
    console.log("\n📝 To Add USDFC to MetaMask:");
    console.log("1. Open MetaMask");
    console.log("2. Switch to 'Filecoin Calibration' network");
    console.log("3. Click 'Assets' tab");
    console.log("4. Scroll down → Click 'Import tokens'");
    console.log("5. Paste the token contract address above");
    console.log("6. Symbol: USDFC");
    console.log("7. Decimals: 18");
    console.log("8. Click 'Add Custom Token' → 'Import Tokens'");

    // 2. Check transaction on Beryx
    console.log("\n\n🔗 Check Your Transaction:");
    console.log("Your transaction: https://beryx.io/fil/calibration/txs/0xbda6ce5bd020dea67501616b0c990c71aa34a428c3f7eba4a2caecb8d3715f22");
    console.log("\nLook for:");
    console.log("• 'To' address - this is the token contract");
    console.log("• 'Tokens Transferred' section - shows the token details");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Also create a function to check token balance directly
async function checkTokenBalance() {
  console.log("\n\n💰 Checking Token Balance...");
  
  try {
    const rpcURL = "https://api.calibration.node.glif.io/rpc/v1";
    const provider = new ethers.JsonRpcProvider(rpcURL);
    
    // ERC-20 ABI for balanceOf and decimals
    const tokenABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
    ];

    const tokenAddress = CONTRACT_ADDRESSES.USDFC.calibration;
    const walletAddress = "YOUR_WALLET_ADDRESS"; // User needs to replace this

    if (walletAddress === "YOUR_WALLET_ADDRESS") {
      console.log("\n⚠️  Please run this with your wallet address:");
      console.log("   node -e \"import('./get-token-info.js').then(m => m.checkBalance('YOUR_ADDRESS'))\"");
      return;
    }

    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
    ]);

    console.log("\n📊 Token Info:");
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Contract: ${tokenAddress}`);
    console.log(`\n💰 Your Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
  }
}

// Run the info getter
getTokenInfo();

// Export for potential reuse
export { getTokenInfo, checkTokenBalance };

