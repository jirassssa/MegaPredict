// Vercel Serverless Function: Resolve Round
import { getCurrentRound } from '../lib/round-manager.js';

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
        // Fetch end price
        const priceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const priceData = await priceResponse.json();
        const endPrice = parseFloat(priceData.price);

        const currentRound = getCurrentRound();

        if (!endPrice || !currentRound.startPrice) {
            return res.status(500).json({ error: 'Cannot resolve round' });
        }

        const priceChange = endPrice - currentRound.startPrice;
        const actualDirection = priceChange >= 0 ? 'UP' : 'DOWN';
        const aiWasCorrect = actualDirection === currentRound.aiPrediction;

        const result = {
            roundNumber: currentRound.roundNumber,
            startPrice: currentRound.startPrice,
            endPrice: endPrice,
            priceChange: priceChange.toFixed(2),
            actualDirection: actualDirection,
            aiPrediction: currentRound.aiPrediction,
            aiWasCorrect: aiWasCorrect,
            timestamp: Date.now()
        };

        console.log(`✅ Round ${currentRound.roundNumber} resolved`);
        console.log(`📈 ${currentRound.startPrice} → ${endPrice} (${actualDirection})`);
        console.log(`🤖 AI was ${aiWasCorrect ? 'CORRECT ✓' : 'WRONG ✗'}`);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error resolving round:', error);
        res.status(500).json({ error: 'Failed to resolve round' });
    }
}
