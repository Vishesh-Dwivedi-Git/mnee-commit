// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Commit.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20Fuzz
 */
contract MockERC20Fuzz is ERC20 {
    constructor() ERC20("Mock MNEE", "MNEE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title CommitFuzzTest
 * @notice Fuzz tests for edge cases and boundary conditions
 */
contract CommitFuzzTest is Test {
    Commit public commit;
    MockERC20Fuzz public mnee;
    
    address public owner = address(1);
    address public arbitrator = address(2);
    address public relayer = address(3);
    address public serverAdmin = address(4);
    address public contributor = address(5);
    
    uint256 public constant MAX_AMOUNT = type(uint128).max;
    
    function setUp() public {
        vm.startPrank(owner);
        mnee = new MockERC20Fuzz();
        commit = new Commit(arbitrator, address(mnee));
        commit.setRelayer(relayer);
        vm.stopPrank();
        
        // Give server admin plenty of tokens
        mnee.mint(serverAdmin, MAX_AMOUNT);
        
        vm.prank(serverAdmin);
        mnee.approve(address(commit), type(uint256).max);
    }
    
    // ============================================================================
    // Server Registration Fuzz Tests
    // ============================================================================
    
    function testFuzz_RegisterServer(uint256 guildId, uint256 adminId) public {
        vm.assume(guildId != 0);
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, adminId);
        
        (uint256 deposited, uint256 spent, uint256 available) = commit.getServerBalance(guildId);
        assertEq(deposited, 0);
        assertEq(spent, 0);
        assertEq(available, 0);
    }
    
    function testFuzz_CannotRegisterSameGuildTwice(uint256 guildId) public {
        vm.assume(guildId != 0);
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 123);
        
        vm.prank(serverAdmin);
        vm.expectRevert(Commit.ServerAlreadyRegistered.selector);
        commit.registerServer(guildId, 456);
    }
    
    // ============================================================================
    // Deposit Fuzz Tests
    // ============================================================================
    
    function testFuzz_DepositAmount(uint256 amount) public {
        // Bound to reasonable amounts
        amount = bound(amount, 1, MAX_AMOUNT / 2);
        
        uint256 guildId = 123456;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount);
        
        (uint256 deposited, , uint256 available) = commit.getServerBalance(guildId);
        assertEq(deposited, amount);
        assertEq(available, amount);
    }
    
    function testFuzz_MultipleDeposits(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1, MAX_AMOUNT / 4);
        amount2 = bound(amount2, 1, MAX_AMOUNT / 4);
        
        uint256 guildId = 123456;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount1);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount2);
        
        (uint256 deposited, , uint256 available) = commit.getServerBalance(guildId);
        assertEq(deposited, amount1 + amount2);
        assertEq(available, amount1 + amount2);
    }
    
    // ============================================================================
    // Commitment Creation Fuzz Tests
    // ============================================================================
    
    function testFuzz_CreateCommitmentAmount(uint256 amount) public {
        amount = bound(amount, 1, 1000000 * 10**18);
        
        uint256 guildId = 123456;
        
        // Register and fund
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount + 100 * 10**18); // Extra buffer
        
        // Create commitment
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            guildId,
            contributor,
            address(mnee),
            amount,
            block.timestamp + 1 days,
            1 hours,
            "QmSpec"
        );
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(data.amount, amount);
    }
    
    function testFuzz_CreateCommitmentDeadline(uint256 deadline) public {
        // Deadline must be in future
        deadline = bound(deadline, block.timestamp + 1, block.timestamp + 365 days);
        
        uint256 guildId = 123456;
        uint256 amount = 1000 * 10**18;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount);
        
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            guildId,
            contributor,
            address(mnee),
            amount,
            deadline,
            1 hours,
            "QmSpec"
        );
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(data.deadline, deadline);
    }
    
    function testFuzz_CannotExceedBalance(uint256 balance, uint256 amount) public {
        balance = bound(balance, 1, MAX_AMOUNT / 2);
        amount = bound(amount, balance + 1, MAX_AMOUNT);
        
        uint256 guildId = 123456;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, balance);
        
        // Try to create commitment exceeding balance
        vm.prank(relayer);
        vm.expectRevert();
        commit.createCommitment(
            guildId,
            contributor,
            address(mnee),
            amount,
            block.timestamp + 1 days,
            1 hours,
            "QmSpec"
        );
    }
    
    // ============================================================================
    // Withdrawal Fuzz Tests
    // ============================================================================
    
    function testFuzz_WithdrawAmount(uint256 deposit, uint256 withdraw) public {
        deposit = bound(deposit, 100, MAX_AMOUNT / 2);
        withdraw = bound(withdraw, 1, deposit);
        
        uint256 guildId = 123456;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, deposit);
        
        uint256 balBefore = mnee.balanceOf(serverAdmin);
        
        vm.prank(relayer);
        commit.withdrawFromServer(guildId, serverAdmin, withdraw);
        
        assertEq(mnee.balanceOf(serverAdmin), balBefore + withdraw);
        
        (,, uint256 available) = commit.getServerBalance(guildId);
        assertEq(available, deposit - withdraw);
    }
    
    function testFuzz_CannotWithdrawMoreThanAvailable(uint256 deposit, uint256 extra) public {
        deposit = bound(deposit, 1, MAX_AMOUNT / 2);
        extra = bound(extra, 1, MAX_AMOUNT / 2);
        
        uint256 guildId = 123456;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, deposit);
        
        vm.prank(relayer);
        vm.expectRevert();
        commit.withdrawFromServer(guildId, serverAdmin, deposit + extra);
    }
    
    // ============================================================================
    // Settlement Timing Fuzz Tests
    // ============================================================================
    
    function testFuzz_SettleAfterWindow(uint256 disputeWindow, uint256 extraTime) public {
        disputeWindow = bound(disputeWindow, 1 hours, 30 days);
        extraTime = bound(extraTime, 1, 365 days);
        
        uint256 guildId = 123456;
        uint256 amount = 1000 * 10**18;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount);
        
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            guildId,
            contributor,
            address(mnee),
            amount,
            block.timestamp + 1 days,
            disputeWindow,
            "QmSpec"
        );
        
        vm.prank(relayer);
        commit.submitWork(guildId, commitId, "QmEvidence");
        
        // Warp past dispute window
        vm.warp(block.timestamp + disputeWindow + extraTime);
        
        // Should be settleable
        assertTrue(commit.canSettle(commitId));
        
        vm.prank(owner);
        commit.settle(commitId);
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SETTLED));
    }
    
    function testFuzz_CannotSettleBeforeWindow(uint256 disputeWindow, uint256 earlyTime) public {
        disputeWindow = bound(disputeWindow, 2 hours, 30 days);
        earlyTime = bound(earlyTime, 1, disputeWindow - 1);
        
        uint256 guildId = 123456;
        uint256 amount = 1000 * 10**18;
        
        vm.prank(serverAdmin);
        commit.registerServer(guildId, 999);
        
        vm.prank(serverAdmin);
        commit.depositToServer(guildId, amount);
        
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            guildId,
            contributor,
            address(mnee),
            amount,
            block.timestamp + 1 days,
            disputeWindow,
            "QmSpec"
        );
        
        vm.prank(relayer);
        commit.submitWork(guildId, commitId, "QmEvidence");
        
        // Warp but not past window
        vm.warp(block.timestamp + earlyTime);
        
        // Should NOT be settleable
        assertFalse(commit.canSettle(commitId));
        
        vm.prank(owner);
        vm.expectRevert(Commit.DisputeWindowNotClosed.selector);
        commit.settle(commitId);
    }
    
    // ============================================================================
    // Registration Fee Fuzz Tests
    // ============================================================================
    
    function testFuzz_RegistrationFeeUpdates(uint256 newFee) public {
        newFee = bound(newFee, 0, 1000 * 10**18);
        
        vm.prank(owner);
        commit.setRegistrationFee(newFee);
        
        assertEq(commit.registrationFee(), newFee);
    }
}
