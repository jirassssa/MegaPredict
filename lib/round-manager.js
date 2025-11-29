// Shared round state management using Vercel KV or in-memory (for demo)
// In production, use Vercel KV or Redis

let currentRound = {
    roundNumber: 1,
    startPrice: null,
    startTime: null,
    endTime: null,
    aiPrediction: null,
    aiConfidence: null,
};

let priceHistory = [];

// AI Prediction Logic
export function generateAIPrediction(recentPrices) {
    if (recentPrices.length < 3) {
        return {
            prediction: Math.random() > 0.5 ? 'UP' : 'DOWN',
            confidence: Math.floor(Math.random() * 20) + 50
        };
    }

    const sma5 = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, recentPrices.length);
    const sma10 = recentPrices.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, recentPrices.length);
    const currentPrice = recentPrices[recentPrices.length - 1];
    const momentum = recentPrices[recentPrices.length - 1] - recentPrices[recentPrices.length - 3];

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

export function getCurrentRound() {
    return currentRound;
}

export function setCurrentRound(round) {
    currentRound = round;
}

export function getPriceHistory() {
    return priceHistory;
}

export function addPriceToHistory(price) {
    priceHistory.push(price);
    if (priceHistory.length > 50) {
        priceHistory = priceHistory.slice(-50);
    }
}

export function getSecondsLeftInRound() {
    if (!currentRound.endTime) {
        return 0;
    }
    const now = Date.now();
    const timeLeft = Math.floor((currentRound.endTime - now) / 1000);
    return Math.max(0, timeLeft);
}

export function getNextRoundStartTime() {
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
