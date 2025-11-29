import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const abi = JSON.parse(fs.readFileSync('./megapredict-abi.json', 'utf8'));

async function startRound() {
    try {
        console.log('🚀 Starting first round...\n');
        
        // Get current ETH price
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const data = await res.json();
        const price = parseFloat(data.price);
        
        console.log('💰 Current ETH/USDT price:', price);
        
        // Convert to 8 decimals (contract uses int256)
        const startPrice = Math.floor(price * 100000000);
        
        // AI prediction (random for first round)
        const aiPrediction = Math.random() > 0.5 ? 1 : 2; // 1 = UP, 2 = DOWN
        const aiConfidence = Math.floor(Math.random() * 30 + 50); // 50-80%
        
        console.log('🤖 AI Prediction:', aiPrediction === 1 ? '↑ UP' : '↓ DOWN');
        console.log('📊 AI Confidence:', aiConfidence + '%\n');
        
        // Connect to contract
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
        
        console.log('📝 Calling startRound()...');
        const tx = await contract.startRound(startPrice, aiPrediction, aiConfidence);
        
        console.log('⏳ Tx hash:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        await tx.wait();
        
        console.log('\n✅ ROUND 1 STARTED!');
        console.log('📍 Start Price:', price);
        console.log('🤖 Prediction:', aiPrediction === 1 ? '↑ UP' : '↓ DOWN', `(${aiConfidence}%)`);
        console.log('⏰ Duration: 15 minutes');
        
        // Verify
        const roundNum = await contract.currentRoundNumber();
        console.log('\n✅ Current round:', roundNum.toString());
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.reason) console.error('Reason:', err.reason);
    }
}

startRound();
