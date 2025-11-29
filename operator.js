import { ethers } from 'ethers';
import fetch from 'node-fetch';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xf6A3DFB7D4D152AFCFfDf33504D57F9335E76875";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "https://timothy.megaeth.com/rpc";
const API_URL = process.env.API_URL || "http://localhost:3000";

if (!PRIVATE_KEY) {
    console.error('❌ ERROR: PRIVATE_KEY not found in .env file');
    console.error('Please create a .env file with your PRIVATE_KEY');
    process.exit(1);
}

const abi = [
    "function startRound(int256 _startPrice, uint8 _aiPrediction, uint256 _aiConfidence) external",
    "function resolveRound(uint256 _roundNumber, int256 _endPrice) external",
    "function currentRoundNumber() view returns (uint256)"
];

// Setup provider and contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

console.log('🎮 MegaPredict Operator Bot Started');
console.log('📍 Contract:', CONTRACT_ADDRESS);
console.log('🔑 Operator:', wallet.address);

// Fetch current round data from API
async function getRoundData() {
    const response = await fetch(`${API_URL}/api/round`);
    return await response.json();
}

// Start new round on blockchain
async function startRoundOnChain() {
    try {
        console.log('\n⏰ Starting new round...');

        // Trigger API to start round (generates AI prediction)
        const startRes = await fetch(`${API_URL}/api/start-round`, { method: 'POST' });
        const roundData = await startRes.json();

        if (!roundData.success) {
            console.error('❌ Failed to start round on API');
            return;
        }

        const round = roundData.round;
        console.log(`📊 Round ${round.roundNumber}`);
        console.log(`💵 Start Price: $${round.startPrice}`);
        console.log(`🤖 AI Prediction: ${round.aiPrediction} (${round.aiConfidence}% confidence)`);

        // Convert to contract format
        const startPrice = Math.floor(round.startPrice * 100000000); // 8 decimals
        const aiPrediction = round.aiPrediction === 'UP' ? 1 : 2;
        const aiConfidence = round.aiConfidence;

        // Call smart contract
        console.log('📤 Calling smart contract...');
        const tx = await contract.startRound(startPrice, aiPrediction, aiConfidence, {
            gasLimit: 30000000
        });

        console.log('⏳ Transaction sent:', tx.hash);
        await tx.wait();

        console.log('✅ Round started successfully on blockchain!');
        console.log('⏰ Round will end in 15 minutes at', round.roundNumber);

    } catch (error) {
        console.error('❌ Error starting round:', error.message);
    }
}

// Resolve round on blockchain
async function resolveRoundOnChain(roundNumber) {
    try {
        console.log(`\n🔍 Resolving round ${roundNumber}...`);

        // Get end price from API
        const resolveRes = await fetch(`${API_URL}/api/resolve-round`, { method: 'POST' });
        const result = await resolveRes.json();

        console.log(`📊 Round ${result.roundNumber}`);
        console.log(`💵 Start: $${result.startPrice} → End: $${result.endPrice}`);
        console.log(`📈 Price ${result.actualDirection}`);
        console.log(`🤖 AI was ${result.aiWasCorrect ? 'CORRECT ✓' : 'WRONG ✗'}`);

        // Convert to contract format
        const endPrice = Math.floor(result.endPrice * 100000000); // 8 decimals

        // Call smart contract
        console.log('📤 Calling smart contract to resolve...');
        const tx = await contract.resolveRound(roundNumber, endPrice, {
            gasLimit: 30000000
        });

        console.log('⏳ Transaction sent:', tx.hash);
        await tx.wait();

        console.log('✅ Round resolved successfully!');
        console.log(`💰 Winners: ${result.aiWasCorrect ? 'FOLLOW AI' : 'AGAINST AI'}`);

    } catch (error) {
        console.error('❌ Error resolving round:', error.message);
    }
}

// Check if we need to resolve current round
async function checkAndResolve() {
    try {
        const currentRound = await contract.currentRoundNumber();
        const roundNum = currentRound.toNumber();

        if (roundNum > 0) {
            const roundData = await getRoundData();

            // If round ended (less than 30 seconds left), resolve it
            if (roundData.secondsLeft < 30 && roundData.secondsLeft >= 0) {
                console.log('⏰ Round ending soon, resolving...');
                await resolveRoundOnChain(roundNum);
            }
        }
    } catch (error) {
        console.error('Error checking round:', error.message);
    }
}

// Cron jobs for automatic operation
// Start new round at 00, 15, 30, 45 minutes
cron.schedule('0,15,30,45 * * * *', async () => {
    console.log('\n🔔 Cron triggered: Starting new round');
    await startRoundOnChain();
});

// Check every minute if we need to resolve
cron.schedule('* * * * *', async () => {
    await checkAndResolve();
});

// Manual commands via process
process.stdin.on('data', async (data) => {
    const command = data.toString().trim();

    if (command === 'start') {
        await startRoundOnChain();
    } else if (command === 'resolve') {
        const currentRound = await contract.currentRoundNumber();
        await resolveRoundOnChain(currentRound.toNumber());
    } else if (command === 'status') {
        const roundData = await getRoundData();
        console.log('\n📊 Current Status:');
        console.log('Round:', roundData.roundNumber);
        console.log('Price:', roundData.currentPrice);
        console.log('AI Prediction:', roundData.aiPrediction, `(${roundData.aiConfidence}%)`);
        console.log('Time Left:', Math.floor(roundData.secondsLeft / 60), 'min', roundData.secondsLeft % 60, 'sec');
    }
});

console.log('\n📝 Commands:');
console.log('  start   - Start new round manually');
console.log('  resolve - Resolve current round manually');
console.log('  status  - Show current status');
console.log('\n⏰ Automatic rounds will start at :00, :15, :30, :45');
console.log('💡 Type "start" to begin the first round now\n');
