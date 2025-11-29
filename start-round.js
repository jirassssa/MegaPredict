import { ethers } from 'ethers';
import fetch from 'node-fetch';
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
    "function currentRoundNumber() view returns (uint256)"
];

async function startFirstRound() {
    console.log('🎮 Starting First Round on MegaPredict\n');

    // Setup
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    console.log('📍 Contract:', CONTRACT_ADDRESS);
    console.log('🔑 Operator:', wallet.address);

    // Get current round
    const currentRound = await contract.currentRoundNumber();
    console.log('📊 Current Round Number:', currentRound.toString());

    if (currentRound.toNumber() > 0) {
        console.log('⚠️  Round already started!');
        process.exit(0);
    }

    // Call API to generate round data
    console.log('\n📡 Fetching round data from API...');
    const response = await fetch(`${API_URL}/api/start-round`, { method: 'POST' });
    const data = await response.json();

    if (!data.success) {
        console.error('❌ Failed to get round data');
        process.exit(1);
    }

    const round = data.round;
    console.log(`\n📊 Round ${round.roundNumber}`);
    console.log(`💵 Start Price: $${round.startPrice}`);
    console.log(`🤖 AI Prediction: ${round.aiPrediction} (${round.aiConfidence}% confidence)`);

    // Convert to contract format
    const startPrice = Math.floor(round.startPrice * 100000000); // 8 decimals
    const aiPrediction = round.aiPrediction === 'UP' ? 1 : 2;

    // Start round on blockchain
    console.log('\n📤 Starting round on blockchain...');
    const tx = await contract.startRound(
        startPrice,
        aiPrediction,
        round.aiConfidence,
        { gasLimit: 30000000 }
    );

    console.log('⏳ Transaction:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    await tx.wait();

    console.log('\n✅ Round started successfully!');
    console.log('🎮 Players can now place bets!');
    console.log('⏰ Round will end in 15 minutes');
    console.log('\n🌐 Open megapredict.html to start playing!');
}

startFirstRound().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
