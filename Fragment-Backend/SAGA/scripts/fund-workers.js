/**
 * Fund worker wallets with MENT for gas
 */

import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('💰 Funding Worker Wallets with MENT...\n');
  
  // Read worker wallets
  const workers = JSON.parse(fs.readFileSync('worker-wallets.json', 'utf-8'));
  
  // Connect to Fragment Chainlet
  const rpcUrl = process.env.SAGA_RPC_URL || 'https://fragment-4k20f-52f28-87b38-3a18a1.rpc.caldera.xyz/http';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Main wallet (funder)
  const privateKey = process.env.PRIVATE_KEY || process.env.FRAGMENT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in .env');
  }
  const funderWallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`🔑 Funder: ${funderWallet.address}`);
  const balance = await provider.getBalance(funderWallet.address);
  console.log(`💰 Funder balance: ${ethers.formatEther(balance)} MENT\n`);
  
  // Fund each worker with 100 MENT
  const fundAmount = ethers.parseEther('100');
  
  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    
    try {
      console.log(`Worker ${worker.id}: ${worker.address}`);
      
      // Check current balance
      const currentBalance = await provider.getBalance(worker.address);
      console.log(`  Current: ${ethers.formatEther(currentBalance)} MENT`);
      
      if (currentBalance < ethers.parseEther('50')) {
        // Fund the worker
        console.log(`  Sending ${ethers.formatEther(fundAmount)} MENT...`);
        const tx = await funderWallet.sendTransaction({
          to: worker.address,
          value: fundAmount
        });
        
        console.log(`  TX: ${tx.hash}`);
        await tx.wait();
        
        const newBalance = await provider.getBalance(worker.address);
        console.log(`  ✅ New balance: ${ethers.formatEther(newBalance)} MENT\n`);
      } else {
        console.log(`  ✅ Already funded\n`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error funding worker ${worker.id}:`, error.message);
    }
  }
  
  console.log('✅ All workers funded!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

