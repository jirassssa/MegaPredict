// Vercel Cron Job: Auto-start rounds at :00, :15, :30, :45
import { ethers } from 'ethers';
import { getCurrentRound, setCurrentRound, getPriceHistory, addPriceToHistory, generateAIPrediction } from '../lib/round-manager.js';

export default async function handler(req, res) {
    // Verify cron secret for security
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('⏰ Cron: Starting new round...');

        // Fetch current price
        const priceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const priceData = await priceResponse.json();
        const price = parseFloat(priceData.price);

        // Update price history
        addPriceToHistory(price);
        const priceHistory = getPriceHistory();

        // Generate AI prediction
        const ai = generateAIPrediction(priceHistory);

        // Calculate round times
        const startTime = Date.now();
        const endTime = startTime + (15 * 60 * 1000);

        const currentRound = getCurrentRound();
        const newRound = {
            roundNumber: currentRound.roundNumber + 1,
            startPrice: price,
            startTime: startTime,
            endTime: endTime,
            aiPrediction: ai.prediction,
            aiConfidence: ai.confidence,
        };

        setCurrentRound(newRound);

        // Start round on blockchain
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const abi = ["function startRound(int256 _startPrice, uint8 _aiPrediction, uint256 _aiConfidence) external"];
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

        const startPriceScaled = Math.floor(price * 100000000);
        const aiPredictionEnum = ai.prediction === 'UP' ? 1 : 2;

        const tx = await contract.startRound(startPriceScaled, aiPredictionEnum, ai.confidence, {
            gasLimit: 30000000
        });

        await tx.wait();

        console.log(`✅ Round ${newRound.roundNumber} started on blockchain`);

        res.status(200).json({
            success: true,
            round: newRound,
            tx: tx.hash
        });
    } catch (error) {
        console.error('❌ Cron error:', error);
        res.status(500).json({ error: error.message });
    }
}

export const config = {
    maxDuration: 300, // 5 minutes max execution time
};
