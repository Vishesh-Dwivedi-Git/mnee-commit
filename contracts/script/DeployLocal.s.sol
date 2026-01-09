// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Commit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployLocal
 * @notice Deployment script for local Anvil fork with MNEE token
 */
contract DeployLocal is Script {
    // MNEE Token on Ethereum Mainnet
    address constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    
    function run() external {
        // Use first Anvil account as deployer
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        // Use second Anvil account as arbitrator
        address arbitrator = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        
        console.log("Deployer:", deployer);
        console.log("Arbitrator:", arbitrator);
        console.log("MNEE Token:", MNEE_TOKEN);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Commit contract with MNEE token
        Commit commit = new Commit(arbitrator, MNEE_TOKEN);
        
        // Set lower base stake for testing (0.01 ETH)
        commit.setBaseStake(0.01 ether);
        
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Commit Protocol:", address(commit));
        console.log("Base Stake:", commit.baseStake());
        console.log("");
        console.log("Next steps:");
        console.log("1. Fund test accounts with MNEE using: cast send");
        console.log("2. Approve Commit contract to spend MNEE");
        console.log("3. Create commitments!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title SetupTestAccounts
 * @notice Setup test accounts with MNEE tokens by impersonating a holder
 */
contract SetupTestAccounts is Script {
    address constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    
    function run() external {
        // Find a MNEE whale to impersonate
        // You may need to update this address based on current holders
        address mneeWhale = 0x28C6c06298d514Db089934071355E5743bf21d60; // Example: Binance
        
        // Test accounts (Anvil default accounts)
        address creator = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        address contributor = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        
        IERC20 mnee = IERC20(MNEE_TOKEN);
        
        uint256 whaleBalance = mnee.balanceOf(mneeWhale);
        console.log("Whale MNEE balance:", whaleBalance);
        
        if (whaleBalance == 0) {
            console.log("Warning: Whale has no MNEE. Try a different address.");
            return;
        }
        
        uint256 amount = 10000 * 10**18; // 10,000 MNEE each
        
        // Impersonate whale and transfer
        vm.startBroadcast(mneeWhale);
        
        mnee.transfer(creator, amount);
        mnee.transfer(contributor, amount);
        
        vm.stopBroadcast();
        
        console.log("Transferred", amount, "MNEE to creator:", creator);
        console.log("Transferred", amount, "MNEE to contributor:", contributor);
    }
}
