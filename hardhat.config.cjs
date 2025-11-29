require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

module.exports = {
  solidity: "0.8.20",
  networks: {
    megaeth: {
      url: process.env.RPC_URL || "https://timothy.megaeth.com/rpc",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 6343
    }
  }
};
