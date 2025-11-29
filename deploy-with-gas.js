import fs from 'fs';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const abi = JSON.parse(fs.readFileSync('./abi.json', 'utf8'));

async function deploy() {
    try {
        console.log('🚀 Deploying with manual gas settings...\n');

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        console.log('📝 Account:', wallet.address);
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');

        // Read compiled bytecode
        const compiledContract = JSON.parse(fs.readFileSync('./abi.json', 'utf8'));
        
        // Get bytecode from solc output
        const source = fs.readFileSync('./contracts/MegaPredict.sol', 'utf8');
        
        // Use pre-compiled bytecode from artifacts if exists
        let bytecode;
        try {
            const artifacts = JSON.parse(fs.readFileSync('./artifacts/MegaPredict.json', 'utf8'));
            bytecode = artifacts.bytecode;
        } catch {
            console.log('⚠️  No artifacts found, will use simple deployment method');
            
            // Simple contract deployment transaction
            const factory = new ethers.ContractFactory(abi, '0x', wallet);
            const deployTx = factory.getDeployTransaction();
            
            console.log('📦 Creating deployment transaction...');
            
            const tx = await wallet.sendTransaction({
                data: deployTx.data,
                gasLimit: 5000000, // 5M gas
                gasPrice: ethers.parseUnits('0.1', 'gwei')
            });
            
            console.log('⏳ Transaction sent:', tx.hash);
            console.log('⏳ Waiting for confirmation...');
            
            const receipt = await tx.wait();
            const address = receipt.contractAddress;
            
            console.log('\n✅ Contract deployed!');
            console.log('📍 Address:', address);
            
            // Update .env
            const envContent = fs.readFileSync('.env', 'utf8');
            const newEnv = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
            fs.writeFileSync('.env', newEnv);
            
            console.log('✅ .env updated!');
            return address;
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.data) console.error('Data:', err.data);
    }
}

deploy();
