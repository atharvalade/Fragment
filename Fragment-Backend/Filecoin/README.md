# Fragment Filecoin Service

Filecoin integration for Fragment using Synapse SDK to store and retrieve task fragments.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your Filecoin Calibration private key:

```bash
cp .env.example .env
# Edit .env and add your private key
```

### 3. Get Test Tokens

You need test tokens for Filecoin Calibration network:

**Get tFIL (for gas fees):**
- Visit: https://faucet.calibnet.chainsafe-fil.io/funds.html
- Enter your wallet address
- Request tFIL tokens

**Get USDFC (for storage payments):**
- Visit: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
- Enter your wallet address
- Request USDFC tokens

## Testing

### Upload Test

Upload each sentence from `test-sentences.csv` to Filecoin:

```bash
npm run test:upload
```

This will:
1. Connect to Filecoin Calibration network
2. Check/setup payment account
3. Upload each sentence individually
4. Save results to `upload-results.json` with CIDs

### Download Test

Download and verify sentences from Filecoin:

```bash
npm run test:download
```

This will:
1. Read CIDs from `upload-results.json`
2. Download each sentence from Filecoin
3. Verify content matches original
4. Display download times

## How It Works

### Data Format

Each sentence is wrapped in JSON before upload:
```json
{
  "id": 0,
  "text": "The actual sentence text",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

The data is padded to meet Filecoin's minimum size requirement of 127 bytes.

### Upload Process

1. Parse CSV file
2. For each sentence:
   - Wrap in JSON with metadata
   - Encode to bytes
   - Upload to Filecoin via Synapse SDK
   - Store CID for later retrieval

### Download Process

1. Use CID to fetch data from Filecoin
2. Decode bytes to text
3. Parse JSON to extract sentence
4. Verify against original

## File Structure

```
Filecoin/
├── test-sentences.csv      # Input: sentences for testing
├── test-upload.js          # Script to upload to Filecoin
├── test-download.js        # Script to download from Filecoin
├── upload-results.json     # Output: CIDs and metadata
├── package.json
├── .env                    # Your private key (DO NOT COMMIT)
└── .env.example            # Template for .env
```

## Next Steps

After successful testing:
1. ✅ Filecoin integration working
2. 🔄 Integrate with SAGA smart contract
3. 🤖 Add AI inference worker
4. 🎯 Build result aggregation

## Troubleshooting

**Error: Insufficient USDFC balance**
- Get more USDFC from the faucet
- Each upload costs a small amount

**Error: Transaction failed**
- Check you have tFIL for gas fees
- Verify you're on Calibration network

**Error: Upload timeout**
- Filecoin network may be slow
- Try again or check network status

