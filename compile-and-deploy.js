import solc from 'solc';
import fs from 'fs';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Read Solidity source
const source = fs.readFileSync('./contracts/MegaPredict.sol', 'utf8');

// Compile
console.log('🔨 Compiling MegaPredict.sol...\n');

const input = {
    language: 'Solidity',
    sources: {
        'MegaPredict.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
    output.errors.forEach(err => {
        console.log(err.formattedMessage);
    });
    if (output.errors.some(err => err.severity === 'error')) {
        console.log('❌ Compilation failed');
        process.exit(1);
    }
}

const contract = output.contracts['MegaPredict.sol'].MegaPredict;
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

console.log('✅ Compilation successful!\n');

// Save ABI
fs.writeFileSync('./abi.json', JSON.stringify(abi, null, 2));
console.log('💾 ABI saved to abi.json\n');

// Deploy
async function deploy() {
    try {
        console.log('🚀 Deploying to MegaETH Timothy Testnet...\n');

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        console.log('📝 Deploying with account:', wallet.address);
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH\n');

        if (balance === 0n) {
            console.log('❌ Insufficient balance!');
            return;
        }

        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        
        console.log('📦 Sending deployment transaction...');
        const contract = await factory.deploy();

        console.log('⏳ Waiting for confirmation...');
        await contract.waitForDeployment();

        const address = await contract.getAddress();

        console.log('\n✅ Contract deployed successfully!');
        console.log('📍 Contract Address:', address);
        console.log('\n📝 Update your .env file with:');
        console.log(`CONTRACT_ADDRESS=${address}`);
        console.log('\n🔗 Explorer:');
        console.log(`https://megaeth-testnet-v2.blockscout.com/address/${address}`);

        // Update .env file
        const envContent = fs.readFileSync('.env', 'utf8');
        const newEnvContent = envContent.replace(
            /CONTRACT_ADDRESS=.*/,
            `CONTRACT_ADDRESS=${address}`
        );
        fs.writeFileSync('.env', newEnvContent);
        console.log('\n✅ .env file updated!');

        return address;

    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    }
}

deploy();
