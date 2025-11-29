import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://timothy.megaeth.com/rpc";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const abi = [
    "function currentRoundNumber() view returns (uint256)",
    "function getRound(uint256) view returns (uint256 startTime, uint256 endTime, int256 startPrice, int256 endPrice, uint8 aiPrediction, uint256 aiConfidence, bool resolved, uint256 totalFollowAI, uint256 totalAgainstAI, uint256 rewardAmount)"
];

async function checkContract() {
    try {
        console.log('🔍 Checking contract:', CONTRACT_ADDRESS);
        console.log('🌐 RPC:', RPC_URL);
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
        
        // Check if contract exists
        const code = await provider.getCode(CONTRACT_ADDRESS);
        console.log('📝 Contract code length:', code.length);
        
        if (code === '0x') {
            console.log('❌ No contract found at this address!');
            return;
        }
        
        // Try to call currentRoundNumber
        console.log('\n📞 Calling currentRoundNumber()...');
        const roundNum = await contract.currentRoundNumber();
        console.log('✅ Current round number:', roundNum.toString());
        
        if (roundNum > 0n) {
            console.log('\n📞 Getting round data...');
            const round = await contract.getRound(roundNum);
            console.log('Round data:', round);
        }
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Full error:', err);
    }
}

checkContract();
