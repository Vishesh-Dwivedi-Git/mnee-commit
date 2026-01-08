// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICommit
 * @notice Interface for the Commit Protocol
 */
interface ICommit {
    // ============================================================================
    // Enums
    // ============================================================================

    enum State {
        CREATED,
        FUNDED,
        SUBMITTED,
        DISPUTED,
        SETTLED,
        REFUNDED
    }

    // ============================================================================
    // Structs
    // ============================================================================

    struct CommitmentData {
        address creator;
        address contributor;
        address token;
        uint256 amount;
        uint256 deadline;
        uint256 disputeWindow;
        string specCid;
        string evidenceCid;
        State state;
        uint256 createdAt;
        uint256 submittedAt;
    }

    struct DisputeData {
        address disputer;
        uint256 stakeAmount;
        uint256 createdAt;
        bool resolved;
        bool favorContributor;
    }

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

    // ============================================================================
    // Functions
    // ============================================================================

    function createCommitment(
        address _contributor,
        address _token,
        uint256 _amount,
        uint256 _deadline,
        uint256 _disputeWindow,
        string calldata _specCid
    ) external returns (uint256 commitId);

    function submitWork(
        uint256 _commitId,
        string calldata _evidenceCid
    ) external;

    function openDispute(uint256 _commitId) external payable;

    function settle(uint256 _commitId) external;

    function resolveDispute(
        uint256 _commitId,
        bool _favorContributor
    ) external;

    function getCommitment(uint256 _commitId) external view returns (CommitmentData memory);

    function getDispute(uint256 _commitId) external view returns (DisputeData memory);

    function calculateStake(uint256 _commitId) external view returns (uint256);

    function canSettle(uint256 _commitId) external view returns (bool);
}
