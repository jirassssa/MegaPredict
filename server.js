import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Store historical prices
let priceHistory = [];
let currentRound = {
    roundNumber: 1,
    startPrice: null,
    startTime: null,
    endTime: null, // When round should end
    aiPrediction: null, // 'UP' or 'DOWN'
    aiConfidence: null, // 0-100
};

// Fetch ETH/USDT price from Binance
async function fetchETHPrice() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const data = await response.json();
        return parseFloat(data.price);
    } catch (error) {
        console.error('Error fetching price:', error);
        return null;
    }
}

// AI Prediction Logic (Mock AI - using simple technical analysis)
function generateAIPrediction(recentPrices) {
    if (recentPrices.length < 3) {
        // Random prediction if not enough data
        return {
            prediction: Math.random() > 0.5 ? 'UP' : 'DOWN',
            confidence: Math.floor(Math.random() * 20) + 50 // 50-70%
        };
    }

    // Simple Moving Average (SMA) based prediction
    const sma5 = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, recentPrices.length);
    const sma10 = recentPrices.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, recentPrices.length);
    const currentPrice = recentPrices[recentPrices.length - 1];

    // Momentum
    const momentum = recentPrices[recentPrices.length - 1] - recentPrices[recentPrices.length - 3];

    // Trend strength
    let trendScore = 0;
    if (sma5 > sma10) trendScore += 1;
    if (momentum > 0) trendScore += 1;
    if (currentPrice > sma5) trendScore += 1;

    const prediction = trendScore >= 2 ? 'UP' : 'DOWN';
    const confidence = Math.min(50 + Math.abs(trendScore - 1.5) * 15, 85);

    return {
        prediction,
        confidence: Math.floor(confidence),
        sma5: sma5.toFixed(2),
        sma10: sma10.toFixed(2),
        momentum: momentum.toFixed(2)
    };
}

// Calculate next round start time (next 00, 15, 30, or 45 minute mark)
function getNextRoundStartTime() {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextMark = Math.ceil((minutes + 1) / 15) * 15;

    const nextTime = new Date(now);
    nextTime.setMinutes(nextMark);
    nextTime.setSeconds(0);
    nextTime.setMilliseconds(0);

    if (nextMark >= 60) {
        nextTime.setHours(nextTime.getHours() + 1);
        nextTime.setMinutes(0);
    }

    return nextTime;
}

// Get seconds left in current round (15 minutes from round start)
function getSecondsLeftInRound() {
    if (!currentRound.endTime) {
        return 0;
    }
    const now = Date.now();
    const timeLeft = Math.floor((currentRound.endTime - now) / 1000);
    return Math.max(0, timeLeft);
}

// API Endpoints

// Get current price
app.get('/api/price', async (req, res) => {
    const price = await fetchETHPrice();
    if (price) {
        res.json({ price, timestamp: Date.now() });
    } else {
        res.status(500).json({ error: 'Failed to fetch price' });
    }
});

// Get current round info
app.get('/api/round', async (req, res) => {
    const currentPrice = await fetchETHPrice();
    const secondsLeft = getSecondsLeftInRound();

    res.json({
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
});

// Start new round (called by cron or manually)
app.post('/api/start-round', async (req, res) => {
    const price = await fetchETHPrice();

    if (!price) {
        return res.status(500).json({ error: 'Failed to fetch price' });
    }

    // Store price history
    priceHistory.push(price);
    if (priceHistory.length > 50) {
        priceHistory = priceHistory.slice(-50); // Keep last 50 prices
    }

    // Generate AI prediction
    const ai = generateAIPrediction(priceHistory);

    // Calculate round end time (15 minutes from now)
    const startTime = Date.now();
    const endTime = startTime + (15 * 60 * 1000); // 15 minutes in milliseconds

    currentRound = {
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

    console.log(`🚀 Round ${currentRound.roundNumber} started`);
    console.log(`📊 Price: $${price}`);
    console.log(`🤖 AI Prediction: ${ai.prediction} (${ai.confidence}% confidence)`);

    res.json({
        success: true,
        round: currentRound
    });
});

// Resolve round (called after 15 minutes)
app.post('/api/resolve-round', async (req, res) => {
    const endPrice = await fetchETHPrice();

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

    res.json(result);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Initialize first round on startup
(async () => {
    const price = await fetchETHPrice();
    if (price) {
        priceHistory.push(price);
        const startTime = Date.now();
        const endTime = startTime + (15 * 60 * 1000);

        currentRound.startPrice = price;
        currentRound.startTime = startTime;
        currentRound.endTime = endTime;

        const ai = generateAIPrediction(priceHistory);
        currentRound.aiPrediction = ai.prediction;
        currentRound.aiConfidence = ai.confidence;

        console.log('🎯 Server initialized with price:', price);
        console.log('🤖 AI Prediction:', ai.prediction, `(${ai.confidence}%)`);
    }
})();

app.listen(PORT, () => {
    console.log(`🚀 MegaPredict AI Server running on http://localhost:${PORT}`);
    console.log(`📊 Tracking ETH/USDT from Binance`);
    console.log(`⏰ Rounds every 15 minutes (00, 15, 30, 45)`);
});
