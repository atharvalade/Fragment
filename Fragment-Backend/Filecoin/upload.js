import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";
import { parse } from "csv-parse/sync";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Upload fragments to Filecoin with CDN enabled
 * Based on official fs-upload-dapp implementation
 */
async function uploadFragmentsToFilecoin(csvPath, options = {}) {
  const { withCDN = true, datasetId } = options;

  console.log("🚀 Uploading to Filecoin Onchain Cloud");
  console.log(`   CDN Enabled: ${withCDN ? "✅" : "❌"}\n`);

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in .env file");
  }

  try {
    // 1. Initialize Synapse SDK with CDN
    console.log("📡 Connecting to Filecoin Calibration...");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const provider = new ethers.JsonRpcProvider(RPC_URLS.calibration.http);
    const signer = wallet.connect(provider);

    const synapse = await Synapse.create({
      signer,
      withCDN, // Enable CDN for fast global delivery
    });
    console.log("✅ Connected with CDN support\n");

    // 2. Read CSV and parse fragments
    console.log(`📄 Reading CSV: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    console.log(`   Found ${records.length} rows\n`);

    // 3. Create storage context with optional dataset
    console.log("🗄️  Creating storage context...");
    const storage = await synapse.storage.createContext({
      dataSetId: datasetId ? parseInt(datasetId) : undefined,
      withCDN,
      callbacks: {
        onDataSetResolved: (info) => {
          console.log(`   📦 Dataset resolved: ${info.datasetId}`);
        },
        onProviderSelected: (provider) => {
          console.log(`   🏪 Provider selected: ${provider.name}`);
        },
      },
    });
    console.log("✅ Storage context ready\n");

    // 4. Upload each fragment
    console.log("📤 Uploading fragments...\n");
    const uploadResults = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const text = row.text || JSON.stringify(row);
      
      console.log(`[${i + 1}/${records.length}] Uploading: "${text.substring(0, 40)}..."`);

      try {
        // Prepare data (minimum 127 bytes)
        const fragmentData = JSON.stringify({
          id: i,
          data: row,
          timestamp: new Date().toISOString(),
        });
        const paddedData = fragmentData.padEnd(127, ' ');
        const bytes = new TextEncoder().encode(paddedData);

        // Upload with callbacks
        const startTime = Date.now();
        const { pieceCid, size } = await storage.upload(bytes, {
          metadata: {
            fragmentId: i.toString(),
            rowCount: "1",
          },
          onUploadComplete: (piece) => {
            console.log(`   ✅ Upload complete: ${piece.toString()}`);
          },
          onPieceAdded: (hash) => {
            console.log(`   🔗 Transaction: ${hash}`);
          },
          onPieceConfirmed: () => {
            console.log(`   ✓ Confirmed on-chain`);
          },
        });

        const duration = Date.now() - startTime;
        const v1Cid = pieceCid.toV1().toString(); // Convert to v1 format for compatibility

        console.log(`   📦 CID: ${v1Cid}`);
        console.log(`   📏 Size: ${size} bytes`);
        console.log(`   ⏱️  Duration: ${Math.round(duration / 1000)}s`);
        
        // CDN URL for fast retrieval
        if (withCDN) {
          const cdnUrl = `https://${wallet.address}.calibration.filbeam.io/${v1Cid}`;
          console.log(`   🌐 CDN URL: ${cdnUrl}`);
        }
        console.log("");

        uploadResults.push({
          id: i,
          text: text,
          cid: v1Cid,
          cidV2: pieceCid.toString(),
          size: size,
          uploadTime: duration,
          cdnEnabled: withCDN,
          cdnUrl: withCDN ? `https://${wallet.address}.calibration.filbeam.io/${v1Cid}` : null,
        });

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        uploadResults.push({
          id: i,
          text: text,
          error: error.message,
        });
      }
    }

    // 5. Save results
    const resultsPath = "upload-results.json";
    fs.writeFileSync(resultsPath, JSON.stringify(uploadResults, null, 2));
    
    // 6. Summary
    const successful = uploadResults.filter(r => r.cid);
    const failed = uploadResults.filter(r => !r.cid);

    console.log("=".repeat(60));
    console.log("📊 UPLOAD SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total fragments: ${records.length}`);
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`💾 Results saved: ${resultsPath}`);
    
    if (successful.length > 0) {
      const avgTime = Math.round(
        successful.reduce((sum, r) => sum + r.uploadTime, 0) / successful.length / 1000
      );
      console.log(`⏱️  Average time: ${avgTime}s per fragment`);
    }
    
    console.log("\n📋 Fragment CIDs:");
    successful.forEach(r => {
      console.log(`   [${r.id}] ${r.cid}`);
    });
    console.log("=".repeat(60));

    return uploadResults;

  } catch (error) {
    console.error("\n❌ Upload failed:");
    console.error(error.message);
    throw error;
  }
}

// CLI usage - auto-execute if run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('upload.js');

if (isMainModule) {
  const csvPath = process.argv[2] || "test-sentences.csv";
  const withCDN = process.argv[3] !== "false"; // Default to true
  const datasetId = process.argv[4]; // Optional dataset ID

  uploadFragmentsToFilecoin(csvPath, { withCDN, datasetId })
    .then(() => {
      console.log("\n✅ Upload completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Upload failed");
      process.exit(1);
    });
}

export { uploadFragmentsToFilecoin };

