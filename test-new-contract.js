import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDR = "0xab0123C64Bf85F8515E89E2aC84e90Be5C850b8B";
const artifacts = JSON.parse(fs.readFileSync('./artifacts.json', 'utf8'));

async function test() {
    console.log('🧪 Testing contract:', CONTRACT_ADDR);
    
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const code = await provider.getCode(CONTRACT_ADDR);
    
    console.log('📝 Code exists:', code !== '0x');
    
    if (code === '0x') {
        console.log('❌ No contract found');
        return;
    }
    
    const contract = new ethers.Contract(CONTRACT_ADDR, artifacts.abi, provider);
    
    try {
        const roundNum = await contract.currentRoundNumber();
        console.log('✅ currentRoundNumber():', roundNum.toString());
        
        const owner = await contract.owner();
        console.log('✅ owner():', owner);
        
        console.log('\n✅ CONTRACT IS WORKING!');
        console.log('📍 Address:', CONTRACT_ADDR);
        
        // Update .env
        const env = fs.readFileSync('.env', 'utf8');
        fs.writeFileSync('.env', env.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${CONTRACT_ADDR}`));
        console.log('✅ .env updated');
        
    } catch (err) {
        console.log('❌ Error:', err.message);
    }
}

test();
