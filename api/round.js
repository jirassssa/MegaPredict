// Vercel Serverless Function: Get Current Round Info
import { getCurrentRound, getSecondsLeftInRound, getNextRoundStartTime } from '../lib/round-manager.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Fetch current price
        const priceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const priceData = await priceResponse.json();
        const currentPrice = parseFloat(priceData.price);

        const currentRound = getCurrentRound();
        const secondsLeft = getSecondsLeftInRound();

        res.status(200).json({
            roundNumber: currentRound.roundNumber,
            startPrice: currentRound.startPrice,
            currentPrice: currentPrice,
            startTime: currentRound.startTime,
            endTime: currentRound.endTime,
            secondsLeft: secondsLeft,
            aiPrediction: currentRound.aiPrediction,
            aiConfidence: currentRound.aiConfidence,
            nextRoundTime: getNextRoundStartTime().toISOString()
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get round info' });
    }
}
