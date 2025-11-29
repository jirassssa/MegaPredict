// Vercel Cron Job: Auto-resolve rounds
import { ethers } from 'ethers';
import { getCurrentRound, getSecondsLeftInRound } from '../lib/round-manager.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('⏰ Cron: Checking if round needs resolution...');

        const currentRound = getCurrentRound();
        const secondsLeft = getSecondsLeftInRound();

        // Only resolve if less than 30 seconds left
        if (secondsLeft >= 30) {
            return res.status(200).json({
                message: 'Round not ready for resolution',
                secondsLeft
            });
        }

        // Fetch end price
        const priceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const priceData = await priceResponse.json();
        const endPrice = parseFloat(priceData.price);

        // Resolve on blockchain
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const abi = ["function resolveRound(uint256 _roundNumber, int256 _endPrice) external"];
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

        const endPriceScaled = Math.floor(endPrice * 100000000);

        const tx = await contract.resolveRound(currentRound.roundNumber, endPriceScaled, {
            gasLimit: 30000000
        });

        await tx.wait();

        const priceChange = endPrice - currentRound.startPrice;
        const actualDirection = priceChange >= 0 ? 'UP' : 'DOWN';
        const aiWasCorrect = actualDirection === currentRound.aiPrediction;

        console.log(`✅ Round ${currentRound.roundNumber} resolved`);
        console.log(`📈 ${currentRound.startPrice} → ${endPrice} (${actualDirection})`);
        console.log(`🤖 AI was ${aiWasCorrect ? 'CORRECT ✓' : 'WRONG ✗'}`);

        res.status(200).json({
            success: true,
            roundNumber: currentRound.roundNumber,
            aiWasCorrect,
            tx: tx.hash
        });
    } catch (error) {
        console.error('❌ Cron error:', error);
        res.status(500).json({ error: error.message });
    }
}

export const config = {
    maxDuration: 300,
};
