import { Synapse, RPC_URLS, TOKENS, TIME_CONSTANTS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";
import { parse } from "csv-parse/sync";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Upload each sentence from CSV to Filecoin and return array of CIDs
 */
async function uploadSentencesToFilecoin() {
  console.log("🚀 Starting Filecoin upload test...\n");

  // Validate private key
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === "your_private_key_here") {
    console.error("❌ Error: Please set PRIVATE_KEY in .env file");
    console.error("   Copy .env.example to .env and add your private key");
    process.exit(1);
  }

  try {
    // 1. Initialize Synapse SDK
    console.log("📡 Connecting to Filecoin Calibration network...");
    const synapse = await Synapse.create({
      privateKey: process.env.PRIVATE_KEY,
      rpcURL: RPC_URLS.calibration.http,
    });
    console.log("✅ Connected to Filecoin Calibration\n");

    // 2. Check wallet balance
    console.log("💰 Checking wallet balance...");
    const address = await synapse.signer.getAddress();
    console.log(`   Wallet: ${address}`);
    
    const walletBalance = await synapse.payments.walletBalance(TOKENS.USDFC);
    const formattedBalance = ethers.formatUnits(walletBalance, 18);
    console.log(`   USDFC Balance: ${formattedBalance}`);

    if (parseFloat(formattedBalance) < 0.1) {
      console.warn("⚠️  Warning: Low USDFC balance. Get tokens from:");
      console.warn("   https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc");
    }

    // Check payment account balance
    const paymentBalance = await synapse.payments.balance(TOKENS.USDFC);
    const formattedPaymentBalance = ethers.formatUnits(paymentBalance, 18);
    console.log(`   Payment Account Balance: ${formattedPaymentBalance} USDFC\n`);

    // 3. Setup payment if needed
    if (parseFloat(formattedPaymentBalance) < 1.0) {
      console.log("💳 Setting up payment account...");
      const depositAmount = ethers.parseUnits("2.5", 18); // 2.5 USDFC

      if (walletBalance < depositAmount) {
        console.error("❌ Insufficient USDFC balance in wallet");
        console.error("   Please get test tokens from the faucet first");
        process.exit(1);
      }

      console.log("   Depositing 2.5 USDFC and approving Warm Storage...");
      const tx = await synapse.payments.depositWithPermitAndApproveOperator(
        depositAmount,
        synapse.getWarmStorageAddress(),
        ethers.MaxUint256,
        ethers.MaxUint256,
        TIME_CONSTANTS.EPOCHS_PER_MONTH,
      );
      await tx.wait();
      console.log("✅ Payment setup complete!\n");
    } else {
      console.log("✅ Payment account already funded\n");
    }

    // 4. Read CSV file
    console.log("📄 Reading CSV file...");
    const csvContent = fs.readFileSync("test-sentences.csv", "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    console.log(`   Found ${records.length} sentences\n`);

    // 5. Upload each sentence to Filecoin
    console.log("📤 Uploading sentences to Filecoin...\n");
    const uploadResults = [];

    for (let i = 0; i < records.length; i++) {
      const sentence = records[i].text;
      console.log(`[${i + 1}/${records.length}] Uploading: "${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}"`);

      try {
        // Prepare data - ensure minimum size of 127 bytes
        const sentenceData = JSON.stringify({
          id: i,
          text: sentence,
          timestamp: new Date().toISOString(),
        });
        
        // Pad if necessary to meet 127 byte minimum
        const paddedData = sentenceData.padEnd(127, ' ');
        const data = new TextEncoder().encode(paddedData);

        // Upload to Filecoin
        const startTime = Date.now();
        const { pieceCid, size } = await synapse.storage.upload(data);
        const duration = Date.now() - startTime;

        console.log(`   ✅ Uploaded in ${duration}ms`);
        console.log(`   📦 CID: ${pieceCid}`);
        console.log(`   📏 Size: ${size} bytes\n`);

        uploadResults.push({
          id: i,
          text: sentence,
          cid: pieceCid,
          size: size,
          uploadTime: duration,
        });
      } catch (error) {
        console.error(`   ❌ Failed to upload sentence ${i}:`, error.message);
        uploadResults.push({
          id: i,
          text: sentence,
          cid: null,
          error: error.message,
        });
      }
    }

    // 6. Save results to file
    const resultsPath = "upload-results.json";
    fs.writeFileSync(resultsPath, JSON.stringify(uploadResults, null, 2));
    console.log(`\n💾 Results saved to ${resultsPath}`);

    // 7. Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 UPLOAD SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total sentences: ${records.length}`);
    console.log(`Successfully uploaded: ${uploadResults.filter(r => r.cid).length}`);
    console.log(`Failed: ${uploadResults.filter(r => !r.cid).length}`);
    console.log(`Average upload time: ${Math.round(uploadResults.filter(r => r.uploadTime).reduce((sum, r) => sum + r.uploadTime, 0) / uploadResults.filter(r => r.uploadTime).length)}ms`);
    console.log("\n📋 CIDs for testing:");
    uploadResults.filter(r => r.cid).forEach(r => {
      console.log(`   [${r.id}] ${r.cid}`);
    });
    console.log("=".repeat(60));

    return uploadResults;

  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    process.exit(1);
  }
}

// Run the upload
uploadSentencesToFilecoin()
  .then(() => {
    console.log("\n✅ Upload test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Upload test failed:", error);
    process.exit(1);
  });

