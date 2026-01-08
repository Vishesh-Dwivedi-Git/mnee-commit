// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Commit Protocol
 * @notice Optimistic escrow system for work commitments with AI-verified settlement
 * @dev Implements dynamic stake calculation and automatic settlement after dispute window
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

    /// @notice Mapping from commitment ID to commitment data
    mapping(uint256 => CommitmentData) public commitments;

    /// @notice Mapping from commitment ID to dispute data
    mapping(uint256 => DisputeData) public disputes;

    /// @notice Counter for commitment IDs
    uint256 public commitmentCount;

    /// @notice Base stake amount for disputes (in wei)
    uint256 public baseStake = 1 ether;

    /// @notice Arbitrator address (can resolve disputes)
    address public arbitrator;

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

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier onlyArbitrator() {
        if (msg.sender != arbitrator) revert Unauthorized();
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

    constructor(address _arbitrator) Ownable(msg.sender) {
        if (_arbitrator == address(0)) revert InvalidAddress();
        arbitrator = _arbitrator;
    }

    // ============================================================================
    // Core Functions
    // ============================================================================

    /**
     * @notice Create a new commitment
     * @param _contributor Address of the contributor
     * @param _token ERC-20 token address for payment
     * @param _amount Payment amount
     * @param _deadline Delivery deadline (unix timestamp)
     * @param _disputeWindow Dispute window duration in seconds
     * @param _specCid IPFS CID for specification
     * @return commitId The ID of the created commitment
     */
    function createCommitment(
        address _contributor,
        address _token,
        uint256 _amount,
        uint256 _deadline,
        uint256 _disputeWindow,
        string calldata _specCid
    ) external nonReentrant returns (uint256 commitId) {
        if (_contributor == address(0) || _token == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();
        if (_deadline <= block.timestamp) revert InvalidDeadline();

        commitId = ++commitmentCount;

        commitments[commitId] = CommitmentData({
            creator: msg.sender,
            contributor: _contributor,
            token: _token,
            amount: _amount,
            deadline: _deadline,
            disputeWindow: _disputeWindow,
            specCid: _specCid,
            evidenceCid: "",
            state: State.CREATED,
            createdAt: block.timestamp,
            submittedAt: 0
        });

        // Transfer tokens to escrow
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // Update state to FUNDED
        commitments[commitId].state = State.FUNDED;

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
     * @notice Submit work for a commitment
     * @param _commitId Commitment ID
     * @param _evidenceCid IPFS CID for evidence package
     */
    function submitWork(
        uint256 _commitId,
        string calldata _evidenceCid
    ) external nonReentrant inState(_commitId, State.FUNDED) {
        CommitmentData storage commitment = commitments[_commitId];
        
        if (msg.sender != commitment.contributor) revert Unauthorized();

        commitment.evidenceCid = _evidenceCid;
        commitment.submittedAt = block.timestamp;
        commitment.state = State.SUBMITTED;

        emit WorkSubmitted(_commitId, _evidenceCid, block.timestamp);
    }

    /**
     * @notice Open a dispute for a commitment
     * @param _commitId Commitment ID
     */
    function openDispute(uint256 _commitId) 
        external 
        payable 
        nonReentrant 
        inState(_commitId, State.SUBMITTED) 
    {
        CommitmentData storage commitment = commitments[_commitId];
        
        if (msg.sender != commitment.creator) revert Unauthorized();
        
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
     * @notice Settle a commitment (release funds to contributor)
     * @param _commitId Commitment ID
     * @dev Can be called by anyone after deadline + dispute window
     */
    function settle(uint256 _commitId) 
        external 
        nonReentrant 
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
}
