// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Commit.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing (simulating MNEE)
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
 * @title CommitDiscordTest
 * @notice Test suite for Commit Protocol with Discord integration
 */
contract CommitDiscordTest is Test {
    Commit public commit;
    MockERC20 public mnee;
    MockERC20 public paymentToken;
    
    address public owner = address(1);
    address public arbitrator = address(2);
    address public relayer = address(3); // Bot wallet
    address public serverAdmin = address(4);
    address public contributor = address(5);
    
    uint256 public constant GUILD_ID = 123456789;
    uint256 public constant ADMIN_DISCORD_ID = 987654321;
    uint256 public constant REGISTRATION_FEE = 15 * 10**18; // 15 MNEE
    uint256 public constant baseSTAKE = 1 ether;
    uint256 public constant PAYMENT_AMOUNT = 1000 * 10**18;
    
    function setUp() public {
        // Deploy contracts
        vm.startPrank(owner);
        mnee = new MockERC20();
        paymentToken = new MockERC20();
        commit = new Commit(arbitrator, address(mnee));
        
        // Set relayer
        commit.setRelayer(relayer);
        vm.stopPrank();
        
        // Setup balances (server admin needs enough for registration + deposits)
        mnee.mint(serverAdmin, 20000 * 10**18);
        paymentToken.mint(address(this), 100000 * 10**18);
        
        // Approve
        vm.prank(serverAdmin);
        mnee.approve(address(commit), type(uint256).max);
    }
    
    // ============================================================================
    // Server Registration Tests
    // ============================================================================
    
    function testRegisterServer() public {
        vm.prank(serverAdmin);
        commit.registerServer(GUILD_ID, ADMIN_DISCORD_ID);
        
        (uint256 totalDeposited, uint256 totalSpent, uint256 availableBalance) = 
            commit.getServerBalance(GUILD_ID);
        
        assertEq(totalDeposited, 0);
        assertEq(totalSpent, 0);
        assertEq(availableBalance, 0);
        
        // Check registration fee was transferred
        assertEq(mnee.balanceOf(address(commit)), REGISTRATION_FEE);
    }
    
    function testCannotRegisterWithoutFee() public {
        vm.prank(address(999)); // Different address without approval
        vm.expectRevert();
        commit.registerServer(GUILD_ID, ADMIN_DISCORD_ID);
    }
    
    function testCannotRegisterTwice() public {
        vm.startPrank(serverAdmin);
        commit.registerServer(GUILD_ID, ADMIN_DISCORD_ID);
        
        vm.expectRevert(Commit.ServerAlreadyRegistered.selector);
        commit.registerServer(GUILD_ID, ADMIN_DISCORD_ID);
        vm.stopPrank();
    }
    
    // ============================================================================
    // Balance Management Tests
    // ============================================================================
    
    function testDepositToServer() public {
        _registerServer();
        
        uint256 depositAmount = 5000 * 10**18;
        vm.prank(serverAdmin);
        commit.depositToServer(GUILD_ID, depositAmount);
        
        (uint256 totalDeposited, uint256 totalSpent, uint256 availableBalance) = 
            commit.getServerBalance(GUILD_ID);
        
        assertEq(totalDeposited, depositAmount);
        assertEq(availableBalance, depositAmount);
        assertEq(totalSpent, 0);
    }
    
    function testCannotDepositToUnregisteredServer() public {
        uint256 unregisteredGuildId = 999999;
        
        vm.prank(serverAdmin);
        vm.expectRevert();
        commit.depositToServer(unregisteredGuildId, 1000 * 10**18);
    }
    
    function testWithdrawFromServer() public {
        _registerAndFundServer(5000 * 10**18);
        
        uint256 withdrawAmount = 1000 * 10**18;
        vm.prank(relayer);
        commit.withdrawFromServer(GUILD_ID, serverAdmin, withdrawAmount);
        
        (,, uint256 availableBalance) = commit.getServerBalance(GUILD_ID);
        assertEq(availableBalance, 4000 * 10**18);
    }
    
    function testCannotWithdrawMoreThanAvailable() public {
        _registerAndFundServer(1000 * 10**18);
        
        vm.prank(relayer);
        vm.expectRevert();
        commit.withdrawFromServer(GUILD_ID, serverAdmin, 2000 * 10**18);
    }
    
    function testOnlyRelayerCanWithdraw() public {
       _registerAndFundServer(1000 * 10**18);
        
        vm.prank(serverAdmin); // Not relayer
        vm.expectRevert(Commit.OnlyRelayer.selector);
        commit.withdrawFromServer(GUILD_ID, serverAdmin, 100 * 10**18);
    }
    
    // ============================================================================
    // Commitment Creation Tests
    // ============================================================================
    
    function testCreateCommitment() public {
        _registerAndFundServer(5000 * 10**18);
        
        vm.prank(relayer);
        uint256 commitId = commit.createCommitment(
            GUILD_ID,
            contributor,
            address(paymentToken),
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
        
        assertEq(commitId, 1);
        
        // Check balance was deducted
        (uint256 totalDeposited, uint256 totalSpent, uint256 availableBalance) = 
            commit.getServerBalance(GUILD_ID);
        
        assertEq(totalDeposited, 5000 * 10**18);
        assertEq(totalSpent, PAYMENT_AMOUNT);
        assertEq(availableBalance, 4000 * 10**18);
    }
    
    function testCannotCreateCommitmentWithInsufficientBalance() public {
        _registerAndFundServer(500 * 10**18); // Less than PAYMENT_AMOUNT
        
        vm.prank(relayer);
        vm.expectRevert();
        commit.createCommitment(
            GUILD_ID,
            contributor,
            address(paymentToken),
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
    }
    
    function testOnlyRelayerCanCreateCommitment() public {
        _registerAndFundServer(5000 * 10**18);
        
        vm.prank(serverAdmin); // Not relayer
        vm.expectRevert(Commit.OnlyRelayer.selector);
        commit.createCommitment(
            GUILD_ID,
            contributor,
            address(paymentToken),
            PAYMENT_AMOUNT,
            block.timestamp + 7 days,
            3 days,
            "QmSpec123..."
        );
    }
    
    // ============================================================================
    // Settlement Tests
    // ============================================================================
    
    function testBatchSettle() public {
        _registerAndFundServer(10000 * 10**18);
        
        // Mint MNEE to contract for settlements
        mnee.mint(address(commit), 1000 * 10**18);
        
        // Create multiple commitments
        uint256[] memory commitIds = new uint256[](3);
        
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(relayer);
            commitIds[i] = commit.createCommitment(
                GUILD_ID,
                contributor,
                address(mnee),
                100 * 10**18,
                block.timestamp + 1 days,
                1 hours,
                "QmSpec..."
            );
            
            // Submit work
            vm.prank(relayer);
            commit.submitWork(GUILD_ID, commitIds[i], "QmEvidence...");
        }
        
        // Fast forward past dispute window
        vm.warp(block.timestamp + 2 hours);
        
        // Batch settle
        vm.prank(owner);
        commit.batchSettle(commitIds);
        
        // Verify all settled
        for (uint256 i = 0; i < 3; i++) {
            Commit.CommitmentData memory data = commit.getCommitment(commitIds[i]);
            assertEq(uint(data.state), uint(Commit.State.SETTLED));
        }
    }
    
    // ============================================================================
    // Admin Tests
    // ============================================================================
    
    function testSetRelayer() public {
        address newRelayer = address(999);
        
        vm.prank(owner);
        commit.setRelayer(newRelayer);
        
        assertEq(commit.relayer(), newRelayer);
    }
    
    function testSetRegistrationFee() public {
        uint256 newFee = 20 * 10**18;
        
        vm.prank(owner);
        commit.setRegistrationFee(newFee);
        
        assertEq(commit.registrationFee(), newFee);
    }
    
    function testDeactivateServer() public {
        _registerServer();
        
        vm.prank(owner);
        commit.deactivateServer(GUILD_ID);
        
        // Try to deposit - should fail
        vm.prank(serverAdmin);
        vm.expectRevert();
        commit.depositToServer(GUILD_ID, 1000 * 10**18);
    }
    
    // ============================================================================
    // Helper Functions
    // ============================================================================
    
    function _registerServer() internal {
        vm.prank(serverAdmin);
        commit.registerServer(GUILD_ID, ADMIN_DISCORD_ID);
    }
    
    function _registerAndFundServer(uint256 amount) internal {
        _registerServer();
        vm.prank(serverAdmin);
        commit.depositToServer(GUILD_ID, amount);
    }
}
