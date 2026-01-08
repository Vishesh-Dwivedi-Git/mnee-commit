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
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title CommitTest
 * @notice Test suite for Commit Protocol
 */
contract CommitTest is Test {
    Commit public commit;
    MockERC20 public token;
    
    address public owner = address(1);
    address public arbitrator = address(2);
    address public creator = address(3);
    address public contributor = address(4);
    
    uint256 public constant PAYMENT_AMOUNT = 1000 * 10**18;
    uint256 public constant BASE_STAKE = 1 ether;
    
    function setUp() public {
        // Deploy contracts
        vm.startPrank(owner);
        commit = new Commit(arbitrator);
        token = new MockERC20();
        vm.stopPrank();
        
        // Setup balances
        token.mint(creator, PAYMENT_AMOUNT * 10);
        token.mint(contributor, PAYMENT_AMOUNT);
        
        // Approve commit contract
        vm.prank(creator);
        token.approve(address(commit), type(uint256).max);
    }
    
    // ============================================================================
    // Commitment Creation Tests
    // ============================================================================
    
    function testCreateCommitment() public {
        vm.startPrank(creator);
        
        uint256 deadline = block.timestamp + 7 days;
        uint256 disputeWindow = 3 days;
        
        uint256 commitId = commit.createCommitment(
            contributor,
            address(token),
            PAYMENT_AMOUNT,
            deadline,
            disputeWindow,
            "QmSpec123..."
        );
        
        assertEq(commitId, 1);
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(data.creator, creator);
        assertEq(data.contributor, contributor);
        assertEq(data.token, address(token));
        assertEq(data.amount, PAYMENT_AMOUNT);
        assertEq(uint(data.state), uint(Commit.State.FUNDED));
        
        // Check token transfer
        assertEq(token.balanceOf(address(commit)), PAYMENT_AMOUNT);
        
        vm.stopPrank();
    }
    
    function testCannotCreateWithZeroAddress() public {
        vm.startPrank(creator);
        
        vm.expectRevert(Commit.InvalidAddress.selector);
        commit.createCommitment(
            address(0),
            address(token),
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
        
        vm.stopPrank();
    }
    
    function testCannotCreateWithPastDeadline() public {
        vm.startPrank(creator);
        
        vm.expectRevert(Commit.InvalidDeadline.selector);
        commit.createCommitment(
            contributor,
            address(token),
            PAYMENT_AMOUNT,
            block.timestamp - 1,
            3 days,
            "QmSpec123..."
        );
        
        vm.stopPrank();
    }
    
    // ============================================================================
    // Work Submission Tests
    // ============================================================================
    
    function testSubmitWork() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SUBMITTED));
        assertEq(data.evidenceCid, "QmEvidence456...");
        assertEq(data.submittedAt, block.timestamp);
    }
    
    function testCannotSubmitWorkUnauthorized() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(creator); // Wrong person
        vm.expectRevert(Commit.Unauthorized.selector);
        commit.submitWork(commitId, "QmEvidence456...");
    }
    
    // ============================================================================
    // Settlement Tests
    // ============================================================================
    
    function testSettle() public {
        uint256 commitId = _createCommitment();
        
        // Submit work
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + 4 days);
        
        // Anyone can settle
        commit.settle(commitId);
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SETTLED));
        
        // Check payment received
        assertEq(token.balanceOf(contributor), PAYMENT_AMOUNT * 2);
    }
    
    function testCannotSettleBeforeDisputeWindow() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Try to settle immediately
        vm.expectRevert(Commit.DisputeWindowNotClosed.selector);
        commit.settle(commitId);
    }
    
    function testCanSettle() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Before dispute window
        assertFalse(commit.canSettle(commitId));
        
        // After dispute window
        vm.warp(block.timestamp + 4 days);
        assertTrue(commit.canSettle(commitId));
    }
    
    // ============================================================================
    // Dispute Tests
    // ============================================================================
    
    function testOpenDispute() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Creator opens dispute
        vm.deal(creator, 10 ether);
        vm.prank(creator);
        commit.openDispute{value: BASE_STAKE}(commitId);
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.DISPUTED));
        
        Commit.DisputeData memory dispute = commit.getDispute(commitId);
        assertEq(dispute.disputer, creator);
        assertEq(dispute.stakeAmount, BASE_STAKE);
        assertFalse(dispute.resolved);
    }
    
    function testCannotOpenDisputeWithInsufficientStake() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        vm.deal(creator, 10 ether);
        vm.prank(creator);
        vm.expectRevert();
        commit.openDispute{value: BASE_STAKE - 1}(commitId);
    }
    
    function testCannotOpenDisputeAfterWindow() public {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + 4 days);
        
        vm.deal(creator, 10 ether);
        vm.prank(creator);
        vm.expectRevert(Commit.DisputeWindowNotClosed.selector);
        commit.openDispute{value: BASE_STAKE}(commitId);
    }
    
    // ============================================================================
    // Dispute Resolution Tests
    // ============================================================================
    
    function testResolveDisputeFavorContributor() public {
        uint256 commitId = _createCommitmentAndDispute();
        
        uint256 contributorBalanceBefore = token.balanceOf(contributor);
        uint256 creatorEthBefore = creator.balance;
        
        vm.prank(arbitrator);
        commit.resolveDispute(commitId, true); // Favor contributor
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.SETTLED));
        
        // Contributor gets payment
        assertEq(token.balanceOf(contributor), contributorBalanceBefore + PAYMENT_AMOUNT);
        
        // Creator gets stake back
        assertEq(creator.balance, creatorEthBefore + BASE_STAKE);
    }
    
    function testResolveDisputeFavorCreator() public {
        uint256 commitId = _createCommitmentAndDispute();
        
        uint256 creatorBalanceBefore = token.balanceOf(creator);
        uint256 creatorEthBefore = creator.balance;
        
        vm.prank(arbitrator);
        commit.resolveDispute(commitId, false); // Favor creator
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        assertEq(uint(data.state), uint(Commit.State.REFUNDED));
        
        // Creator gets payment back + stake
        assertEq(token.balanceOf(creator), creatorBalanceBefore + PAYMENT_AMOUNT);
        assertEq(creator.balance, creatorEthBefore + BASE_STAKE);
    }
    
    function testCannotResolveDisputeUnauthorized() public {
        uint256 commitId = _createCommitmentAndDispute();
        
        vm.prank(creator);
        vm.expectRevert(Commit.Unauthorized.selector);
        commit.resolveDispute(commitId, true);
    }
    
    // ============================================================================
    // Admin Tests
    // ============================================================================
    
    function testSetBaseStake() public {
        vm.prank(owner);
        commit.setBaseStake(2 ether);
        
        assertEq(commit.baseStake(), 2 ether);
    }
    
    function testSetArbitrator() public {
        address newArbitrator = address(5);
        
        vm.prank(owner);
        commit.setArbitrator(newArbitrator);
        
        assertEq(commit.arbitrator(), newArbitrator);
    }
    
    function testCannotSetArbitratorToZero() public {
        vm.prank(owner);
        vm.expectRevert(Commit.InvalidAddress.selector);
        commit.setArbitrator(address(0));
    }
    
    // ============================================================================
    // Helper Functions
    // ============================================================================
    
    function _createCommitment() internal returns (uint256) {
        vm.prank(creator);
        return commit.createCommitment(
            contributor,
            address(token),
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
    }
    
    function _createCommitmentAndDispute() internal returns (uint256) {
        uint256 commitId = _createCommitment();
        
        vm.prank(contributor);
        commit.submitWork(commitId, "QmEvidence456...");
        
        vm.deal(creator, 10 ether);
        vm.prank(creator);
        commit.openDispute{value: BASE_STAKE}(commitId);
        
        return commitId;
    }
}
