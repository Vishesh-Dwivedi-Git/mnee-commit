# Commit Protocol - Complete Technical Guide

> **Optimistic Agentic Settlement for On-Chain Work Commitments**

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Protocol Architecture](#protocol-architecture)
4. [Smart Contract Specification](#smart-contract-specification)
5. [Dynamic Stake Calculation](#dynamic-stake-calculation)
6. [Workflow Examples](#workflow-examples)
7. [AI Agent Integration](#ai-agent-integration)
8. [API Reference](#api-reference)
9. [Security Model](#security-model)
10. [Deployment Guide](#deployment-guide)

---

## Overview

### What is Commit Protocol?

Commit Protocol is a **trustless escrow system** for work commitments that combines:
- **Smart contract escrow** (ERC-20 tokens on EVM chains)
- **AI-powered verification** (automated code review, testing, spec compliance)
- **Optimistic settlement** (automatic release unless disputed)
- **Dynamic economic security** (stake based on reputation + AI confidence)

### Problem Statement

DAOs and projects struggle with:
- ❌ Manual payment releases (slow, requires multisig)
- ❌ Subjective "done" definitions (endless disputes)
- ❌ Fixed dispute costs (too expensive for small tasks, too cheap for large ones)
- ❌ No reputation tracking (same treatment for proven vs. new contributors)

### Solution

Commit Protocol provides:
- ✅ **Automatic settlement** after deadline + dispute window
- ✅ **AI verification** defines objective "done" criteria
- ✅ **Dynamic stakes** scale with task value, reputation, and AI confidence
- ✅ **Reputation vectors** reward consistent contributors

---

## Core Concepts

### 1. Commitment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CREATED: createCommit()
    CREATED --> FUNDED: ERC-20 transfer to escrow
    FUNDED --> SUBMITTED: submitWork()
    SUBMITTED --> DISPUTED: openDispute() [within window]
    SUBMITTED --> SETTLED: settle() [after deadline + window]
    DISPUTED --> SETTLED: resolveDispute(CONTRIBUTOR)
    DISPUTED --> REFUNDED: resolveDispute(CLIENT)
    SETTLED --> [*]
    REFUNDED --> [*]
```

#### State Definitions

| State | Description | Who Can Trigger |
|-------|-------------|-----------------|
| **CREATED** | Off-chain record created, awaiting on-chain funding | Creator |
| **FUNDED** | ERC-20 tokens locked in smart contract escrow | Creator (via contract) |
| **SUBMITTED** | Contributor submitted work + evidence CID | Contributor |
| **DISPUTED** | Creator opened dispute with required stake | Creator |
| **SETTLED** | Funds released to contributor | Anyone (public `settle()`) |
| **REFUNDED** | Funds + stake returned to creator | Arbitrator |

### 2. Key Entities

#### Creator (Client)
- Posts the work commitment
- Funds escrow with ERC-20 tokens
- Can dispute if work is unsatisfactory
- Pays dispute stake if they lose

#### Contributor
- Accepts the commitment
- Submits work with deliverable hash
- Receives payment if work is accepted
- Protected by reputation multiplier

#### Orchestrator (Relayer)
- Off-chain server that listens to contract events
- Triggers AI agents for verification
- Calls `settle()` automatically after deadline
- Stores evidence on IPFS

#### AI Agents
- GitHub Auditor: Checks CI/CD, tests, code quality
- Visual Agent: Verifies design specs (future)
- Reputation Oracle: Tracks contributor history

---

## Protocol Architecture

### System Components

```mermaid
graph TB
    subgraph "On-Chain (Base/EVM)"
        Contract[Commit.sol<br/>Smart Contract]
        Token[ERC-20 Token<br/>USDC/DAI/etc]
    end
    
    subgraph "Off-Chain (Orchestrator)"
        Server[Node.js Server<br/>Express + Prisma]
        DB[(PostgreSQL<br/>Supabase)]
        Agents[AI Agents<br/>GitHub/Visual]
    end
    
    subgraph "Storage"
        IPFS[IPFS/Pinata<br/>Evidence Storage]
    end
    
    subgraph "Clients"
        User[Web3 Wallet]
        Discord[Discord Bot]
    end
    
    User -->|createCommit| Contract
    User -->|submitWork| Contract
    Contract -->|Events| Server
    Server -->|Trigger| Agents
    Agents -->|Evidence| IPFS
    Server -->|Store State| DB
    Server -->|settle| Contract
    Discord -->|Query| Server
    Contract <-->|Transfer| Token
```

### Data Flow

1. **Commitment Creation**
   ```
   User → Orchestrator API → Database (off-chain record)
   User → Smart Contract → createCommit() → ERC-20 transfer
   Contract → Event: CommitCreated
   Orchestrator → Sync on-chain ID with off-chain record
   ```

2. **Work Submission**
   ```
   Contributor → Smart Contract → submitWork(evidenceCID)
   Contract → Event: WorkSubmitted
   Orchestrator → Trigger AI Agents
   AI Agents → Analyze work → Generate evidence
   AI Agents → Pin evidence to IPFS → Get CID
   Orchestrator → Store evidence CID + confidence score
   ```

3. **Automatic Settlement**
   ```
   Time passes → Deadline + Dispute Window expires
   Orchestrator Scheduler → Detect settleable commitment
   Orchestrator → Smart Contract → settle(commitId)
   Contract → Transfer ERC-20 to contributor
   Contract → Event: CommitSettled
   ```

---

## Smart Contract Specification

### Core Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICommit {
    enum State { CREATED, FUNDED, SUBMITTED, DISPUTED, SETTLED, REFUNDED }
    
    struct Commit {
        address creator;
        address contributor;
        address token;           // ERC-20 token address
        uint256 amount;          // Amount in token's smallest unit
        uint256 deadline;        // Unix timestamp
        uint256 disputeWindow;   // Duration in seconds
        string specCid;          // IPFS CID for specification
        string evidenceCid;      // IPFS CID for submitted work evidence
        State state;
        uint256 createdAt;
    }
    
    // Core lifecycle functions
    function createCommit(
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
    
    // View functions
    function getCommit(uint256 _commitId) external view returns (Commit memory);
    function getRequiredStake(uint256 _commitId) external view returns (uint256);
}
```

### Events

```solidity
event CommitCreated(
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

event CommitSettled(
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
```

---

## Dynamic Stake Calculation

### The Formula

The required stake to open a dispute is calculated as:

```
Sreq = Sbase × Mtime × Mrep × MAI
```

Where:
- **Sbase**: Base stake amount (e.g., 1 ETH or 1000 USDC)
- **Mtime**: Time multiplier (prevents last-second disputes)
- **Mrep**: Reputation multiplier (protects proven contributors)
- **MAI**: AI confidence multiplier (leverages agent analysis)

### 1. Time Multiplier (Mtime)

**Purpose**: Prevent "sniper disputes" where malicious actors wait until the last second to dispute, forcing contributors to miss deadlines.

**Formula**:
```
Mtime = 1 + 0.5 × e^(-λt)
```

Where:
- `t` = time remaining in days
- `λ` = decay constant (default: 0.5)

**Example**:
```javascript
// 7 days remaining
t = 7
Mtime = 1 + 0.5 × e^(-0.5 × 7) = 1 + 0.5 × 0.0305 = 1.015

// 1 day remaining
t = 1
Mtime = 1 + 0.5 × e^(-0.5 × 1) = 1 + 0.5 × 0.606 = 1.303

// 1 hour remaining (0.042 days)
t = 0.042
Mtime = 1 + 0.5 × e^(-0.5 × 0.042) = 1 + 0.5 × 0.979 = 1.490
```

**Impact**: Disputing close to deadline costs 50% more stake.

### 2. Reputation Multiplier (Mrep)

**Purpose**: Protect high-reputation contributors from frivolous disputes.

**Formula**:
```
Mrep = 1 + log(Vtotal + 1) / K
```

Where:
- `Vtotal` = Total USD value successfully settled by contributor
- `K` = Scaling constant (default: 10,000)

**Reputation Vector**:
```typescript
{
  address: "0x123...",
  totalValue: 50000,      // $50k settled
  numCommits: 25,         // 25 completed tasks
  settlementRate: 0.96,   // 96% settled without dispute
  disputesLost: 1         // Lost 1 dispute
}
```

**Example**:
```javascript
// New contributor (no history)
Vtotal = 0
Mrep = 1 + log(0 + 1) / 10000 = 1 + 0 / 10000 = 1.0

// Mid-level contributor ($10k settled)
Vtotal = 10000
Mrep = 1 + log(10001) / 10000 = 1 + 9.21 / 10000 = 1.0009

// Senior contributor ($100k settled)
Vtotal = 100000
Mrep = 1 + log(100001) / 10000 = 1 + 11.51 / 10000 = 1.0012

// Elite contributor ($1M settled)
Vtotal = 1000000
Mrep = 1 + log(1000001) / 10000 = 1 + 13.82 / 10000 = 1.0014
```

**Impact**: Disputing a proven contributor costs ~0.14% more per $1M settled.

### 3. AI Confidence Multiplier (MAI)

**Purpose**: Leverage AI agent analysis to discourage disputes when work is objectively correct.

**Formula**:
```
MAI = 2.0   if C ≥ 0.95  (Very High Confidence)
MAI = 1.5   if 0.80 ≤ C < 0.95  (High Confidence)
MAI = 1.0   if C < 0.80  (Low/Medium Confidence)
```

Where `C` = AI confidence score (0.0 to 1.0)

**AI Confidence Calculation**:
```typescript
interface AgentAnalysis {
  confidenceScore: number;  // 0.0 - 1.0
  passFail: boolean;
  metrics: {
    testCoverage: number;      // % of code covered by tests
    securityIssues: number;    // Number of vulnerabilities found
    specMatch: 'High' | 'Medium' | 'Low';  // Spec compliance
  };
}

// Example: High-quality submission
{
  confidenceScore: 0.97,
  passFail: true,
  metrics: {
    testCoverage: 92,
    securityIssues: 0,
    specMatch: 'High'
  }
}
// → MAI = 2.0 (dispute costs 2x base stake)

// Example: Borderline submission
{
  confidenceScore: 0.82,
  passFail: true,
  metrics: {
    testCoverage: 65,
    securityIssues: 2,
    specMatch: 'Medium'
  }
}
// → MAI = 1.5 (dispute costs 1.5x base stake)
```

### Complete Example

**Scenario**: Disputing a senior contributor's high-quality work

```javascript
// Given
Sbase = 1000 USDC
timeRemaining = 2 days
contributorReputation = {
  totalValue: 75000,  // $75k settled
  numCommits: 30,
  settlementRate: 0.94,
  disputesLost: 2
}
aiConfidence = 0.96  // Very high confidence

// Calculate multipliers
Mtime = 1 + 0.5 × e^(-0.5 × 2) = 1 + 0.5 × 0.368 = 1.184

Mrep = 1 + log(75001) / 10000 = 1 + 11.23 / 10000 = 1.0011

MAI = 2.0  // confidence ≥ 0.95

// Final stake required
Sreq = 1000 × 1.184 × 1.0011 × 2.0
Sreq = 2,371 USDC
```

**Interpretation**: To dispute this high-quality work from a proven contributor, you must stake **2,371 USDC** (2.37x base). If you lose the dispute, you forfeit this stake.

---

## Workflow Examples

### Example 1: Happy Path (No Dispute)

**Setup**:
- Creator: Alice (DAO treasury)
- Contributor: Bob (developer)
- Task: Build authentication module
- Payment: 5,000 USDC
- Deadline: 7 days
- Dispute window: 3 days

**Timeline**:

#### Day 0: Commitment Created
```bash
# Alice creates off-chain record
POST /commit/create
{
  "clientAddress": "0xAlice",
  "contributorAddress": "0xBob",
  "amount": 5000000000,  # 5000 USDC (6 decimals)
  "tokenAddress": "0xUSDC",
  "deliveryDeadline": 1704672000,  # 7 days from now
  "disputeWindowSeconds": 259200,  # 3 days
  "specCid": "QmSpec123..."
}

# Response
{
  "commitId": "commit-abc123",
  "message": "Commitment created. User must call createCommit() on smart contract."
}

# Alice calls smart contract
contract.createCommit(
  "0xBob",           // contributor
  "0xUSDC",          // token
  5000000000,        // amount
  1704672000,        // deadline
  259200,            // disputeWindow
  "QmSpec123..."     // specCid
)

# Contract transfers 5000 USDC from Alice to escrow
# Emits: CommitCreated(commitId=1, creator=0xAlice, contributor=0xBob, ...)
```

#### Day 5: Work Submitted
```bash
# Bob submits work
contract.submitWork(
  1,                    // commitId
  "QmEvidence456..."    // evidenceCid (GitHub repo + test results)
)

# Emits: WorkSubmitted(commitId=1, evidenceCid="QmEvidence456...", timestamp=...)

# Orchestrator receives event
# Triggers AI agents
AI Agent Analysis:
  - Clones repo from evidence CID
  - Runs tests: ✓ 95% coverage
  - Security scan: ✓ No vulnerabilities
  - Spec compliance: ✓ High match
  
  Result:
    confidenceScore: 0.94
    passFail: true
    
# Stores evidence in database
```

#### Day 7: Deadline Passes
```bash
# Alice reviews work
# Decides to accept (no dispute)
# Waits for automatic settlement
```

#### Day 10: Automatic Settlement
```bash
# Orchestrator scheduler detects settleable commitment
# Calls settle() on contract

contract.settle(1)

# Contract checks:
# - State == SUBMITTED ✓
# - Current time > deadline + disputeWindow ✓
# - No active dispute ✓

# Transfers 5000 USDC to Bob
# Emits: CommitSettled(commitId=1, recipient=0xBob, amount=5000000000)

# Bob's reputation updated:
{
  totalValue: 5000,      # +$5k
  numCommits: 1,         # +1
  settlementRate: 1.0,   # 100%
  disputesLost: 0
}
```

---

### Example 2: Disputed Work (Creator Wins)

**Setup**:
- Creator: Carol (startup founder)
- Contributor: Dave (new freelancer)
- Task: Design landing page
- Payment: 2,000 USDC
- Deadline: 5 days
- Dispute window: 2 days

**Timeline**:

#### Day 0-4: Commitment & Submission
```bash
# Similar to Example 1
# Carol creates commitment for 2000 USDC
# Dave submits design on Day 4
```

#### Day 5: Work Submitted (Low Quality)
```bash
# AI Agent Analysis:
{
  confidenceScore: 0.72,  # Below 0.80 threshold
  passFail: false,        # Failed spec compliance
  metrics: {
    designConsistency: 0.65,
    responsiveness: 0.70,
    specMatch: 'Low'
  }
}
```

#### Day 6: Carol Opens Dispute
```bash
# Calculate required stake
Sbase = 1000 USDC
Mtime = 1 + 0.5 × e^(-0.5 × 1) = 1.303  # 1 day remaining
Mrep = 1.0  # Dave is new (no reputation)
MAI = 1.0   # Low AI confidence (0.72 < 0.80)

Sreq = 1000 × 1.303 × 1.0 × 1.0 = 1,303 USDC

# Carol calls contract
contract.openDispute(1, { value: 1303000000 })  # Stakes 1303 USDC

# Emits: DisputeOpened(commitId=1, disputer=0xCarol, stakeAmount=1303000000)

# Orchestrator updates state to DISPUTED
```

#### Day 8: Arbitration (Manual for now, Kleros in future)
```bash
# Admin reviews evidence:
# - Spec: "Modern, responsive design with dark mode"
# - Submitted: Static mockup, no dark mode, not responsive
# - AI analysis: Failed spec compliance

# Admin resolves in favor of creator
contract.resolveDispute(1, false)  # false = favor creator

# Contract:
# - Refunds 2000 USDC to Carol
# - Refunds 1303 USDC stake to Carol
# - State = REFUNDED

# Emits: DisputeResolved(commitId=1, favorContributor=false)

# Dave's reputation updated:
{
  totalValue: 0,
  numCommits: 0,
  settlementRate: 0.0,
  disputesLost: 1  # Penalty
}
```

---

### Example 3: Disputed Work (Contributor Wins)

**Setup**:
- Creator: Eve (malicious actor)
- Contributor: Frank (experienced dev)
- Task: API integration
- Payment: 3,000 USDC
- Deadline: 10 days

**Timeline**:

#### Day 9: Work Submitted (High Quality)
```bash
# Frank submits excellent work
# AI Analysis:
{
  confidenceScore: 0.98,  # Very high
  passFail: true,
  metrics: {
    testCoverage: 97,
    securityIssues: 0,
    specMatch: 'High'
  }
}

# Frank's reputation:
{
  totalValue: 120000,  # $120k settled
  numCommits: 45,
  settlementRate: 0.98,
  disputesLost: 0
}
```

#### Day 11: Eve Tries to Dispute (Bad Faith)
```bash
# Calculate required stake
Sbase = 1000 USDC
Mtime = 1 + 0.5 × e^(-0.5 × 1) = 1.303  # 1 day remaining
Mrep = 1 + log(120001) / 10000 = 1.0012  # High reputation
MAI = 2.0  # Very high AI confidence (0.98 ≥ 0.95)

Sreq = 1000 × 1.303 × 1.0012 × 2.0 = 2,609 USDC

# Eve must stake 2,609 USDC to dispute
# This is 87% of the payment amount!
# Eve realizes disputing will likely lose her money
# Decides not to dispute
```

#### Day 13: Automatic Settlement
```bash
# No dispute opened
# Orchestrator calls settle()
# Frank receives 3,000 USDC
# Frank's reputation increases
```

**Key Insight**: The dynamic stake formula **economically disincentivizes** bad-faith disputes against high-quality work from proven contributors.

---

## AI Agent Integration

### Agent Architecture

```mermaid
graph LR
    Event[Contract Event:<br/>WorkSubmitted] --> Orchestrator
    Orchestrator --> Queue[Agent Queue]
    Queue --> GitHub[GitHub Agent]
    Queue --> Visual[Visual Agent]
    Queue --> Reputation[Reputation Oracle]
    
    GitHub --> Analysis1[Code Analysis]
    Visual --> Analysis2[Design Analysis]
    Reputation --> Analysis3[History Check]
    
    Analysis1 --> Aggregator[Evidence Aggregator]
    Analysis2 --> Aggregator
    Analysis3 --> Aggregator
    
    Aggregator --> IPFS[Pin to IPFS]
    IPFS --> DB[(Store CID + Score)]
```

### GitHub Auditor Agent

**Purpose**: Verify code submissions for correctness, quality, and spec compliance.

**Process**:
1. **Clone Repository**
   ```bash
   git clone <repo_url_from_evidence>
   cd repo
   ```

2. **Run CI/CD Pipeline**
   ```bash
   npm install
   npm test
   npm run lint
   npm run build
   ```

3. **Analyze Results**
   ```typescript
   interface GitHubAnalysis {
     ciPassed: boolean;
     testCoverage: number;
     lintErrors: number;
     buildSuccess: boolean;
     securityVulnerabilities: number;
   }
   ```

4. **Compare Against Spec**
   ```typescript
   // Spec from IPFS
   const spec = await ipfs.cat(specCid);
   
   // Use OpenAI to compare
   const specMatch = await openai.chat.completions.create({
     model: "gpt-4",
     messages: [{
       role: "system",
       content: "You are a code reviewer. Compare the submitted code against the specification."
     }, {
       role: "user",
       content: `Spec: ${spec}\n\nCode: ${codeFiles}`
     }]
   });
   ```

5. **Generate Confidence Score**
   ```typescript
   function calculateConfidence(analysis: GitHubAnalysis): number {
     let score = 0.5; // Base score
     
     if (analysis.ciPassed) score += 0.2;
     if (analysis.testCoverage > 80) score += 0.15;
     if (analysis.lintErrors === 0) score += 0.05;
     if (analysis.buildSuccess) score += 0.05;
     if (analysis.securityVulnerabilities === 0) score += 0.05;
     
     return Math.min(score, 1.0);
   }
   ```

6. **Create Evidence Package**
   ```typescript
   const evidence = {
     commitId: "commit-123",
     agentId: "github-auditor-v1.2",
     timestamp: Date.now(),
     signature: signEvidence(privateKey, data),
     analysis: {
       confidenceScore: 0.94,
       passFail: true,
       metrics: {
         testCoverage: 88.5,
         securityIssues: 0,
         specMatch: "High"
       }
     },
     artifacts: [
       {
         type: "log",
         url: "ipfs://QmCILog...",
         label: "CI Run Output"
       },
       {
         type: "diff",
         url: "ipfs://QmDiff...",
         label: "Code Changes"
       }
     ]
   };
   
   // Pin to IPFS
   const cid = await pinata.pinJSON(evidence);
   
   // Store in database
   await db.agentEvidence.create({
     commitmentId: "commit-123",
     agentId: "github-auditor-v1.2",
     confidenceScore: 0.94,
     passFail: true,
     evidenceCid: cid,
     signature: evidence.signature
   });
   ```

### Evidence Schema

```json
{
  "$schema": "http://commit.protocol/schemas/evidence-v1.json",
  "meta": {
    "commitId": "0x123...abc",
    "agentId": "github-auditor-v1.2",
    "timestamp": 1704672000,
    "signature": "0xabc...123"
  },
  "analysis": {
    "confidenceScore": 0.95,
    "passFail": true,
    "metrics": {
      "testCoverage": 88.5,
      "securityIssues": 0,
      "specMatch": "High",
      "codeQuality": 0.92,
      "documentation": 0.87
    }
  },
  "artifacts": [
    {
      "type": "log",
      "url": "ipfs://QmLogHash...",
      "label": "CI Run Output",
      "size": 45678
    },
    {
      "type": "diff",
      "url": "ipfs://QmDiffHash...",
      "label": "Visual Regression Overlay",
      "size": 123456
    },
    {
      "type": "screenshot",
      "url": "ipfs://QmScreenshot...",
      "label": "Final UI State",
      "size": 234567
    }
  ],
  "rawData": {
    "ciOutput": "...",
    "testResults": {...},
    "lintReport": {...}
  }
}
```

---

## API Reference

### Orchestrator REST API

Base URL: `http://localhost:3000`

#### Create Commitment

```http
POST /commit/create
Content-Type: application/json

{
  "clientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "contributorAddress": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  "amount": 5000000000,
  "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "deliveryDeadline": 1704672000,
  "disputeWindowSeconds": 259200,
  "specCid": "QmSpec123...",
  "metadata": {
    "title": "Build Authentication Module",
    "description": "Implement OAuth2 + JWT authentication"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "commitId": "550e8400-e29b-41d4-a716-446655440000",
    "metadataHash": "0xabc123...",
    "amount": 5000000000,
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "message": "Commitment created. User must call createCommit() on smart contract to fund escrow."
  }
}
```

#### Submit Work

```http
POST /commit/deliver
Content-Type: application/json

{
  "commitId": "550e8400-e29b-41d4-a716-446655440000",
  "deliverableHash": "0xdef456...",
  "evidenceCid": "QmEvidence789..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "deliveredAt": 1704585600,
    "message": "Work submitted. AI verification will be triggered."
  }
}
```

#### Get Commitment

```http
GET /commit/:id
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "contributorAddress": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    "amount": 5000000000,
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "deliveryDeadline": 1704672000,
    "releaseAfter": 1704931200,
    "state": "SUBMITTED",
    "specCid": "QmSpec123...",
    "evidenceCid": "QmEvidence789...",
    "onChainCommitId": "1",
    "createdAt": 1704067200,
    "deliveredAt": 1704585600
  }
}
```

#### Open Dispute

```http
POST /dispute/open
Content-Type: application/json

{
  "commitId": "550e8400-e29b-41d4-a716-446655440000",
  "clientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "reason": "Work does not meet specification requirements"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "disputeId": "660e8400-e29b-41d4-a716-446655440001",
    "stakeAmount": "2371000000",
    "message": "Dispute created. User must call openDispute() on smart contract with 2371 USDC stake."
  }
}
```

---

## Security Model

### Attack Vectors & Mitigations

#### 1. Lazy Agent Attack

**Attack**: Agent operator signs "Pass" on every submission to save compute costs.

**Mitigation**: 
- **Spot Checks**: Randomly select 1% of submissions for deep review by secondary oracle
- **Slashing**: If discrepancy found, lazy agent loses stake
- **Reputation**: Agents build reputation over time; new agents have lower weight

#### 2. Colluding Disputer Attack

**Attack**: Creator and disputer collude to lock contributor's funds indefinitely.

**Mitigation**:
- **Time-Bound Arbitration**: If dispute not resolved within X days, default to highest economic weight (staked amount)
- **Arbitration Deadline**: Kleros court has 7-day resolution SLA
- **Emergency Exit**: Contributor can appeal to protocol governance

#### 3. Oracle Manipulation

**Attack**: Compromise reputation oracle to inflate Mrep artificially.

**Mitigation**:
- **Federated Signers**: Reputation updates require 3-of-5 multisig
- **On-Chain Verification**: Reputation data hashed and stored on-chain
- **Historical Audit**: All reputation changes logged immutably

#### 4. Sybil Attack (Reputation Farming)

**Attack**: Create multiple accounts to build fake reputation.

**Mitigation**:
- **Vtotal Requirement**: New accounts have Mrep = 1.0 (no protection)
- **Dispute History**: Track disputes lost across all addresses
- **Identity Verification**: Optional GitPOAP/ENS integration for bonus reputation

#### 5. Front-Running Settlement

**Attack**: MEV bot front-runs `settle()` call to extract value.

**Mitigation**:
- **No Value Extraction**: `settle()` only transfers to predetermined recipient
- **Public Function**: Anyone can call, no advantage to front-running
- **Gas Optimization**: Relayer uses low gas price, MEV bots waste gas

---

## Deployment Guide

### Prerequisites

1. **Smart Contract Deployment**
   ```bash
   # Deploy to Base Sepolia
   forge create Commit \
     --rpc-url https://sepolia.base.org \
     --private-key $DEPLOYER_PRIVATE_KEY \
     --constructor-args $ADMIN_ADDRESS
   
   # Note the deployed contract address
   CONTRACT_ADDRESS=0x...
   ```

2. **Database Setup (Supabase)**
   ```bash
   # Create new Supabase project
   # Copy connection string
   DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```

3. **IPFS Setup (Pinata)**
   ```bash
   # Sign up at pinata.cloud
   # Get API keys
   PINATA_API_KEY=...
   PINATA_SECRET_KEY=...
   ```

### Server Deployment

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   
   # Edit .env
   DATABASE_URL=postgresql://...
   CONTRACT_ADDRESS=0x...
   RPC_URL=https://sepolia.base.org
   ORCHESTRATOR_PRIVATE_KEY=0x...
   PINATA_API_KEY=...
   PINATA_SECRET_KEY=...
   ```

3. **Initialize Database**
   ```bash
   npm run db:push
   ```

4. **Start Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

### Discord Bot Deployment

```bash
cd bot
npm install

# Configure .env
BOT_TOKEN=...
SERVER_URL=http://localhost:3000
GEMINI_API_KEY=...

# Start bot
npm start
```

### Verification

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test commitment creation
curl -X POST http://localhost:3000/commit/create \
  -H "Content-Type: application/json" \
  -d '{
    "clientAddress": "0x...",
    "contributorAddress": "0x...",
    "amount": 1000000000,
    "tokenAddress": "0x...",
    "deliveryDeadline": 1704672000,
    "disputeWindowSeconds": 259200,
    "specCid": "QmTest..."
  }'
```

---

## Appendix

### Glossary

- **Commitment**: A work agreement with defined deliverables, deadline, and payment
- **Escrow**: Smart contract holding ERC-20 tokens until conditions met
- **Evidence**: IPFS-stored proof of work completion (code, tests, screenshots)
- **Stake**: Amount required to open a dispute (dynamic based on formula)
- **Settlement**: Automatic release of funds after deadline + dispute window
- **Reputation Vector**: Multi-dimensional score tracking contributor history
- **Orchestrator**: Off-chain server coordinating AI agents and contract calls

### Resources

- **Whitepaper**: [commit_protocol.pdf](./commit_protocol.pdf)
- **Smart Contract**: [Commit.sol](../contracts/src/Commit.sol) (to be implemented)
- **Server Code**: [/server](../server)
- **Discord Bot**: [/bot](../bot)

### Future Enhancements

1. **Kleros Integration**: Decentralized arbitration for disputes
2. **Visual Agents**: Figma API integration for design verification
3. **Reputation Sync**: Import from GitPOAP, Coordinape, SourceCred
4. **Multi-Chain**: Deploy to Ethereum, Polygon, Arbitrum, Optimism
5. **DAO Governance**: Protocol parameters controlled by token holders
6. **Streaming Payments**: Continuous settlement for long-term commitments

---

**Version**: 1.0  
**Last Updated**: January 8, 2026  
**License**: MIT
