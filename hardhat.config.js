import "@nomicfoundation/hardhat-toolbox";
import dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

if (!PRIVATE_KEY) {
  console.error('❌ ERROR: PRIVATE_KEY not found in .env file');
  console.error('Please create a .env file with your PRIVATE_KEY');
}

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  networks: {
    megaeth: {
      url: process.env.RPC_URL || "https://timothy.megaeth.com/rpc",
      chainId: 6343,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 30000000,
      gasPrice: "auto"
    }
  }
};
