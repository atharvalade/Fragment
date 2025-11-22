import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Download and verify sentences from Filecoin using CIDs from upload-results.json
 */
async function downloadSentencesFromFilecoin() {
  console.log("🚀 Starting Filecoin download test...\n");

  // Validate private key
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === "your_private_key_here") {
    console.error("❌ Error: Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  // Check if upload results exist
  if (!fs.existsSync("upload-results.json")) {
    console.error("❌ Error: upload-results.json not found");
    console.error("   Please run 'npm run test:upload' first");
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

    // 2. Read upload results
    const uploadResults = JSON.parse(fs.readFileSync("upload-results.json", "utf-8"));
    const successfulUploads = uploadResults.filter(r => r.cid);
    console.log(`📋 Found ${successfulUploads.length} CIDs to download\n`);

    // 3. Download each CID
    console.log("📥 Downloading sentences from Filecoin...\n");
    const downloadResults = [];

    for (let i = 0; i < successfulUploads.length; i++) {
      const { id, cid, text: originalText } = successfulUploads[i];
      console.log(`[${i + 1}/${successfulUploads.length}] Downloading CID: ${cid}`);

      try {
        const startTime = Date.now();
        const bytes = await synapse.storage.download(cid);
        const duration = Date.now() - startTime;

        const decodedText = new TextDecoder().decode(bytes);
        const parsedData = JSON.parse(decodedText.trim());

        const matches = parsedData.text === originalText;
        console.log(`   ✅ Downloaded in ${duration}ms`);
        console.log(`   📝 Text: "${parsedData.text.substring(0, 50)}${parsedData.text.length > 50 ? '...' : ''}"`);
        console.log(`   ✓ Verification: ${matches ? '✅ MATCH' : '❌ MISMATCH'}\n`);

        downloadResults.push({
          id,
          cid,
          originalText,
          downloadedText: parsedData.text,
          matches,
          downloadTime: duration,
        });
      } catch (error) {
        console.error(`   ❌ Failed to download CID ${cid}:`, error.message);
        downloadResults.push({
          id,
          cid,
          error: error.message,
        });
      }
    }

    // 4. Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 DOWNLOAD SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total downloads: ${successfulUploads.length}`);
    console.log(`Successfully downloaded: ${downloadResults.filter(r => r.matches).length}`);
    console.log(`Failed: ${downloadResults.filter(r => r.error).length}`);
    console.log(`Average download time: ${Math.round(downloadResults.filter(r => r.downloadTime).reduce((sum, r) => sum + r.downloadTime, 0) / downloadResults.filter(r => r.downloadTime).length)}ms`);
    console.log("=".repeat(60));

    return downloadResults;

  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(error.message);
    if (error.cause) {
      console.error("Cause:", error.cause);
    }
    process.exit(1);
  }
}

// Run the download
downloadSentencesFromFilecoin()
  .then(() => {
    console.log("\n✅ Download test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Download test failed:", error);
    process.exit(1);
  });

