import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDR = "0x59a68Ed434ce9CB4bc14f19267e94e834420eE09";
const artifacts = JSON.parse(fs.readFileSync('./artifacts.json', 'utf8'));

async function test() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    console.log('🔍 Testing contract:', CONTRACT_ADDR);
    
    // Check code
    const code = await provider.getCode(CONTRACT_ADDR);
    console.log('📝 Code length:', code.length);
    
    if (code === '0x') {
        console.log('❌ No contract deployed');
        return;
    }
    
    // Try to call
    const contract = new ethers.Contract(CONTRACT_ADDR, artifacts.abi, provider);
    
    try {
        const roundNum = await contract.currentRoundNumber();
        console.log('✅ currentRoundNumber():', roundNum.toString());
        
        const owner = await contract.owner();
        console.log('✅ owner():', owner);
        
        console.log('\n✅ Contract is working!');
        console.log('📍 Use this address:', CONTRACT_ADDR);
        
    } catch (err) {
        console.log('❌ Contract call failed:', err.message);
    }
}

test();
