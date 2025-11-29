import solc from 'solc';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();
const execAsync = promisify(exec);

// Minimal test contract
const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Test {
    uint256 public number = 42;
    
    function setNumber(uint256 _num) external {
        number = _num;
    }
}
`;

const input = {
    language: 'Solidity',
    sources: { 'Test.sol': { content: source } },
    settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['evm.bytecode'] } }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const bytecode = '0x' + output.contracts['Test.sol'].Test.evm.bytecode.object;

console.log('Deploying minimal test contract...');

const cmd = `cast send --rpc-url ${process.env.RPC_URL} --private-key ${process.env.PRIVATE_KEY} --gas-limit 1000000 --create "${bytecode}"`;

try {
    const { stdout } = await execAsync(cmd);
    console.log(stdout);
    
    const match = stdout.match(/contractAddress\s+(\w+)/);
    if (match) {
        const addr = match[1];
        console.log('\n✅ Test contract:', addr);
        
        // Test call
        const result = await execAsync(`cast call --rpc-url ${process.env.RPC_URL} ${addr} "number()(uint256)"`);
        console.log('✅ number():', result.stdout.trim());
        
        // Test write
        await execAsync(`cast send --rpc-url ${process.env.RPC_URL} --private-key ${process.env.PRIVATE_KEY} ${addr} "setNumber(uint256)" 123`);
        
        const result2 = await execAsync(`cast call --rpc-url ${process.env.RPC_URL} ${addr} "number()(uint256)"`);
        console.log('✅ number() after set:', result2.stdout.trim());
        
        console.log('\n✅ Blockchain works fine!');
        console.log('❌ Problem is with MegaPredictSimple contract code');
    }
} catch (err) {
    console.error('❌', err.message);
}
