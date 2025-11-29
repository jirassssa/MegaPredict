// Vercel Serverless Function: Start New Round
import { getCurrentRound, setCurrentRound, getPriceHistory, addPriceToHistory, generateAIPrediction } from '../lib/round-manager.js';

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
        // Fetch current price
        const priceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const priceData = await priceResponse.json();
        const price = parseFloat(priceData.price);

        if (!price) {
            return res.status(500).json({ error: 'Failed to fetch price' });
        }

        // Update price history
        addPriceToHistory(price);
        const priceHistory = getPriceHistory();

        // Generate AI prediction
        const ai = generateAIPrediction(priceHistory);

        // Calculate round times
        const startTime = Date.now();
        const endTime = startTime + (15 * 60 * 1000); // 15 minutes

        const currentRound = getCurrentRound();
        const newRound = {
            roundNumber: currentRound.roundNumber + 1,
            startPrice: price,
            startTime: startTime,
            endTime: endTime,
            aiPrediction: ai.prediction,
            aiConfidence: ai.confidence,
            aiAnalysis: {
                sma5: ai.sma5,
                sma10: ai.sma10,
                momentum: ai.momentum
            }
        };

        setCurrentRound(newRound);

        console.log(`🚀 Round ${newRound.roundNumber} started`);
        console.log(`📊 Price: $${price}`);
        console.log(`🤖 AI Prediction: ${ai.prediction} (${ai.confidence}% confidence)`);

        res.status(200).json({
            success: true,
            round: newRound
        });
    } catch (error) {
        console.error('Error starting round:', error);
        res.status(500).json({ error: 'Failed to start round' });
    }
}
