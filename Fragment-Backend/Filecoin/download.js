import { Synapse, RPC_URLS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

/**
 * Initialize Synapse SDK
 */
async function initSynapse(withCDN = true) {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in .env file");
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const provider = new ethers.JsonRpcProvider(RPC_URLS.calibration.http);
  const signer = wallet.connect(provider);

  return {
    synapse: await Synapse.create({ signer, withCDN }),
    wallet,
  };
}

/**
 * List all datasets for the current user
 */
async function listDatasets() {
  console.log("📋 Listing all datasets...\n");

  try {
    const { synapse, wallet } = await initSynapse();

    // Get user's datasets using findDataSets()
    const datasets = await synapse.storage.findDataSets();

    console.log("=".repeat(60));
    console.log("📊 YOUR DATASETS");
    console.log("=".repeat(60));
    console.log(`Total datasets: ${datasets.length}\n`);

    if (datasets.length === 0) {
      console.log("No datasets found. Upload some files to create a dataset.");
      return [];
    }

    datasets.forEach((dataset, i) => {
      console.log(`[${i + 1}] Dataset ID: ${dataset.pdpVerifierDataSetId || dataset.id || 'N/A'}`);
      console.log(`    Provider ID: ${dataset.providerId}`);
      console.log(`    With CDN: ${dataset.withCDN ? 'Yes' : 'No'}`);
      if (dataset.metadata && Object.keys(dataset.metadata).length > 0) {
        console.log(`    Metadata:`, JSON.stringify(dataset.metadata, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
      }
      console.log("");
    });

    console.log("=".repeat(60));

    // Save to file (handle BigInt serialization)
    fs.writeFileSync("datasets.json", JSON.stringify(datasets, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    console.log("💾 Datasets saved to: datasets.json\n");

    return datasets;

  } catch (error) {
    console.error("❌ Failed to list datasets:", error.message);
    throw error;
  }
}

/**
 * List all pieces in a specific dataset
 */
async function listPiecesInDataset(datasetId) {
  console.log(`📦 Listing pieces in dataset ${datasetId}...\n`);

  try {
    const { synapse, wallet } = await initSynapse();

    // Get user's datasets
    const datasets = await synapse.storage.findDataSets();
    const dataset = datasets.find(ds => ds.id === parseInt(datasetId));

    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    // Get pieces from PDP server
    const providerInfo = await synapse.getProviderInfo(dataset.providerId);
    const serviceURL = providerInfo.products.PDP?.data.serviceURL;
    
    if (!serviceURL) {
      throw new Error(`No PDP service URL for provider ${dataset.providerId}`);
    }

    // Import PDPServer dynamically
    const { PDPServer } = await import("@filoz/synapse-sdk");
    const pdpServer = new PDPServer(null, serviceURL);
    const datasetData = await pdpServer.getDataSet(dataset.pdpVerifierDataSetId);
    
    const pieces = datasetData.pieces || [];

    console.log("=".repeat(60));
    console.log(`📦 DATASET ${datasetId} - PIECES`);
    console.log("=".repeat(60));
    console.log(`Total pieces: ${pieces.length}\n`);

    if (pieces.length === 0) {
      console.log("No pieces in this dataset.");
      return [];
    }

    const piecesWithLinks = pieces.map((piece, i) => {
      const v1Cid = piece.pieceCid.toV1().toString();
      const cdnUrl = `https://${wallet.address}.calibration.filbeam.io/${v1Cid}`;
      const pdpUrl = serviceURL ? `${serviceURL}/piece/${v1Cid}` : null;

      console.log(`[${i + 1}] Piece CID: ${v1Cid}`);
      console.log(`    Size: ${piece.size || 'N/A'} bytes`);
      console.log(`    🌐 CDN URL: ${cdnUrl}`);
      if (pdpUrl) {
        console.log(`    🔗 Direct URL: ${pdpUrl}`);
      }
      if (piece.metadata) {
        console.log(`    Metadata:`, JSON.stringify(piece.metadata));
      }
      console.log("");

      return {
        cid: v1Cid,
        size: piece.size,
        metadata: piece.metadata,
        cdnUrl,
        pdpUrl,
        viewUrl: cdnUrl, // Default to CDN for fast viewing
      };
    });

    console.log("=".repeat(60));

    // Save to file
    const outputFile = `dataset-${datasetId}-pieces.json`;
    fs.writeFileSync(outputFile, JSON.stringify(piecesWithLinks, null, 2));
    console.log(`💾 Pieces saved to: ${outputFile}\n`);

    return piecesWithLinks;

  } catch (error) {
    console.error("❌ Failed to list pieces:", error.message);
    throw error;
  }
}

/**
 * List all pieces across all datasets
 */
async function listAllPieces() {
  console.log("📦 Listing all pieces across all datasets...\n");

  try {
    const { synapse, wallet } = await initSynapse();

    const datasets = await synapse.storage.findDataSets();
    const { PDPServer } = await import("@filoz/synapse-sdk");

    const allPieces = [];

    console.log("=".repeat(60));
    console.log("📦 ALL PIECES");
    console.log("=".repeat(60));

    for (const dataset of datasets) {
      try {
        // Get provider info and PDP server
        const providerInfo = await synapse.getProviderInfo(dataset.providerId);
        const serviceURL = providerInfo.products.PDP?.data.serviceURL;
        
        if (!serviceURL) continue;

        const pdpServer = new PDPServer(null, serviceURL);
        const datasetData = await pdpServer.getDataSet(dataset.pdpVerifierDataSetId);
        const pieces = datasetData.pieces || [];

        console.log(`\nDataset ${dataset.id} (${pieces.length} pieces):`);
        console.log("-".repeat(60));

        pieces.forEach((piece, i) => {
          const v1Cid = piece.pieceCid.toV1().toString();
          const cdnUrl = `https://${wallet.address}.calibration.filbeam.io/${v1Cid}`;

          console.log(`  [${i + 1}] ${v1Cid}`);
          console.log(`      🌐 ${cdnUrl}`);

          allPieces.push({
            datasetId: dataset.id,
            cid: v1Cid,
            size: piece.size,
            cdnUrl,
            metadata: piece.metadata,
          });
        });
      } catch (error) {
        console.warn(`Failed to fetch pieces for dataset ${dataset.id}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Total pieces: ${allPieces.length}`);
    console.log("=".repeat(60));

    // Save to file
    fs.writeFileSync("all-pieces.json", JSON.stringify(allPieces, null, 2));
    console.log("\n💾 All pieces saved to: all-pieces.json\n");

    return allPieces;

  } catch (error) {
    console.error("❌ Failed to list all pieces:", error.message);
    throw error;
  }
}

/**
 * Download a specific piece by CID
 */
async function downloadPiece(cid, outputPath = null) {
  console.log(`📥 Downloading piece: ${cid}\n`);

  try {
    const { synapse, wallet } = await initSynapse();

    const startTime = Date.now();
    const bytes = await synapse.storage.download(cid);
    const duration = Date.now() - startTime;

    console.log(`✅ Downloaded in ${Math.round(duration / 1000)}s`);
    console.log(`📏 Size: ${bytes.length} bytes`);

    // Try to decode as JSON
    try {
      const decodedText = new TextDecoder().decode(bytes);
      const data = JSON.parse(decodedText.trim());
      console.log(`📝 Data:`, data);

      // Save to file
      const fileName = outputPath || `piece-${data.id || 'unknown'}.json`;
      fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
      console.log(`💾 Saved to: ${fileName}\n`);

      return data;
    } catch (e) {
      // Not JSON, save as binary
      const fileName = outputPath || `piece-${cid.slice(0, 8)}.bin`;
      fs.writeFileSync(fileName, bytes);
      console.log(`💾 Saved binary to: ${fileName}\n`);

      return bytes;
    }

  } catch (error) {
    console.error(`❌ Failed to download: ${error.message}`);
    throw error;
  }
}

/**
 * Download all pieces from a dataset
 */
async function downloadDataset(datasetId, outputDir = null) {
  console.log(`📥 Downloading all pieces from dataset ${datasetId}...\n`);

  const dir = outputDir || `./downloads/dataset-${datasetId}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    // First get the pieces list
    const pieces = await listPiecesInDataset(datasetId);

    console.log(`\n📥 Downloading ${pieces.length} pieces...\n`);

    const results = [];

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      console.log(`[${i + 1}/${pieces.length}] Downloading ${piece.cid}...`);

      try {
        const fileName = `${dir}/piece-${i}.json`;
        const data = await downloadPiece(piece.cid, fileName);
        
        results.push({
          cid: piece.cid,
          data,
          fileName,
          cdnUrl: piece.cdnUrl,
        });

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        results.push({
          cid: piece.cid,
          error: error.message,
        });
      }
    }

    // Save summary
    const summaryPath = `${dir}/summary.json`;
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("📊 DOWNLOAD SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total pieces: ${pieces.length}`);
    console.log(`✅ Downloaded: ${results.filter(r => !r.error).length}`);
    console.log(`❌ Failed: ${results.filter(r => r.error).length}`);
    console.log(`📂 Output: ${dir}`);
    console.log("=".repeat(60));

    return results;

  } catch (error) {
    console.error("❌ Download failed:", error.message);
    throw error;
  }
}

/**
 * Get view links for a piece (CDN and direct)
 */
async function getViewLinks(cid) {
  const { wallet } = await initSynapse();
  
  const cdnUrl = `https://${wallet.address}.calibration.filbeam.io/${cid}`;
  const explorerUrl = `https://beryx.io/fil/calibration/address/${wallet.address}`;

  console.log("🔗 View Links:");
  console.log(`   🌐 CDN (Fast): ${cdnUrl}`);
  console.log(`   🔍 Explorer: ${explorerUrl}`);

  return { cdnUrl, explorerUrl };
}

// CLI usage - auto-execute if run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('download.js');

if (isMainModule) {
  const command = process.argv[2] || "help";
  
  switch (command) {
    case "datasets":
      // List all datasets
      listDatasets()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "pieces":
      // List pieces in a dataset
      const datasetId = process.argv[3];
      if (!datasetId) {
        console.error("❌ Usage: node download.js pieces <datasetId>");
        process.exit(1);
      }
      listPiecesInDataset(datasetId)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "all":
      // List all pieces across all datasets
      listAllPieces()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "download":
      // Download a specific piece
      const cid = process.argv[3];
      if (!cid) {
        console.error("❌ Usage: node download.js download <cid> [outputPath]");
        process.exit(1);
      }
      const outputPath = process.argv[4];
      downloadPiece(cid, outputPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "dataset":
      // Download entire dataset
      const dsId = process.argv[3];
      if (!dsId) {
        console.error("❌ Usage: node download.js dataset <datasetId> [outputDir]");
        process.exit(1);
      }
      const outputDir = process.argv[4];
      downloadDataset(dsId, outputDir)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "links":
      // Get view links for a piece
      const cidForLinks = process.argv[3];
      if (!cidForLinks) {
        console.error("❌ Usage: node download.js links <cid>");
        process.exit(1);
      }
      getViewLinks(cidForLinks)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case "help":
    default:
      console.log(`
Fragment Filecoin Download Tool

Commands:
  datasets              List all your datasets
  pieces <datasetId>    List all pieces in a dataset with view links
  all                   List all pieces across all datasets
  download <cid>        Download a specific piece by CID
  dataset <datasetId>   Download all pieces from a dataset
  links <cid>           Get view links (CDN and direct) for a piece

Examples:
  node download.js datasets
  node download.js pieces 12345
  node download.js all
  node download.js download baga6ea4seaqXXXX
  node download.js dataset 12345
  node download.js links baga6ea4seaqXXXX
      `);
      process.exit(0);
  }
}

export {
  listDatasets,
  listPiecesInDataset,
  listAllPieces,
  downloadPiece,
  downloadDataset,
  getViewLinks,
};
