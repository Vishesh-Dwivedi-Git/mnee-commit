// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Commit Protocol
 * @notice Optimistic escrow system for work commitments with Discord server integration
 * @dev Implements Discord server registration with prepaid balance system
 */
contract Commit is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================================
    // State Variables
    // ============================================================================

    /// @notice Commitment states
    enum State {
        CREATED,    // Commitment created but not funded
        FUNDED,     // ERC-20 tokens locked in escrow
        SUBMITTED,  // Work submitted by contributor
        DISPUTED,   // Dispute opened by creator
        SETTLED,    // Funds released to contributor
        REFUNDED    // Funds returned to creator
    }

    /// @notice Commitment structure
    struct CommitmentData {
        address creator;           // Who posted the work
        address contributor;       // Who will do the work
        address token;            // ERC-20 token for payment
        uint256 amount;           // Payment amount in token's smallest unit
        uint256 deadline;         // Unix timestamp for delivery
        uint256 disputeWindow;    // Duration in seconds for dispute period
        string specCid;           // IPFS CID for specification
        string evidenceCid;       // IPFS CID for submitted work evidence
        State state;              // Current state
        uint256 createdAt;        // Creation timestamp
        uint256 submittedAt;      // Submission timestamp
    }

    /// @notice Dispute structure
    struct DisputeData {
        address disputer;         // Who opened the dispute
        uint256 stakeAmount;      // Amount staked to open dispute
        uint256 createdAt;        // When dispute was opened
        bool resolved;            // Whether dispute has been resolved
        bool favorContributor;    // Resolution outcome
    }

    /// @notice Discord server data with balance tracking
    struct ServerData {
        uint256 guildId;           // Discord guild ID
        uint256 adminDiscordId;    // Admin's Discord user ID
        bool isActive;             // Registration status
        uint256 registeredAt;      // Registration timestamp
        uint256 totalDeposited;    // Lifetime MNEE deposited
        uint256 totalSpent;        // Lifetime MNEE spent on commitments
        uint256 availableBalance;  // Current available MNEE
    }

    /// @notice Mapping from commitment ID to commitment data
    mapping(uint256 => CommitmentData) public commitments;

    /// @notice Mapping from commitment ID to dispute data
    mapping(uint256 => DisputeData) public disputes;

    /// @notice Mapping from Discord guild ID to server data
    mapping(uint256 => ServerData) public servers;

    /// @notice Mapping from commitment ID to server guild ID
    mapping(uint256 => uint256) public commitmentToServer;

    /// @notice Counter for commitment IDs
    uint256 public commitmentCount;

    /// @notice Base stake amount for disputes (in wei)
    uint256 public baseStake = 1 ether;

    /// @notice Arbitrator address (can resolve disputes)
    address public arbitrator;

    /// @notice Trusted relayer address (Discord bot wallet)
    address public relayer;

    /// @notice MNEE token for registration fees and balances
    IERC20 public immutable mneeToken;

    /// @notice Registration fee in MNEE (15 MNEE)
    uint256 public registrationFee = 15 * 10**18;

    /// @notice Maximum number of commitments to settle in one batch
    uint256 public constant MAX_BATCH_SIZE = 50;

    // ============================================================================
    // Events
    // ============================================================================

    event CommitmentCreated(
        uint256 indexed commitId,
        address indexed creator,
        address indexed contributor,
        address token,
        uint256 amount,
        uint256 deadline
    );

    event WorkSubmitted(
        uint256 indexed commitId,
        string evidenceCid,
        uint256 timestamp
    );

    event DisputeOpened(
        uint256 indexed commitId,
        address indexed disputer,
        uint256 stakeAmount,
        uint256 timestamp
    );

    event CommitmentSettled(
        uint256 indexed commitId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event DisputeResolved(
        uint256 indexed commitId,
        bool favorContributor,
        uint256 timestamp
    );

    event BaseStakeUpdated(uint256 newBaseStake);
    event ArbitratorUpdated(address newArbitrator);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    event ServerRegistered(uint256 indexed guildId, uint256 adminDiscordId);
    event ServerDeposited(uint256 indexed guildId, uint256 amount, uint256 newBalance);
    event ServerWithdrew(uint256 indexed guildId, address to, uint256 amount);
    event ServerDeactivated(uint256 indexed guildId);
    event RegistrationFeeUpdated(uint256 newFee);

    // ============================================================================
    // Errors
    // ============================================================================

    error InvalidState(State expected, State actual);
    error Unauthorized();
    error DeadlineNotPassed();
    error DisputeWindowNotClosed();
    error InsufficientStake(uint256 required, uint256 provided);
    error TransferFailed();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error OnlyRelayer();
    error UnregisteredServer(uint256 guildId);
    error ServerAlreadyRegistered();
    error InsufficientServerBalance(uint256 required, uint256 available);

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier onlyArbitrator() {
        if (msg.sender != arbitrator) revert Unauthorized();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayer();
        _;
    }

    modifier onlyRegisteredServer(uint256 _guildId) {
        if (!servers[_guildId].isActive) revert UnregisteredServer(_guildId);
        _;
    }

    modifier inState(uint256 _commitId, State _state) {
        if (commitments[_commitId].state != _state) {
            revert InvalidState(_state, commitments[_commitId].state);
        }
        _;
    }

    // ============================================================================
    // Constructor
    // ============================================================================

    constructor(address _arbitrator, address _mneeToken) Ownable(msg.sender) {
        if (_arbitrator == address(0) || _mneeToken == address(0)) revert InvalidAddress();
        arbitrator = _arbitrator;
        mneeToken = IERC20(_mneeToken);
    }

    // ============================================================================
    // Discord Server Registration & Balance Management
    // ============================================================================

    /**
     * @notice Register a Discord server (pays 15 MNEE fee)
     * @param _guildId Discord guild ID
     * @param _adminDiscordId Admin's Discord user ID
     */
    function registerServer(
        uint256 _guildId,
        uint256 _adminDiscordId
    ) external {
        if (servers[_guildId].isActive) revert ServerAlreadyRegistered();

        // Transfer registration fee from caller
        mneeToken.safeTransferFrom(msg.sender, address(this), registrationFee);

        servers[_guildId] = ServerData({
            guildId: _guildId,
            adminDiscordId: _adminDiscordId,
            isActive: true,
            registeredAt: block.timestamp,
            totalDeposited: 0,
            totalSpent: 0,
            availableBalance: 0
        });

        emit ServerRegistered(_guildId, _adminDiscordId);
    }

    /**
     * @notice Deposit MNEE to server balance
     * @param _guildId Discord guild ID
     * @param _amount Amount of MNEE to deposit
     */
    function depositToServer(
        uint256 _guildId,
        uint256 _amount
    ) external onlyRegisteredServer(_guildId) {
        ServerData storage server = servers[_guildId];

        mneeToken.safeTransferFrom(msg.sender, address(this), _amount);

        server.totalDeposited += _amount;
        server.availableBalance += _amount;

        emit ServerDeposited(_guildId, _amount, server.availableBalance);
    }

    /**
     * @notice Withdraw unused balance from server (relayer only)
     * @param _guildId Discord guild ID
     * @param _to Address to withdraw to
     * @param _amount Amount to withdraw
     */
    function withdrawFromServer(
        uint256 _guildId,
        address _to,
        uint256 _amount
    ) external onlyRelayer onlyRegisteredServer(_guildId) {
        ServerData storage server = servers[_guildId];

        if (server.availableBalance < _amount) {
            revert InsufficientServerBalance(_amount, server.availableBalance);
        }

        server.availableBalance -= _amount;
        mneeToken.safeTransfer(_to, _amount);

        emit ServerWithdrew(_guildId, _to, _amount);
    }

    // ============================================================================
    // Core Functions
    // ============================================================================

    /**
     * @notice Create a new commitment (relayer only, deducts from server balance)
     * @param _guildId Discord guild ID
     * @param _contributor Address of the contributor
     * @param _token ERC-20 token address for payment
     * @param _amount Payment amount
     * @param _deadline Delivery deadline (unix timestamp)
     * @param _disputeWindow Dispute window duration in seconds
     * @param _specCid IPFS CID for specification
     * @return commitId The ID of the created commitment
     */
    function createCommitment(
        uint256 _guildId,
        address _contributor,
        address _token,
        uint256 _amount,
        uint256 _deadline,
        uint256 _disputeWindow,
        string calldata _specCid
    ) external nonReentrant onlyRelayer onlyRegisteredServer(_guildId) returns (uint256 commitId) {
        if (_contributor == address(0) || _token == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();
        if (_deadline <= block.timestamp) revert InvalidDeadline();

        ServerData storage server = servers[_guildId];

        // Check server has enough balance
        if (server.availableBalance < _amount) {
            revert InsufficientServerBalance(_amount, server.availableBalance);
        }

        commitId = ++commitmentCount;

        commitments[commitId] = CommitmentData({
            creator: msg.sender,  // relayer (bot wallet)
            contributor: _contributor,
            token: _token,
            amount: _amount,
            deadline: _deadline,
            disputeWindow: _disputeWindow,
            specCid: _specCid,
            evidenceCid: "",
            state: State.FUNDED,
            createdAt: block.timestamp,
            submittedAt: 0
        });

        commitmentToServer[commitId] = _guildId;

        // Deduct from server balance
        server.availableBalance -= _amount;
        server.totalSpent += _amount;

        emit CommitmentCreated(
            commitId,
            msg.sender,
            _contributor,
            _token,
            _amount,
            _deadline
        );
    }

    /**
     * @notice Submit work for a commitment (relayer only)
     * @param _guildId Discord guild ID
     * @param _commitId Commitment ID
     * @param _evidenceCid IPFS CID for evidence package
     */
    function submitWork(
        uint256 _guildId,
        uint256 _commitId,
        string calldata _evidenceCid
    ) external nonReentrant onlyRelayer onlyRegisteredServer(_guildId) inState(_commitId, State.FUNDED) {
        CommitmentData storage commitment = commitments[_commitId];
        
        // Verify this commitment belongs to the server
        if (commitmentToServer[_commitId] != _guildId) revert Unauthorized();

        commitment.evidenceCid = _evidenceCid;
        commitment.submittedAt = block.timestamp;
        commitment.state = State.SUBMITTED;

        emit WorkSubmitted(_commitId, _evidenceCid, block.timestamp);
    }

    /**
     * @notice Open a dispute for a commitment (relayer only)
     * @param _guildId Discord guild ID
     * @param _commitId Commitment ID
     */
    function openDispute(
        uint256 _guildId,
        uint256 _commitId
    ) 
        external 
        payable 
        nonReentrant 
        onlyRelayer
        onlyRegisteredServer(_guildId)
        inState(_commitId, State.SUBMITTED) 
    {
        CommitmentData storage commitment = commitments[_commitId];
        
        // Verify this commitment belongs to the server
        if (commitmentToServer[_commitId] != _guildId) revert Unauthorized();
        
        uint256 disputeDeadline = commitment.submittedAt + commitment.disputeWindow;
        if (block.timestamp > disputeDeadline) revert DisputeWindowNotClosed();

        // Calculate required stake (simplified - full formula in off-chain orchestrator)
        uint256 requiredStake = calculateStake(_commitId);
        if (msg.value < requiredStake) {
            revert InsufficientStake(requiredStake, msg.value);
        }

        disputes[_commitId] = DisputeData({
            disputer: msg.sender,
            stakeAmount: msg.value,
            createdAt: block.timestamp,
            resolved: false,
            favorContributor: false
        });

        commitment.state = State.DISPUTED;

        emit DisputeOpened(_commitId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Settle a commitment (owner only - for cron job)
     * @param _commitId Commitment ID
     */
    function settle(uint256 _commitId) 
        external 
        nonReentrant 
        onlyOwner
        inState(_commitId, State.SUBMITTED) 
    {
        CommitmentData storage commitment = commitments[_commitId];
        
        uint256 settlementTime = commitment.submittedAt + commitment.disputeWindow;
        if (block.timestamp < settlementTime) revert DisputeWindowNotClosed();

        commitment.state = State.SETTLED;

        // Transfer payment to contributor
        IERC20(commitment.token).safeTransfer(
            commitment.contributor,
            commitment.amount
        );

        emit CommitmentSettled(
            _commitId,
            commitment.contributor,
            commitment.amount,
            block.timestamp
        );
    }

    /**
     * @notice Batch settle multiple commitments (owner only - for cron job)
     * @param _commitIds Array of commitment IDs to settle
     */
    function batchSettle(uint256[] calldata _commitIds) external onlyOwner {
        for (uint256 i = 0; i < _commitIds.length; i++) {
            uint256 commitId = _commitIds[i];
            CommitmentData storage commitment = commitments[commitId];
            
            // Check if can settle (in SUBMITTED state and past dispute window)
            if (commitment.state == State.SUBMITTED) {
                uint256 settlementTime = commitment.submittedAt + commitment.disputeWindow;
                if (block.timestamp >= settlementTime) {
                    commitment.state = State.SETTLED;
                    
                    // Transfer payment to contributor
                    IERC20(commitment.token).safeTransfer(
                        commitment.contributor,
                        commitment.amount
                    );
                    
                    emit CommitmentSettled(
                        commitId,
                        commitment.contributor,
                        commitment.amount,
                        block.timestamp
                    );
                }
            }
        }
    }

    /**
     * @notice Resolve a dispute (arbitrator only)
     * @param _commitId Commitment ID
     * @param _favorContributor True if contributor wins, false if creator wins
     */
    function resolveDispute(
        uint256 _commitId,
        bool _favorContributor
    ) external onlyArbitrator nonReentrant inState(_commitId, State.DISPUTED) {
        CommitmentData storage commitment = commitments[_commitId];
        DisputeData storage dispute = disputes[_commitId];

        dispute.resolved = true;
        dispute.favorContributor = _favorContributor;

        if (_favorContributor) {
            // Contributor wins - release payment to contributor
            commitment.state = State.SETTLED;
            IERC20(commitment.token).safeTransfer(
                commitment.contributor,
                commitment.amount
            );
            
            // Return stake to creator (they were wrong)
            payable(commitment.creator).transfer(dispute.stakeAmount);
        } else {
            // Creator wins - refund payment + stake to creator
            commitment.state = State.REFUNDED;
            IERC20(commitment.token).safeTransfer(
                commitment.creator,
                commitment.amount
            );
            
            // Return stake to creator
            payable(commitment.creator).transfer(dispute.stakeAmount);
        }

        emit DisputeResolved(_commitId, _favorContributor, block.timestamp);
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    /**
     * @notice Get commitment details
     * @param _commitId Commitment ID
     * @return Commitment data
     */
    function getCommitment(uint256 _commitId) 
        external 
        view 
        returns (CommitmentData memory) 
    {
        return commitments[_commitId];
    }

    /**
     * @notice Get dispute details
     * @param _commitId Commitment ID
     * @return Dispute data
     */
    function getDispute(uint256 _commitId) 
        external 
        view 
        returns (DisputeData memory) 
    {
        return disputes[_commitId];
    }

    /**
     * @notice Calculate required stake for a dispute (simplified)
     * @param _commitId Commitment ID
     * @return Required stake amount
     * @dev Full dynamic calculation done off-chain by orchestrator
     */
    function calculateStake(uint256 _commitId) 
        public 
        view 
        returns (uint256) 
    {
        // Simplified: just return base stake
        // Full formula: Sreq = Sbase × Mtime × Mrep × MAI
        // This is calculated off-chain and validated here
        return baseStake;
    }

    /**
     * @notice Check if commitment can be settled
     * @param _commitId Commitment ID
     * @return True if settleable
     */
    function canSettle(uint256 _commitId) external view returns (bool) {
        CommitmentData memory commitment = commitments[_commitId];
        
        if (commitment.state != State.SUBMITTED) return false;
        
        uint256 settlementTime = commitment.submittedAt + commitment.disputeWindow;
        return block.timestamp >= settlementTime;
    }

    /**
     * @notice Get server balance details
     * @param _guildId Discord guild ID
     * @return totalDeposited Total MNEE deposited by server
     * @return totalSpent Total MNEE spent on commitments
     * @return availableBalance Current available MNEE balance
     */
    function getServerBalance(uint256 _guildId) external view returns (
        uint256 totalDeposited,
        uint256 totalSpent,
        uint256 availableBalance
    ) {
        ServerData storage server = servers[_guildId];
        return (server.totalDeposited, server.totalSpent, server.availableBalance);
    }

    // ============================================================================
    // Admin Functions
    // ============================================================================

    /**
     * @notice Update base stake amount
     * @param _newBaseStake New base stake in wei
     */
    function setBaseStake(uint256 _newBaseStake) external onlyOwner {
        baseStake = _newBaseStake;
        emit BaseStakeUpdated(_newBaseStake);
    }

    /**
     * @notice Update arbitrator address
     * @param _newArbitrator New arbitrator address
     */
    function setArbitrator(address _newArbitrator) external onlyOwner {
        if (_newArbitrator == address(0)) revert InvalidAddress();
        arbitrator = _newArbitrator;
        emit ArbitratorUpdated(_newArbitrator);
    }

    /**
     * @notice Set the trusted relayer address (Discord bot wallet)
     * @param _relayer Address of the Discord bot wallet
     */
    function setRelayer(address _relayer) external onlyOwner {
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }

    /**
     * @notice Update registration fee
     * @param _newFee New registration fee in MNEE
     */
    function setRegistrationFee(uint256 _newFee) external onlyOwner {
        registrationFee = _newFee;
        emit RegistrationFeeUpdated(_newFee);
    }

    /**
     * @notice Deactivate a Discord server
     * @param _guildId Discord guild ID to deactivate
     */
    function deactivateServer(uint256 _guildId) external onlyOwner {
        servers[_guildId].isActive = false;
        emit ServerDeactivated(_guildId);
    }

    /**
     * @notice Withdraw collected registration fees
     * @param _to Address to send fees to
     * @param _amount Amount of MNEE to withdraw
     * @dev Be careful not to withdraw server balances - only registration fees
     */
    function withdrawFees(address _to, uint256 _amount) external onlyOwner {
        if (_to == address(0)) revert InvalidAddress();
        mneeToken.safeTransfer(_to, _amount);
    }
}
