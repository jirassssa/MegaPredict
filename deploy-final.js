import fs from 'fs';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function deploy() {
    try {
        const artifacts = JSON.parse(fs.readFileSync('./artifacts.json', 'utf8'));
        
        console.log('🚀 Deploying MegaPredict Contract\n');
        
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📝 Account:', wallet.address);
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');
        
        const factory = new ethers.ContractFactory(
            artifacts.abi,
            artifacts.bytecode,
            wallet
        );
        
        console.log('📦 Deploying contract...');
        const contract = await factory.deploy({
            gasLimit: 5000000
        });
        
        console.log('⏳ Tx hash:', contract.deploymentTransaction().hash);
        console.log('⏳ Waiting for confirmation...');
        
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log('\n✅ Contract Deployed Successfully!');
        console.log('📍 Address:', address);
        console.log('🔗 Explorer:', `https://megaeth-testnet-v2.blockscout.com/address/${address}\n`);
        
        // Update .env
        const envContent = fs.readFileSync('.env', 'utf8');
        const newEnv = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
        fs.writeFileSync('.env', newEnv);
        console.log('✅ .env file updated!');
        
        return address;
        
    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    }
}

deploy();
