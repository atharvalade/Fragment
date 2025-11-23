# Fragment Filecoin Service

Filecoin integration for Fragment using Synapse SDK with CDN support for fast global content delivery.

## Features

✅ **Upload CSV fragments to Filecoin** with automatic chunking  
✅ **CDN-enabled downloads** via Filecoin Beam for fast retrieval  
✅ **Automatic payment management** with USDFC tokens  
✅ **Progress tracking** with callbacks for all operations  
✅ **Dataset management** for organizing related fragments  

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Add your private key to .env
PRIVATE_KEY=your_private_key_here
```

### 2. Get Test Tokens

**Get tFIL (for gas):**
- https://faucet.calibnet.chainsafe-fil.io/funds.html

**Get USDFC (for storage):**
- https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc

### 3. Setup Payment Account

```bash
npm run setup
```

This deposits 2.5 USDFC (~1 TiB storage for 30 days) and approves the storage operator.

### 4. Upload Fragments

```bash
# Upload with CDN enabled (default)
npm run upload

# Or specify CSV file
node upload.js path/to/data.csv

# Disable CDN
node upload.js data.csv false

# Use existing dataset
node upload.js data.csv true 12345
```

### 5. Download Fragments

```bash
# Download all from upload-results.json
npm run download

# Or download specific CIDs
node download.js cid baga6ea4seaqXXXXX baga6ea4seaqYYYYY
```

## File Structure

```
Filecoin/
├── upload.js              # Upload fragments to Filecoin with CDN
├── download.js            # Download fragments from Filecoin
├── setup-payments.js      # One-time payment setup
├── test-sentences.csv     # Example data for testing
├── upload-results.json    # Upload results with CIDs
├── .env                   # Your private key (DO NOT COMMIT)
└── README.md             # This file
```

## Usage Examples

### Upload CSV Data

```javascript
import { uploadFragmentsToFilecoin } from './upload.js';

const results = await uploadFragmentsToFilecoin('data.csv', {
  withCDN: true,      // Enable CDN for fast retrieval
  datasetId: 12345    // Optional: use existing dataset
});

// Results include CIDs and CDN URLs
results.forEach(r => {
  console.log(`Fragment ${r.id}: ${r.cid}`);
  console.log(`CDN URL: ${r.cdnUrl}`);
});
```

### Download Fragments

```javascript
import { downloadFragmentsFromFilecoin } from './download.js';

const cids = ['baga6ea4seaqXXXX', 'baga6ea4seaqYYYY'];
const results = await downloadFragmentsFromFilecoin(cids, {
  withCDN: true,
  outputDir: './downloads'
});
```

## CDN Support

When CDN is enabled (`withCDN: true`), files are accessible via Filecoin Beam for fast global delivery:

```
https://{YOUR_ADDRESS}.calibration.filbeam.io/{PIECE_CID}
```

**Benefits:**
- ⚡ Sub-second retrieval times globally
- 🌍 Edge caching for low latency
- 💰 Pay-per-egress billing
- 📊 Built-in analytics

## Architecture

### Upload Flow

1. Parse CSV into fragments
2. Create Synapse SDK instance with CDN support
3. Create storage context (auto-selects provider)
4. Upload each fragment with metadata
5. Return CIDs and CDN URLs

### Download Flow

1. Connect to Filecoin via Synapse SDK
2. Download data using PieceCID
3. Decode and parse JSON fragments
4. Save to local files

## Data Format

Fragments are stored as JSON with minimum 127 bytes:

```json
{
  "id": 0,
  "data": { 
    "text": "Your CSV row data here" 
  },
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

## Troubleshooting

**Error: Insufficient USDFC balance**
- Run `npm run setup` to deposit funds
- Get more USDFC from faucet

**Error: Upload timeout**
- Filecoin uploads can take 30-60 seconds
- Provider may be slow, try again
- Check provider status at docs.filecoin.cloud

**Error: Cannot find CID**
- Wait a few minutes after upload for propagation
- Verify CID format (should start with `baga6ea4seaq`)

## Integration with Fragment

This service is part of the Fragment distributed compute system:

1. **Upload**: CSV data split into fragments and uploaded to Filecoin
2. **SAGA Contract**: Routes fragment CIDs to available workers
3. **Workers**: Download fragments, run AI inference, upload results
4. **Aggregation**: Client downloads all results and combines

## Resources

- [Synapse SDK Docs](https://docs.filecoin.cloud)
- [Filecoin Beam (CDN)](https://docs.filecoin.cloud/developer-guides/storage/storage-context)
- [USDFC Token](https://forest-explorer.chainsafe.dev/)
- [Fragment GitHub](https://github.com/yourusername/fragment)

## License

MIT
