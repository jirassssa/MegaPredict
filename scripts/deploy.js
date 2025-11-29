import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying MegaPulse contract to MegaETH Timothy Testnet...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy contract
  const MegaPulse = await hre.ethers.getContractFactory("MegaPulse");
  const megaPulse = await MegaPulse.deploy({
    gasLimit: 30000000
  });

  await megaPulse.waitForDeployment();

  const contractAddress = await megaPulse.getAddress();
  console.log("✅ MegaPulse deployed to:", contractAddress);
  console.log("\n📋 Next steps:");
  console.log("1. Update CONTRACT_ADDRESS in index.html to:", contractAddress);
  console.log("2. Open index.html in a browser");
  console.log("3. Connect your wallet to MegaETH Timothy Testnet");
  console.log("4. Start betting!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
