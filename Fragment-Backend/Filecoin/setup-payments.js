import { Synapse, RPC_URLS, TOKENS, TIME_CONSTANTS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/**
 * Setup payment account for Filecoin storage
 */
async function setupPayments() {
  console.log("💳 Setting up Filecoin payment account...\n");

  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === "your_private_key_here") {
    console.error("❌ Error: Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  try {
    // 1. Initialize Synapse SDK
    console.log("📡 Connecting to Filecoin Calibration network...");
    const synapse = await Synapse.create({
      privateKey: process.env.PRIVATE_KEY,
      rpcURL: RPC_URLS.calibration.http,
    });
    console.log("✅ Connected\n");

    // 2. Check wallet balance
    console.log("💰 Checking balances...");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log(`   Wallet Address: ${wallet.address}`);
    
    const walletBalance = await synapse.payments.walletBalance(TOKENS.USDFC);
    const formattedWalletBalance = ethers.formatUnits(walletBalance, 18);
    console.log(`   Wallet USDFC: ${formattedWalletBalance}`);

    const paymentBalance = await synapse.payments.balance(TOKENS.USDFC);
    const formattedPaymentBalance = ethers.formatUnits(paymentBalance, 18);
    console.log(`   Payment Account USDFC: ${formattedPaymentBalance}\n`);

    // 3. Check if already funded
    if (parseFloat(formattedPaymentBalance) >= 1.0) {
      console.log("✅ Payment account already has sufficient funds!");
      console.log(`   Current balance: ${formattedPaymentBalance} USDFC\n`);
      
      // Check allowances
      console.log("🔍 Checking storage operator allowance...");
      const warmStorageAddress = synapse.getWarmStorageAddress();
      console.log(`   Warm Storage Address: ${warmStorageAddress}`);
      
      return;
    }

    // 4. Deposit and approve
    const depositAmount = ethers.parseUnits("2.5", 18); // 2.5 USDFC

    if (walletBalance < depositAmount) {
      console.error("❌ Insufficient USDFC in wallet");
      console.error(`   Required: 2.5 USDFC`);
      console.error(`   Available: ${formattedWalletBalance} USDFC`);
      console.error("\n📍 Get test tokens from:");
      console.error("   https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc");
      process.exit(1);
    }

    console.log("💳 Depositing and approving storage operator...");
    console.log(`   Amount: 2.5 USDFC`);
    console.log(`   This covers ~1 TiB storage for 30 days\n`);

    const warmStorageAddress = synapse.getWarmStorageAddress();
    console.log(`   Warm Storage Address: ${warmStorageAddress}`);

    // Use depositWithPermitAndApproveOperator for one-transaction setup
    const tx = await synapse.payments.depositWithPermitAndApproveOperator(
      depositAmount,
      warmStorageAddress,
      ethers.MaxUint256, // Rate allowance
      ethers.MaxUint256, // Lockup allowance
      TIME_CONSTANTS.EPOCHS_PER_MONTH, // Max lockup period (30 days)
    );

    console.log(`   📝 Transaction submitted: ${tx.hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);

    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}\n`);

    // 5. Verify setup
    const newPaymentBalance = await synapse.payments.balance(TOKENS.USDFC);
    const newFormattedBalance = ethers.formatUnits(newPaymentBalance, 18);

    console.log("=".repeat(60));
    console.log("✅ PAYMENT SETUP COMPLETE");
    console.log("=".repeat(60));
    console.log(`Payment Account Balance: ${newFormattedBalance} USDFC`);
    console.log(`Storage Operator Approved: ${warmStorageAddress}`);
    console.log("\n🎉 You're ready to upload to Filecoin!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    process.exit(1);
  }
}

// Run setup
setupPayments()
  .then(() => {
    console.log("\n✅ Setup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  });

