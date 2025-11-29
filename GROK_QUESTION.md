# Question for Grok AI Expert

## Problem Summary
I deployed a Web3 prediction market app on Vercel, but the frontend can't fetch data from the blockchain properly. The app shows:
- AI Prediction: "Loading AI..." (stuck forever)
- Round Timer: "00:00" (not counting down)
- Follow AI / Against AI buttons are disabled (can't click)

The price from Binance WebSocket works fine, but everything else is broken.

---

## Technical Stack
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **Blockchain**: MegaETH Timothy Testnet (Chain ID: 6343)
- **RPC**: https://timothy.megaeth.com/rpc
- **Contract**: `0xf6A3DFB7D4D152AFCFfDf33504D57F9335E76875`
- **Deployment**: Vercel (serverless functions)
- **Library**: ethers.js v5.7.2

---

## What Works
✅ **Binance WebSocket**: Real-time ETH/USDT price displays correctly
✅ **Vercel Authentication**: Disabled, site loads without login
✅ **Wallet Connection**: MetaMask connects to MegaETH Timothy Testnet

---

## What Doesn't Work
❌ **AI Prediction**: Shows "Loading AI..." indefinitely
❌ **Round Timer**: Shows "00:00" instead of counting down from 15:00
❌ **Buttons**: "Follow AI" and "Against AI" buttons are disabled
❌ **Start Price**: Shows "--" instead of actual price
❌ **Round Number**: Shows "--" instead of "1"

---

## Current Code Structure

### Frontend Flow:
```javascript
1. connectBinanceWebSocket() → ✅ Works (price updates)
2. fetchRoundData() → ❌ Fails (API returns 404/401)
3. fetchRoundDataFromBlockchain() → ❌ Should work but doesn't
4. fetchContractData() → ❌ Not being called properly
```

### Key Code Snippet (megapredict.html):

```javascript
// Auto-detect API URL
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

// Fetch round data with fallback
async function fetchRoundData() {
    try {
        const res = await fetch(`${API_URL}/api/round`);
        if (!res.ok) throw new Error('API not available');

        const data = await res.json();
        // Update UI with API data...

    } catch (err) {
        console.error('API failed, using blockchain data:', err);
        await fetchRoundDataFromBlockchain();
    }
}

// Fallback: Fetch from blockchain
async function fetchRoundDataFromBlockchain() {
    if (!contract) return; // ⚠️ contract might be undefined!

    try {
        const roundNum = await contract.currentRoundNumber();
        const round = await contract.getRound(roundNum);

        // Update AI prediction
        const aiPrediction = parseInt(round.aiPrediction);
        if (aiPrediction === 1) {
            document.getElementById('aiPrediction').innerHTML = '↑ PRICE UP';
        } else if (aiPrediction === 2) {
            document.getElementById('aiPrediction').innerHTML = '↓ PRICE DOWN';
        }

        // Update timer
        const endTime = parseInt(round.endTime);
        const now = Math.floor(Date.now() / 1000);
        const seconds = Math.max(0, endTime - now);
        // ... update UI

    } catch (err) {
        console.error('Blockchain fetch failed:', err);
        // Set defaults (but this shouldn't happen)
    }
}

// Contract initialization
async function connectWallet() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: '0x18C7',
                chainName: 'MegaETH Timothy Testnet',
                rpcUrls: ['https://timothy.megaeth.com/rpc'],
                // ...
            }]
        });
    }

    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    await fetchContractData();
}

// Initial calls
connectBinanceWebSocket();
loadHistory();
fetchRoundData();
setInterval(fetchRoundData, 2000);
```

---

## Suspected Issues

### Issue #1: Contract not initialized before fetchRoundDataFromBlockchain()
- `fetchRoundData()` is called on page load
- API fails → calls `fetchRoundDataFromBlockchain()`
- But `contract` is still `undefined` because user hasn't connected wallet yet
- **Result**: Fallback silently fails

### Issue #2: Vercel Serverless API Functions return 404
- `/api/round` endpoint exists but returns 404 on Vercel
- Works locally with `npm run server`
- Vercel might not be serving the `/api/` functions correctly

### Issue #3: Race condition
- `fetchRoundData()` starts immediately
- User clicks "Connect Wallet" later
- By the time wallet connects, the fetch has already failed

---

## What I've Tried

1. ✅ **Disabled Vercel Authentication** (was causing 401 errors)
2. ✅ **Added Binance WebSocket** for price (works perfectly)
3. ✅ **Created fallback to blockchain** (but doesn't trigger properly)
4. ✅ **Set Environment Variables** on Vercel (PRIVATE_KEY, CONTRACT_ADDRESS, RPC_URL)
5. ❌ **Tried deploying multiple times** (same issue)

---

## Questions for Grok

### Main Question:
**How do I make the frontend fetch round data from the blockchain when Vercel API endpoints fail, WITHOUT requiring the user to connect their wallet first?**

### Specific Questions:

1. **Can I use a read-only provider (without wallet) to fetch blockchain data?**
   ```javascript
   // Example: Use public RPC without MetaMask
   const provider = new ethers.providers.JsonRpcProvider('https://timothy.megaeth.com/rpc');
   const contract = new ethers.Contract(ADDRESS, abi, provider); // ← No signer needed?
   ```

2. **Why do Vercel API endpoints return 404?**
   - File structure:
     ```
     /api/round.js          ← Serverless function
     /api/price.js
     /public/index.html
     /vercel.json           ← Config file
     ```
   - Is there a special Vercel config needed?

3. **Should I initialize a read-only contract on page load?**
   ```javascript
   // Initialize immediately (no wallet needed)
   const readOnlyProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
   const readOnlyContract = new ethers.Contract(ADDRESS, abi, readOnlyProvider);

   // Then use this for fetching data
   async function fetchRoundDataFromBlockchain() {
       const round = await readOnlyContract.getRound(1);
       // ...
   }
   ```

4. **How to handle the case where no round has been started yet?**
   - Contract might not have any rounds
   - `currentRoundNumber()` might return 0
   - How to display UI gracefully?

---

## Expected Behavior

When user opens the site (before connecting wallet):
1. ✅ Show real-time ETH/USDT price from Binance WebSocket
2. ✅ Show AI prediction from blockchain (e.g., "↑ PRICE UP 65%")
3. ✅ Show countdown timer (e.g., "14:35")
4. ✅ Show current round number (e.g., "Round #1")
5. ✅ Show start price (e.g., "$3,003.01")
6. ❌ Buttons stay disabled (correct - need wallet to bet)

After user clicks "Connect Wallet":
7. ✅ Buttons become enabled
8. ✅ Can place predictions

---

## Sample Working Code (Localhost)

This works on localhost when API server is running:

```bash
# Terminal 1: Start API
npm run server

# Terminal 2: Start operator (starts rounds)
npm run operator
> Type: start
```

Then frontend fetches from `http://localhost:3000/api/round` successfully.

**But on Vercel**, the `/api/round` endpoint doesn't work, and the blockchain fallback doesn't trigger properly.

---

## Request for Grok

Please provide:

1. **✅ Working code example** for fetching blockchain data without wallet
2. **✅ Vercel configuration** to fix API endpoints (if needed)
3. **✅ Proper initialization flow** (what to call on page load vs after wallet connect)
4. **✅ Error handling** for edge cases (no rounds, RPC down, etc.)
5. **✅ Full code snippet** I can copy-paste to fix this issue

---

## Additional Context

- **Local development works perfectly**
- **Vercel deployment shows UI but no data**
- **Contract is deployed and working** (verified on MegaETH explorer)
- **No console errors** (just silent failures)

Please help fix this! I need the frontend to display blockchain data even before wallet connection.

---

## Contract ABI (relevant functions)

```javascript
const abi = [
    "function currentRoundNumber() view returns (uint256)",
    "function getRound(uint256) view returns (uint256 startTime, uint256 endTime, int256 startPrice, int256 endPrice, uint8 aiPrediction, uint256 aiConfidence, bool resolved, uint256 totalFollowAI, uint256 totalAgainstAI, uint256 rewardAmount)",
    "function placeBet(bool followAI) external payable"
];
```

---

## Deployment URLs

- **Production**: https://mega2-ig3k772xp-jirassssas-projects.vercel.app
- **GitHub**: https://github.com/jirassssa/MegaPredict
- **Contract**: https://megaeth-testnet-v2.blockscout.com/address/0xf6A3DFB7D4D152AFCFfDf33504D57F9335E76875

Thank you for your help! 🙏
