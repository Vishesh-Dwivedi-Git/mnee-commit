// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Commit.sol";

/**
 * @title DeployMainnet
 * @notice Deployment script for Ethereum Mainnet with MNEE token
 */
contract DeployMainnet is Script {
    // MNEE Token on Ethereum Mainnet
    address constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    
    function run() external {
        // Load from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address arbitrator = vm.envAddress("ARBITRATOR_ADDRESS");
        
        console.log("=== Mainnet Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Arbitrator:", arbitrator);
        console.log("MNEE Token:", MNEE_TOKEN);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Commit contract with arbitrator and MNEE token
        Commit commit = new Commit(arbitrator, MNEE_TOKEN);
        
        // Set base stake (1 ETH for mainnet)
        commit.setBaseStake(1 ether);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Commit Protocol:", address(commit));
        console.log("Base Stake:", commit.baseStake());
        console.log("Arbitrator:", commit.arbitrator());
        console.log("");
        console.log("IMPORTANT: Save these addresses!");
        console.log("Add to server .env:");
        console.log("  CONTRACT_ADDRESS=", address(commit));
        console.log("  RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY");
        console.log("");
        console.log("Verify on Etherscan:");
        console.log("  forge verify-contract", address(commit), "Commit");
        console.log("    --constructor-args $(cast abi-encode 'constructor(address)' ", arbitrator, ")");
        console.log("    --etherscan-api-key $ETHERSCAN_API_KEY");
    }
}
