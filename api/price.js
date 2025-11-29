// Vercel Serverless Function: Get ETH/USDT Price
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
        const data = await response.json();

        res.status(200).json({
            price: parseFloat(data.price),
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error fetching price:', error);
        res.status(500).json({ error: 'Failed to fetch price' });
    }
}
