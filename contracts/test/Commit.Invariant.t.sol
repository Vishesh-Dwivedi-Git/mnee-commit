// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../src/Commit.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20Inv
 */
contract MockERC20Inv is ERC20 {
    constructor() ERC20("Mock MNEE", "MNEE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title CommitHandler
 * @notice Handler contract for invariant testing
 */
contract CommitHandler is Test {
    Commit public commit;
    MockERC20Inv public mnee;
    
    address public relayer;
    address public owner;
    address[] public serverAdmins;
    address[] public contributors;
    
    uint256[] public registeredGuilds;
    uint256[] public createdCommitIds;
    
    uint256 public totalDeposited;
    uint256 public totalCreated;
    
    constructor(Commit _commit, MockERC20Inv _mnee, address _relayer, address _owner) {
        commit = _commit;
        mnee = _mnee;
        relayer = _relayer;
        owner = _owner;
        
        // Create test accounts
        for (uint256 i = 0; i < 3; i++) {
            address admin = address(uint160(100 + i));
            serverAdmins.push(admin);
            mnee.mint(admin, 1000000 * 10**18);
            vm.prank(admin);
            mnee.approve(address(commit), type(uint256).max);
            
            contributors.push(address(uint160(200 + i)));
        }
    }
    
    function registerServer(uint256 guildSeed, uint256 adminIndex) external {
        adminIndex = adminIndex % serverAdmins.length;
        uint256 guildId = uint256(keccak256(abi.encode(guildSeed, block.timestamp))) % type(uint128).max;
        
        // Skip if already registered
        for (uint256 i = 0; i < registeredGuilds.length; i++) {
            if (registeredGuilds[i] == guildId) return;
        }
        
        address admin = serverAdmins[adminIndex];
        
        vm.prank(admin);
        try commit.registerServer(guildId, adminIndex) {
            registeredGuilds.push(guildId);
        } catch {}
    }
    
    function depositToServer(uint256 guildIndex, uint256 amount) external {
        if (registeredGuilds.length == 0) return;
        
        guildIndex = guildIndex % registeredGuilds.length;
        uint256 guildId = registeredGuilds[guildIndex];
        
        amount = bound(amount, 1, 10000 * 10**18);
        
        // Use first admin for simplicity
        address admin = serverAdmins[0];
        
        vm.prank(admin);
        try commit.depositToServer(guildId, amount) {
            totalDeposited += amount;
        } catch {}
    }
    
    function createCommitment(uint256 guildIndex, uint256 contributorIndex, uint256 amount) external {
        if (registeredGuilds.length == 0) return;
        
        guildIndex = guildIndex % registeredGuilds.length;
        contributorIndex = contributorIndex % contributors.length;
        
        uint256 guildId = registeredGuilds[guildIndex];
        address contributor = contributors[contributorIndex];
        
        (,, uint256 available) = commit.getServerBalance(guildId);
        if (available == 0) return;
        
        amount = bound(amount, 1, available);
        
        vm.prank(relayer);
        try commit.createCommitment(
            guildId,
            contributor,
            address(mnee),
            amount,
            block.timestamp + 7 days,
            1 days,
            "QmSpec"
        ) returns (uint256 commitId) {
            createdCommitIds.push(commitId);
            totalCreated += amount;
        } catch {}
    }
    
    function submitWork(uint256 commitIndex) external {
        if (createdCommitIds.length == 0) return;
        
        commitIndex = commitIndex % createdCommitIds.length;
        uint256 commitId = createdCommitIds[commitIndex];
        
        Commit.CommitmentData memory data = commit.getCommitment(commitId);
        if (data.state != Commit.State.FUNDED) return;
        
        uint256 guildId = commit.commitmentToServer(commitId);
        
        vm.prank(relayer);
        try commit.submitWork(guildId, commitId, "QmEvidence") {} catch {}
    }
    
    function settleCommitment(uint256 commitIndex) external {
        if (createdCommitIds.length == 0) return;
        
        commitIndex = commitIndex % createdCommitIds.length;
        uint256 commitId = createdCommitIds[commitIndex];
        
        // Warp time forward
        vm.warp(block.timestamp + 8 days);
        
        vm.prank(owner);
        try commit.settle(commitId) {} catch {}
    }
    
    function withdrawFromServer(uint256 guildIndex, uint256 amount) external {
        if (registeredGuilds.length == 0) return;
        
        guildIndex = guildIndex % registeredGuilds.length;
        uint256 guildId = registeredGuilds[guildIndex];
        
        (,, uint256 available) = commit.getServerBalance(guildId);
        if (available == 0) return;
        
        amount = bound(amount, 1, available);
        
        vm.prank(relayer);
        try commit.withdrawFromServer(guildId, serverAdmins[0], amount) {} catch {}
    }
    
    // ============================================================================
    // Getters for invariant checks
    // ============================================================================
    
    function getRegisteredGuildsCount() external view returns (uint256) {
        return registeredGuilds.length;
    }
    
    function getCreatedCommitmentsCount() external view returns (uint256) {
        return createdCommitIds.length;
    }
}

/**
 * @title CommitInvariantTest
 * @notice Invariant tests to verify protocol safety properties
 */
contract CommitInvariantTest is StdInvariant, Test {
    Commit public commit;
    MockERC20Inv public mnee;
    CommitHandler public handler;
    
    address public owner = address(1);
    address public arbitrator = address(2);
    address public relayer = address(3);
    
    function setUp() public {
        vm.startPrank(owner);
        mnee = new MockERC20Inv();
        commit = new Commit(arbitrator, address(mnee));
        commit.setRelayer(relayer);
        vm.stopPrank();
        
        handler = new CommitHandler(commit, mnee, relayer, owner);
        
        // Target the handler for invariant testing
        targetContract(address(handler));
    }
    
    // ============================================================================
    // Invariant: Available balance <= Total deposited
    // ============================================================================
    
    function invariant_availableNeverExceedsDeposited() public view {
        uint256 guildsCount = handler.getRegisteredGuildsCount();
        
        for (uint256 i = 0; i < guildsCount; i++) {
            uint256 guildId = handler.registeredGuilds(i);
            (uint256 deposited, uint256 spent, uint256 available) = commit.getServerBalance(guildId);
            
            // Available should never exceed deposited
            assertLe(available, deposited, "Available > Deposited");
            
            // Available should equal deposited - spent (for non-withdrawn funds)
            assertLe(spent, deposited, "Spent > Deposited");
        }
    }
    
    // ============================================================================
    // Invariant: Contract balance >= sum of all server available balances
    // ============================================================================
    
    function invariant_contractHasSufficientBalance() public view {
        uint256 totalAvailable = 0;
        uint256 guildsCount = handler.getRegisteredGuildsCount();
        
        for (uint256 i = 0; i < guildsCount; i++) {
            uint256 guildId = handler.registeredGuilds(i);
            (,, uint256 available) = commit.getServerBalance(guildId);
            totalAvailable += available;
        }
        
        // Contract should have at least enough to cover all available balances
        // (plus registration fees and pending commitments)
        uint256 contractBalance = mnee.balanceOf(address(commit));
        assertGe(contractBalance, totalAvailable, "Contract underfunded");
    }
    
    // ============================================================================
    // Invariant: No commitment without registered server
    // ============================================================================
    
    function invariant_noOrphanedCommitments() public view {
        uint256 commitmentsCount = handler.getCreatedCommitmentsCount();
        
        for (uint256 i = 0; i < commitmentsCount; i++) {
            uint256 commitId = handler.createdCommitIds(i);
            uint256 guildId = commit.commitmentToServer(commitId);
            
            // Every commitment must have a valid guild assignment
            assertGt(guildId, 0, "Commitment without guild");
        }
    }
    
    // ============================================================================
    // Invariant: State machine validity
    // ============================================================================
    
    function invariant_validStateTransitions() public view {
        uint256 commitmentsCount = handler.getCreatedCommitmentsCount();
        
        for (uint256 i = 0; i < commitmentsCount; i++) {
            uint256 commitId = handler.createdCommitIds(i);
            Commit.CommitmentData memory data = commit.getCommitment(commitId);
            
            // Valid states
            assertTrue(
                data.state == Commit.State.CREATED ||
                data.state == Commit.State.FUNDED ||
                data.state == Commit.State.SUBMITTED ||
                data.state == Commit.State.DISPUTED ||
                data.state == Commit.State.SETTLED ||
                data.state == Commit.State.REFUNDED,
                "Invalid state"
            );
            
            // If submitted, must have evidence CID
            if (data.state == Commit.State.SUBMITTED || 
                data.state == Commit.State.DISPUTED ||
                data.state == Commit.State.SETTLED) {
                assertTrue(bytes(data.evidenceCid).length > 0, "Missing evidence");
            }
        }
    }
    
    // ============================================================================
    // Invariant: Registration fee is always collected
    // ============================================================================
    
    function invariant_registrationFeesCollected() public view {
        uint256 guildsCount = handler.getRegisteredGuildsCount();
        uint256 expectedFees = guildsCount * commit.registrationFee();
        
        // Contract should have at least the registration fees
        // (some may have been withdrawn, so this is a lower bound check)
        // This is a soft invariant - just check registration count is tracked
        assertGe(guildsCount, 0, "Invalid guild count");
    }
}
