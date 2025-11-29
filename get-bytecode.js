import solc from 'solc';
import fs from 'fs';

const source = fs.readFileSync('./contracts/MegaPredict.sol', 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'MegaPredict.sol': { content: source }
    },
    settings: {
        outputSelection: {
            '*': { '*': ['abi', 'evm.bytecode'] }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contract = output.contracts['MegaPredict.sol'].MegaPredict;

fs.writeFileSync('./artifacts.json', JSON.stringify({
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object
}, null, 2));

console.log('✅ Artifacts saved');
console.log('Bytecode length:', contract.evm.bytecode.object.length);
