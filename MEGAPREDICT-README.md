# 🎯 MegaPredict - AI Prediction Market

AI-powered prediction market inspired by Allora x PancakeSwap, built on MegaETH Testnet.

## 🎯 Concept

- **Real ETH/USDT prices** from Binance API
- **AI predicts** price movement (UP or DOWN) every 15 minutes
- **Players bet** whether to **Follow AI** or **Against AI**
- **Winners share** the losing side's pool (minus 2% fee)
- **Rounds** start automatically at **:00, :15, :30, :45** every hour

## 📋 Architecture

```
┌─────────────────┐
│  Binance API    │ ← Real ETH/USDT prices
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend API    │ ← AI Prediction Engine
│  (Node.js)      │   (SMA + Momentum analysis)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Smart Contract │ ← Prize Pool & Payouts
│  (MegaPredict)  │   (MegaETH Testnet)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │ ← User Interface
│ (megapredict.html) │
└─────────────────┘
```

## 🚀 Deployed Contracts

- **MegaPredict Contract:** `0xf6A3DFB7D4D152AFCFfDf33504D57F9335E76875`
- **Network:** MegaETH Timothy Testnet (Chain ID: 6343)
- **Explorer:** https://megaeth-testnet-v2.blockscout.com/address/0xf6A3DFB7D4D152AFCFfDf33504D57F9335E76875

## 🛠️ Setup & Run

### 1. Install Dependencies

```bash
npm install
```

### 2. Start API Server (Terminal 1)

```bash
npm run server
```

This starts the backend API on `http://localhost:3000` which:
- Fetches ETH/USDT prices from Binance
- Generates AI predictions using technical analysis
- Provides round data to frontend

### 3. Start Operator Bot (Terminal 2)

```bash
npm run operator
```

This starts the operator bot which:
- Automatically starts new rounds at :00, :15, :30, :45
- Resolves rounds after 15 minutes
- Distributes prizes to winners

**Commands:**
- `start` - Manually start a new round
- `resolve` - Manually resolve current round
- `status` - Show current round status

### 4. Open Frontend

Open `megapredict.html` in your browser:

```bash
open megapredict.html
# or
python3 -m http.server 8000
# then visit http://localhost:8000/megapredict.html
```

## 🎮 How to Play

1. **Connect Wallet** - Click "Connect Wallet" button
   - MetaMask will automatically add MegaETH Timothy Testnet

2. **Check AI Prediction** - See what AI predicts (UP or DOWN)
   - AI confidence level shown (50-85%)

3. **Place Your Bet** (0.001 ETH)
   - 🤖 **Follow AI** - Bet that AI is correct
   - ⚔️ **Against AI** - Bet against AI prediction

4. **Wait 15 Minutes** - Round closes automatically

5. **Collect Winnings** - If you win:
   - Winners split the entire prize pool proportionally
   - Instant payout on MegaETH!

## 🤖 How AI Works

The AI uses simple technical analysis:

1. **SMA (Simple Moving Average)**
   - 5-period SMA vs 10-period SMA

2. **Momentum**
   - Recent price movement direction

3. **Trend Analysis**
   - Current price vs moving averages

4. **Confidence Score**
   - Based on strength of signals (50-85%)

**Note:** This is a DEMO AI for testing. In production, you would integrate with real AI models like Allora Network.

## 📊 API Endpoints

### GET `/api/round`
Get current round information

**Response:**
```json
{
  "roundNumber": 1,
  "startPrice": 3003.01,
  "currentPrice": 3003.58,
  "secondsLeft": 850,
  "aiPrediction": "UP",
  "aiConfidence": 75,
  "nextRoundTime": "2025-11-29T08:00:00.000Z"
}
```

### GET `/api/price`
Get current ETH/USDT price

### POST `/api/start-round`
Start a new round (operator only)

### POST `/api/resolve-round`
Resolve current round (operator only)

## 💎 Prize Pool Mechanics

### Fee Structure
- **Treasury Fee:** 2% of total pool
- **Prize Pool:** 98% distributed to winners

### Payout Formula
```
Your Payout = (Your Bet / Winning Pool) × Total Prize Pool
```

### Example:
- Total UP bets: 1 ETH (10 players × 0.1 ETH)
- Total DOWN bets: 0.5 ETH (5 players × 0.1 ETH)
- Total Pool: 1.5 ETH
- Prize Pool: 1.47 ETH (after 2% fee)

**If price goes UP (AI predicted UP):**
- UP bettors win!
- Each 0.1 ETH bet gets: `(0.1 / 1.0) × 1.47 = 0.147 ETH`
- **ROI: 47% profit**

## 🔐 Security Notes

- Contract is deployed with test private key for demo
- **DO NOT use this setup in production**
- Implement proper key management (AWS KMS, Hardware wallet, etc.)
- Add operator access control
- Consider using Chainlink VRF for randomness if needed

## 🛠️ Manual Operations

### Start a Round Manually

```bash
# In operator terminal, type:
start
```

### Resolve a Round Manually

```bash
# In operator terminal, type:
resolve
```

### Check Contract State

```bash
cast call 0x73DFfb81CE556160854A844D5dbD23d2B35f2755 "currentRoundNumber()(uint256)" --rpc-url https://timothy.megaeth.com/rpc
```

### Check Round Info

```bash
cast call 0x73DFfb81CE556160854A844D5dbD23d2B35f2755 "getRound(uint256)(uint256,uint256,int256,int256,uint8,uint256,bool,uint256,uint256,uint256)" 1 --rpc-url https://timothy.megaeth.com/rpc
```

## 📈 Monitoring

### Watch Server Logs
```bash
# Terminal 1 (API Server)
npm run server

# Terminal 2 (Operator)
npm run operator
```

### Check API Health
```bash
curl http://localhost:3000/health
```

### Get Current Round Data
```bash
curl http://localhost:3000/api/round | jq
```

## 🎨 UI Features

- **Real-time Price Updates** - Live ETH/USDT from Binance
- **AI Prediction Display** - See AI's prediction with confidence
- **15-Minute Countdown** - Animated timer bar
- **Prize Pool Visualization** - See total pool and both sides
- **Payout Multipliers** - Live multiplier calculation
- **Auto Network Switch** - One-click MegaETH connection

## 🚧 Roadmap / Improvements

- [ ] Integrate real Allora Network AI
- [ ] Add historical round data
- [ ] Leaderboard for top players
- [ ] Multi-asset support (BTC, SOL, etc.)
- [ ] Mobile responsive UI
- [ ] Claim all rounds at once
- [ ] Discord/Telegram bot notifications
- [ ] Advanced charts (TradingView)

## 💡 Credits

Inspired by:
- [Allora Network](https://www.allora.network/)
- [PancakeSwap Prediction Market](https://pancakeswap.finance/prediction)

Built on:
- [MegaETH](https://www.megaeth.com/) - Ultra-fast EVM blockchain
- [Binance API](https://developers.binance.com/) - Real-time crypto prices

## 📞 Support

For issues or questions:
1. Check operator bot logs
2. Check API server logs
3. Verify contract on block explorer
4. Test with small amounts first

---

**⚠️ DISCLAIMER:** This is a DEMO for educational purposes. Do not use real funds. Cryptocurrency trading and prediction markets involve risk.
