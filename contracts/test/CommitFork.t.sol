// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Commit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CommitForkTest
 * @notice Test suite for Commit Protocol using forked Ethereum Mainnet with real MNEE token
 */
contract CommitForkTest is Test {
    // MNEE Token on Ethereum Mainnet
    address constant MNEE_TOKEN = 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF;
    
    Commit public commit;
    IERC20 public mnee;
    
    address public owner;
    address public arbitrator;
    address public creator;
    address public contributor;
    
    uint256 public constant PAYMENT_AMOUNT = 1000 * 10**18; // 1000 MNEE
    uint256 public constant BASE_STAKE = 0.01 ether;
    
    function setUp() public {
        // Setup addresses
        owner = makeAddr("owner");
        arbitrator = makeAddr("arbitrator");
        creator = makeAddr("creator");
        contributor = makeAddr("contributor");
        
        // Get MNEE token interface
        mnee = IERC20(MNEE_TOKEN);
        
        // Deploy Commit contract
        vm.startPrank(owner);
        commit = new Commit(arbitrator);
        commit.setBaseStake(BASE_STAKE);
        vm.stopPrank();
        
        // Fund test accounts with MNEE by impersonating a whale
        // First, find a MNEE holder with balance
        address mneeWhale = _findMneeHolder();
        
        // Transfer MNEE to test accounts
        vm.startPrank(mneeWhale);
        mnee.transfer(creator, PAYMENT_AMOUNT * 10);
        mnee.transfer(contributor, PAYMENT_AMOUNT);
        vm.stopPrank();
        
        // Fund with ETH for gas and stakes
        vm.deal(creator, 10 ether);
        vm.deal(contributor, 1 ether);
        
        // Approve commit contract
        vm.prank(creator);
        mnee.approve(address(commit), type(uint256).max);
    }
    
    // ============================================================================
    // Happy Path Tests
    // ============================================================================
    
    function testCreateCommitmentWithMNEE() public {
        vm.startPrank(creator);
        
        uint256 deadline = block.timestamp + 7 days;
        uint256 disputeWindow = 3 days;
        
        uint256 creatorBalanceBefore = mnee.balanceOf(creator);
        
        uint256 commitId = commit.createCommitment(
            contributor,
            MNEE_TOKEN,
            PAYMENT_AMOUNT,
            deadline,
            disputeWindow,
            "QmSpec123..."
        );
        
        assertEq(commitId, 1);
        
        // Check MNEE transferred to escrow
        assertEq(mnee.balanceOf(address(commit)), PAYMENT_AMOUNT);
        assertEq(mnee.balanceOf(creator), creatorBalanceBefore - PAYMENT_AMOUNT);
        
        // Verify commitment data
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(data.token, MNEE_TOKEN);
        assertEq(data.amount, PAYMENT_AMOUNT);
        assertEq(uint(data.state), uint(Commit.State.FUNDED));
        
        vm.stopPrank();
    }
    
    function testFullWorkflowWithMNEE() public {
        // 1. Create commitment
        vm.prank(creator);
        uint256 commitId = commit.createCommitment(
            contributor,
            MNEE_TOKEN,
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
        
        // 2. Submit work
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // 3. Wait for dispute window
        vm.warp(block.timestamp + 4 days);
        
        // 4. Settle
        uint256 contributorBalanceBefore = mnee.balanceOf(contributor);
        commit.settle(commitId);
        
        // 5. Verify contributor received MNEE
        assertEq(mnee.balanceOf(contributor), contributorBalanceBefore + PAYMENT_AMOUNT);
        
        // 6. Verify state
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SETTLED));
    }
    
    function testDisputeWithMNEE() public {
        // Create and submit work
        vm.prank(creator);
        uint256 commitId = commit.createCommitment(
            contributor,
            MNEE_TOKEN,
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Open dispute
        vm.prank(creator);
        commit.openDispute{value: BASE_STAKE}(commitId);
        
        // Verify disputed state
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.DISPUTED));
        
        // Resolve in favor of contributor
        uint256 contributorBalanceBefore = mnee.balanceOf(contributor);
        
        vm.prank(arbitrator);
        commit.resolveDispute(commitId, true);
        
        // Contributor gets MNEE payment
        assertEq(mnee.balanceOf(contributor), contributorBalanceBefore + PAYMENT_AMOUNT);
    }
    
    function testRefundWithMNEE() public {
        // Create and submit work
        vm.prank(creator);
        uint256 commitId = commit.createCommitment(
            contributor,
            MNEE_TOKEN,
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Open dispute
        vm.prank(creator);
        commit.openDispute{value: BASE_STAKE}(commitId);
        
        // Resolve in favor of creator
        uint256 creatorBalanceBefore = mnee.balanceOf(creator);
        
        vm.prank(arbitrator);
        commit.resolveDispute(commitId, false);
        
        // Creator gets MNEE refund
        assertEq(mnee.balanceOf(creator), creatorBalanceBefore + PAYMENT_AMOUNT);
        
        // Verify refunded state
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.REFUNDED));
    }
    
    // ============================================================================
    // Helper Functions
    // ============================================================================
    
    /**
     * @notice Find an address holding MNEE tokens
     * @dev Uses common DeFi addresses or storage slots to find holders
     */
    function _findMneeHolder() internal view returns (address) {
        // Try common addresses that might hold MNEE
        address[] memory potentialHolders = new address[](5);
        potentialHolders[0] = 0x28C6c06298d514Db089934071355E5743bf21d60; // Binance Hot Wallet
        potentialHolders[1] = 0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549; // Binance 8
        potentialHolders[2] = 0xDFd5293D8e347dFe59E90eFd55b2956a1343963d; // Bitfinex
        potentialHolders[3] = 0x0D0707963952f2fBA59dD06f2b425ace40b492Fe; // Gate.io
        potentialHolders[4] = address(0); // Fallback
        
        for (uint i = 0; i < potentialHolders.length; i++) {
            if (potentialHolders[i] != address(0)) {
                uint256 balance = mnee.balanceOf(potentialHolders[i]);
                if (balance >= PAYMENT_AMOUNT * 20) {
                    return potentialHolders[i];
                }
            }
        }
        
        // If no whale found, we'll need to find one by checking token transfers
        // For now, revert with helpful message
        revert("No MNEE holder found - run with --fork-url to get real balances");
    }
}
