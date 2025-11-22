# Complete Setup Guide - Filecoin Calibration Testnet

## Step 1: Install MetaMask (if not already installed)

1. Go to https://metamask.io/
2. Click "Download" and install the browser extension
3. Create a new wallet or import an existing one
4. **IMPORTANT**: Save your seed phrase securely!

## Step 2: Add Filecoin Calibration Network to MetaMask

### Option A: Automatic (Easiest)

1. Visit: https://chainlist.org/chain/314159
2. Click "Connect Wallet" (top right)
3. Approve MetaMask connection
4. Click "Add to MetaMask" button for Filecoin Calibration
5. Approve the network addition in MetaMask

### Option B: Manual

1. Open MetaMask
2. Click the network dropdown (top left)
3. Click "Add Network" → "Add a network manually"
4. Enter these details:

```
Network Name: Filecoin Calibration
New RPC URL: https://api.calibration.node.glif.io/rpc/v1
Chain ID: 314159
Currency Symbol: tFIL
Block Explorer URL: https://calibration.filfox.info/en
```

5. Click "Save"
6. Switch to Filecoin Calibration network

## Step 3: Get Your Wallet Address

1. Open MetaMask
2. Make sure you're on "Filecoin Calibration" network
3. Click your account name to copy your wallet address
   - It looks like: `0x1234567890abcdef...`
4. Keep this handy - you'll need it for faucets!

## Step 4: Get tFIL Tokens (for gas fees)

### Via Faucet:

1. Go to: **https://faucet.calibnet.chainsafe-fil.io/funds.html**

2. Paste your wallet address (from Step 3)

3. Click "Send Funds" or "Request"

4. Wait 30-60 seconds

5. Check MetaMask - you should see tFIL appear!
   - You should receive ~5-10 tFIL
   - This is enough for hundreds of transactions

### Alternative Faucets (if first one fails):

- https://faucet.calibration.fildev.network/
- https://calibration.filutils.com/en/faucet

## Step 5: Get USDFC Tokens (for storage payments)

### Via Faucet:

1. Go to: **https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc**

2. Paste your wallet address

3. Click "Request USDFC"

4. Wait for transaction to complete

5. You should receive test USDFC tokens

### Check Your USDFC Balance:

USDFC is an ERC-20 token, so you need to add it to MetaMask:

1. Open MetaMask (make sure you're on Filecoin Calibration network)
2. Click "Assets" tab
3. Scroll down and click "Import tokens"
4. Enter USDFC token contract address:
   ```
   0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0
   ```
5. Token Symbol: `USDFC`
6. Decimals: `18`
7. Click "Add custom token" → "Import Tokens"
8. You should now see your USDFC balance!

## Step 6: Export Your Private Key

**⚠️ SECURITY WARNING**: Never share your private key or commit it to git!

1. Open MetaMask
2. Click the three dots (top right)
3. Click "Account details"
4. Click "Show private key"
5. Enter your MetaMask password
6. Click and hold "Hold to reveal Private Key"
7. Copy the private key (starts with `0x`)

## Step 7: Create .env File

1. In the Filecoin folder, create a `.env` file:

```bash
cd "/Users/atharvalade/Documents/Hackathon Projects/Fragment/Fragment-Backend/Filecoin"
cp .env.example .env
```

2. Open `.env` in your editor

3. Replace `your_private_key_here` with your actual private key:

```env
# Filecoin Calibration Network Configuration
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Filecoin Network
NETWORK=calibration
```

4. Save the file

5. **Double-check**: Make sure `.env` is in your `.gitignore`!

## Step 8: Verify Setup

Run this quick check:

```bash
# Install dependencies (if not done already)
npm install

# Check your setup
node -e "
import dotenv from 'dotenv';
dotenv.config();
console.log('✅ Private key loaded:', process.env.PRIVATE_KEY ? 'YES' : 'NO');
console.log('✅ Key length:', process.env.PRIVATE_KEY?.length || 0);
"
```

Expected output:
```
✅ Private key loaded: YES
✅ Key length: 66
```

## Step 9: Run the Upload Test!

```bash
npm run test:upload
```

If everything is set up correctly, you'll see:
```
🚀 Starting Filecoin upload test...
📡 Connecting to Filecoin Calibration network...
✅ Connected to Filecoin Calibration

💰 Checking wallet balance...
   Wallet: 0xYourAddress...
   USDFC Balance: 100.0
   Payment Account Balance: 0.0 USDFC

💳 Setting up payment account...
   Depositing 2.5 USDFC and approving Warm Storage...
✅ Payment setup complete!

📄 Reading CSV file...
   Found 5 sentences

📤 Uploading sentences to Filecoin...

[1/5] Uploading: "This is a great product, I love it!"
   ✅ Uploaded in 234ms
   📦 CID: baga6ea4seaq...
   📏 Size: 127 bytes
...
```

## Troubleshooting

### ❌ "Insufficient tFIL balance"
- Make sure you completed Step 4
- Check MetaMask shows tFIL balance
- Try requesting from alternative faucets

### ❌ "Insufficient USDFC balance"
- Make sure you completed Step 5
- Check you added USDFC token to MetaMask
- Try requesting from faucet again

### ❌ "Private key not found"
- Make sure `.env` file exists
- Check the private key starts with `0x`
- Make sure you're in the correct directory

### ❌ "Transaction failed"
- Check you have enough tFIL for gas
- Wait a minute and try again (network might be busy)
- Check Filecoin Calibration network status

### ❌ "Cannot find module"
- Run `npm install` again
- Delete `node_modules` and run `npm install`

## Quick Reference

### Important URLs

| Resource | URL |
|----------|-----|
| **Add Network** | https://chainlist.org/chain/314159 |
| **tFIL Faucet** | https://faucet.calibnet.chainsafe-fil.io/funds.html |
| **USDFC Faucet** | https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc |
| **Block Explorer** | https://calibration.filfox.info/en |
| **RPC URL** | https://api.calibration.node.glif.io/rpc/v1 |

### Network Details

```
Network: Filecoin Calibration (Testnet)
Chain ID: 314159
Currency: tFIL (test tokens)
Storage Token: USDFC (test tokens)
```

---

## ✅ Checklist

Before running the upload test, make sure:

- [ ] MetaMask installed and wallet created
- [ ] Filecoin Calibration network added to MetaMask
- [ ] tFIL tokens received (check MetaMask)
- [ ] USDFC tokens received (add token to MetaMask to see)
- [ ] Private key exported from MetaMask
- [ ] `.env` file created with private key
- [ ] `npm install` completed successfully
- [ ] You're in the Filecoin directory

**Ready?** Run `npm run test:upload` and watch the magic happen! 🚀

