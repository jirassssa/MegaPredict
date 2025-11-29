import solc from 'solc';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

// Compile
const source = fs.readFileSync('./contracts/MegaPredictSimple.sol', 'utf8');

console.log('🔨 Compiling MegaPredictSimple.sol...\n');

const input = {
    language: 'Solidity',
    sources: { 'MegaPredictSimple.sol': { content: source } },
    settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
        errors.forEach(e => console.log(e.formattedMessage));
        process.exit(1);
    }
}

const contract = output.contracts['MegaPredictSimple.sol'].MegaPredictSimple;
const abi = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

console.log('✅ Compiled successfully');
console.log('📦 Bytecode length:', bytecode.length, 'chars\n');

fs.writeFileSync('./megapredict-abi.json', JSON.stringify(abi, null, 2));
console.log('💾 ABI saved to megapredict-abi.json\n');

// Deploy with cast
async function deploy() {
    try {
        console.log('🚀 Deploying with Foundry cast...\n');
        
        const cmd = `cast send --rpc-url ${process.env.RPC_URL} --private-key ${process.env.PRIVATE_KEY} --gas-limit 30000000 --gas-price 1gwei --create "${bytecode}"`;
        
        const { stdout, stderr } = await execAsync(cmd);
        
        console.log(stdout);
        if (stderr) console.error(stderr);
        
        // Extract contract address
        const match = stdout.match(/contractAddress\s+(\w+)/);
        if (match) {
            const address = match[1];
            console.log('\n✅ CONTRACT DEPLOYED!');
            console.log('📍 Address:', address);
            console.log('🔗 Explorer:', `https://megaeth-testnet-v2.blockscout.com/address/${address}\n`);
            
            // Update .env
            const env = fs.readFileSync('.env', 'utf8');
            fs.writeFileSync('.env', env.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`));
            console.log('✅ .env updated');
            
            return address;
        }
        
    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    }
}

deploy();
