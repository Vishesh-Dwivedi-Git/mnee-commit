// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Commit.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock MNEE", "MNEE") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title CommitIntegrationTest
 * @notice Integration tests for full protocol workflows
 */
contract CommitIntegrationTest is Test {
    Commit public commit;
    MockERC20 public mnee;
    
    address public owner = address(1);
    address public arbitrator = address(2);
    address public relayer = address(3);
    
    // Server 1
    address public server1Admin = address(4);
    uint256 public constant GUILD_1 = 111111111;
    uint256 public constant ADMIN_1 = 999999991;
    
    // Server 2
    address public server2Admin = address(5);
    uint256 public constant GUILD_2 = 222222222;
    uint256 public constant ADMIN_2 = 999999992;
    
    // Contributors
    address public contributor1 = address(6);
    address public contributor2 = address(7);
    
    uint256 public constant REGISTRATION_FEE = 15 * 10**18;
    
    function setUp() public {
        vm.startPrank(owner);
        mnee = new MockERC20();
        commit = new Commit(arbitrator, address(mnee));
        commit.setRelayer(relayer);
        vm.stopPrank();
        
        // Fund server admins
        mnee.mint(server1Admin, 100000 * 10**18);
        mnee.mint(server2Admin, 100000 * 10**18);
        
        // Approvals
        vm.prank(server1Admin);
        mnee.approve(address(commit), type(uint256).max);
        
        vm.prank(server2Admin);
        mnee.approve(address(commit), type(uint256).max);
    }
    
    // ============================================================================
    // Full Lifecycle Tests
    // ============================================================================
    
    function testFullLifecycle_HappyPath() public {
        // 1. Register server
        vm.prank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        
        // 2. Deposit to server
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(server1Admin);
        commit.depositToServer(GUILD_1, depositAmount);
        
        // Check balance
        (uint256 deposited, uint256 spent, uint256 available) = commit.getServerBalance(GUILD_1);
        assertEq(deposited, depositAmount);
        assertEq(spent, 0);
        assertEq(available, depositAmount);
        
        // 3. Create commitment
        uint256 paymentAmount = 1000 * 10**18;
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            paymentAmount,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123"
        );
        
        // Check balance deducted
        (deposited, spent, available) = commit.getServerBalance(GUILD_1);
        assertEq(spent, paymentAmount);
        assertEq(available, depositAmount - paymentAmount);
        
        // 4. Submit work
        vm.prank(relayer);
        commit.submitWork(GUILD_1, commitId, "QmEvidence456");
        
        // 5. Wait for dispute window
        vm.warp(block.timestamp + 4 days);
        
        // 6. Settle
        vm.prank(owner);
        commit.settle(commitId);
        
        // Verify contributor received payment
        assertEq(mnee.balanceOf(contributor1), paymentAmount);
        
        // Verify commitment state
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SETTLED));
    }
    
    function testFullLifecycle_WithDispute_ContributorWins() public {
        // Setup: Register and fund server
        vm.startPrank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        commit.depositToServer(GUILD_1, 10000 * 10**18);
        vm.stopPrank();
        
        // Create commitment
        uint256 paymentAmount = 1000 * 10**18;
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            paymentAmount,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123"
        );
        
        // Submit work
        vm.prank(relayer);
        commit.submitWork(GUILD_1, commitId, "QmEvidence456");
        
        // Open dispute (within window)
        uint256 stake = commit.calculateStake(commitId);
        vm.deal(relayer, stake);
        vm.prank(relayer);
        commit.openDispute{value: stake}(GUILD_1, commitId);
        
        // Arbitrator resolves in favor of contributor
        vm.prank(arbitrator);
        commit.resolveDispute(commitId, true);
        
        // Verify contributor received payment
        assertEq(mnee.balanceOf(contributor1), paymentAmount);
        
        // Verify commitment state
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SETTLED));
    }
    
    function testFullLifecycle_WithDispute_CreatorWins() public {
        // Setup: Register and fund server
        vm.startPrank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        commit.depositToServer(GUILD_1, 10000 * 10**18);
        vm.stopPrank();
        
        uint256 initialServerBalance;
        (, , initialServerBalance) = commit.getServerBalance(GUILD_1);
        
        // Create commitment
        uint256 paymentAmount = 1000 * 10**18;
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            paymentAmount,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123"
        );
        
        // Submit work
        vm.prank(relayer);
        commit.submitWork(GUILD_1, commitId, "QmEvidence456");
        
        // Open dispute
        uint256 stake = commit.calculateStake(commitId);
        vm.deal(relayer, stake);
        vm.prank(relayer);
        commit.openDispute{value: stake}(GUILD_1, commitId);
        
        // Arbitrator resolves in favor of creator (refund)
        vm.prank(arbitrator);
        commit.resolveDispute(commitId, false);
        
        // Verify contributor did NOT receive payment
        assertEq(mnee.balanceOf(contributor1), 0);
        
        // Verify commitment state is REFUNDED
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.REFUNDED));
    }
    
    // ============================================================================
    // Multi-Server Tests
    // ============================================================================
    
    function testMultipleServers_IndependentBalances() public {
        // Register both servers
        vm.prank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        
        vm.prank(server2Admin);
        commit.registerServer(GUILD_2, ADMIN_2);
        
        // Deposit different amounts
        vm.prank(server1Admin);
        commit.depositToServer(GUILD_1, 5000 * 10**18);
        
        vm.prank(server2Admin);
        commit.depositToServer(GUILD_2, 8000 * 10**18);
        
        // Verify balances are independent
        (,, uint256 balance1) = commit.getServerBalance(GUILD_1);
        (,, uint256 balance2) = commit.getServerBalance(GUILD_2);
        
        assertEq(balance1, 5000 * 10**18);
        assertEq(balance2, 8000 * 10**18);
        
        // Create commitment from server 1
        vm.prank(relayer);
        commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            1000 * 10**18,
            block.timestamp + 7 days,
            3 days,
            "QmSpec"
        );
        
        // Verify only server 1 balance affected
        (,, balance1) = commit.getServerBalance(GUILD_1);
        (,, balance2) = commit.getServerBalance(GUILD_2);
        
        assertEq(balance1, 4000 * 10**18);
        assertEq(balance2, 8000 * 10**18);
    }
    
    function testMultipleServers_CannotCrossCommit() public {
        // Register only server 1
        vm.prank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        
        vm.prank(server1Admin);
        commit.depositToServer(GUILD_1, 5000 * 10**18);
        
        // Create commitment from server 1
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            1000 * 10**18,
            block.timestamp + 7 days,
            3 days,
            "QmSpec"
        );
        
        // Register server 2
        vm.prank(server2Admin);
        commit.registerServer(GUILD_2, ADMIN_2);
        
        // Server 2 cannot submit work for server 1's commitment
        vm.prank(relayer);
        vm.expectRevert(Commit.Unauthorized.selector);
        commit.submitWork(GUILD_2, commitId, "QmEvidence");
    }
    
    // ============================================================================
    // Batch Settlement Tests
    // ============================================================================
    
    function testBatchSettle_MultipleCommitments() public {
        // Setup server
        vm.prank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        
        vm.prank(server1Admin);
        commit.depositToServer(GUILD_1, 50000 * 10**18);
        
        // Create 5 commitments
        uint256[] memory commitIds = new uint256[](5);
        
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(relayer);
            commitIds[i] = commit.createCommitment(
                GUILD_1,
                contributor1,
                address(mnee),
                1000 * 10**18,
                block.timestamp + 1 days,
                1 hours,
                "QmSpec"
            );
            
            vm.prank(relayer);
            commit.submitWork(GUILD_1, commitIds[i], "QmEvidence");
        }
        
        // Wait for dispute window
        vm.warp(block.timestamp + 2 hours);
        
        // Batch settle
        vm.prank(owner);
        commit.batchSettle(commitIds);
        
        // Verify all settled
        for (uint256 i = 0; i < 5; i++) {
            Commit.CommitmentData memory data = commit.getCommitment(commitIds[i]);
            assertEq(uint(data.state), uint(Commit.State.SETTLED));
        }
        
        // Verify contributor received all payments
        assertEq(mnee.balanceOf(contributor1), 5000 * 10**18);
    }
    
    function testBatchSettle_SkipsNonSettleable() public {
        // Setup server
        vm.prank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        
        vm.prank(server1Admin);
        commit.depositToServer(GUILD_1, 50000 * 10**18);
        
        // Create 3 commitments with different dispute windows
        uint256[] memory commitIds = new uint256[](3);
        
        // Commitment 1: Short window (will be ready)
        vm.prank(relayer);
        commitIds[0] = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            1000 * 10**18,
            block.timestamp + 1 days,
            1 hours,  // Short window
            "QmSpec"
        );
        vm.prank(relayer);
        commit.submitWork(GUILD_1, commitIds[0], "QmEvidence");
        
        // Commitment 2: Long window (not ready yet)
        vm.prank(relayer);
        commitIds[1] = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            1000 * 10**18,
            block.timestamp + 1 days,
            7 days,  // Long window
            "QmSpec"
        );
        vm.prank(relayer);
        commit.submitWork(GUILD_1, commitIds[1], "QmEvidence");
        
        // Commitment 3: Short window (will be ready)
        vm.prank(relayer);
        commitIds[2] = commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            1000 * 10**18,
            block.timestamp + 1 days,
            1 hours,
            "QmSpec"
        );
        vm.prank(relayer);
        commit.submitWork(GUILD_1, commitIds[2], "QmEvidence");
        
        // Wait 2 hours (past short windows, but not long window)
        vm.warp(block.timestamp + 2 hours);
        
        // Batch settle all
        vm.prank(owner);
        commit.batchSettle(commitIds);
        
        // Verify: 1 and 3 settled, 2 still submitted
        Commit.CommitmentData memory data0 = commit.getCommitment(commitIds[0]);
        Commit.CommitmentData memory data1 = commit.getCommitment(commitIds[1]);
        Commit.CommitmentData memory data2 = commit.getCommitment(commitIds[2]);
        
        assertEq(uint(data0.state), uint(Commit.State.SETTLED));
        assertEq(uint(data1.state), uint(Commit.State.SUBMITTED)); // Not settled
        assertEq(uint(data2.state), uint(Commit.State.SETTLED));
        
        // 2 settled = 2000 MNEE
        assertEq(mnee.balanceOf(contributor1), 2000 * 10**18);
    }
    
    // ============================================================================
    // Withdrawal Tests
    // ============================================================================
    
    function testWithdraw_AfterPartialSpending() public {
        // Setup
        vm.prank(server1Admin);
        commit.registerServer(GUILD_1, ADMIN_1);
        
        uint256 depositAmount = 10000 * 10**18;
        vm.prank(server1Admin);
        commit.depositToServer(GUILD_1, depositAmount);
        
        // Spend some on commitment
        uint256 spendAmount = 3000 * 10**18;
        vm.prank(relayer);
        commit.createCommitment(
            GUILD_1,
            contributor1,
            address(mnee),
            spendAmount,
            block.timestamp + 7 days,
            3 days,
            "QmSpec"
        );
        
        // Withdraw remaining
        uint256 withdrawAmount = 5000 * 10**18;
        uint256 adminBalanceBefore = mnee.balanceOf(server1Admin);
        
        vm.prank(relayer);
        commit.withdrawFromServer(GUILD_1, server1Admin, withdrawAmount);
        
        // Verify
        assertEq(mnee.balanceOf(server1Admin), adminBalanceBefore + withdrawAmount);
        
        (,, uint256 available) = commit.getServerBalance(GUILD_1);
        assertEq(available, depositAmount - spendAmount - withdrawAmount);
    }
}
