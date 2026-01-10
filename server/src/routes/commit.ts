/**
 * Commitment Routes - Updated for Natural Language
 * POST /commit/create               - Create commitment (accepts task description, handles IPFS)
 * POST /commit/:id/submit          - Submit work (accepts description + URL, handles IPFS)
 * GET  /commit/:id                  - Get commitment details
 * GET  /commit/server/:guildId     - List by server
 * GET  /commit/contributor/:address - List by contributor
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createCommitment as contractCreateCommitment,
  submitWork as contractSubmitWork,
  getCommitment,
  getCommitmentsByServer,
  getCommitmentsByContributor,
} from '../services/contractService.js';
import { uploadJSON, isIpfsConfigured } from '../services/ipfsService.js';
import type {
  ApiResponse,
  CreateCommitmentResponse,
  SubmitWorkResponse,
  CommitmentData,
} from '../types/index.js';

export const commitRouter = Router();

// MNEE Token address on mainnet
const MNEE_TOKEN = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF';

// Default dispute window: 3 days
const DEFAULT_DISPUTE_WINDOW = 3 * 24 * 60 * 60;


/**
 * GET /commit/server/:guildId
 * List commitments by server
 */
commitRouter.get('/server/:guildId', async (req: Request, res: Response) => {
  try {
    const { guildId } = req.params;
    const { status } = req.query;

    if (!guildId) {
      res.status(400).json({
        success: false,
        error: 'guildId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const commitments = await getCommitmentsByServer(guildId);

    // Filter by status if provided
    let filtered = commitments;
    if (status && status !== 'all') {
      const statusMap: Record<string, number[]> = {
        active: [0, 1], // Created, Submitted
        completed: [3], // Settled
        disputed: [2], // Disputed
        refunded: [4], // Refunded
      };
      const allowedStates = statusMap[status as string] || [];
      if (allowedStates.length > 0) {
        filtered = commitments.filter(c => allowedStates.includes(c.state));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        guildId,
        count: filtered.length,
        commitments: filtered,
      },
    });
  } catch (error) {
    console.error('Error listing commitments by server:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list commitments',
    } satisfies ApiResponse<never>);
  }
});

/**
 * GET /commit/contributor/:address
 * List commitments by contributor
 */
commitRouter.get('/contributor/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({
        success: false,
        error: 'address is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const commitments = await getCommitmentsByContributor(address);

    res.status(200).json({
      success: true,
      data: {
        address,
        count: commitments.length,
        commitments,
      },
    });
  } catch (error) {
    console.error('Error listing commitments by contributor:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list commitments',
    } satisfies ApiResponse<never>);
  }
});

/**
 * POST /commit/create
 * Create a new commitment - accepts natural language, handles IPFS internally
 */
interface NaturalCreateRequest {
  guildId: string;
  contributorUsername?: string;
  contributorAddress: string;
  amountMNEE: number;
  taskDescription: string;
  deadlineDays: number;
  creatorDiscordId?: string;
}

commitRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const input = req.body as NaturalCreateRequest;

    // Validate required fields
    if (!input.guildId) {
      res.status(400).json({ success: false, error: 'guildId is required' });
      return;
    }

    if (!input.contributorAddress) {
      res.status(400).json({ success: false, error: 'contributorAddress is required' });
      return;
    }

    if (!input.amountMNEE || input.amountMNEE <= 0) {
      res.status(400).json({ success: false, error: 'amountMNEE must be positive' });
      return;
    }

    if (!input.taskDescription) {
      res.status(400).json({ success: false, error: 'taskDescription is required' });
      return;
    }

    if (!input.deadlineDays || input.deadlineDays <= 0) {
      res.status(400).json({ success: false, error: 'deadlineDays must be positive' });
      return;
    }

    // Upload spec to IPFS
    let specCid = 'mock-cid'; // Fallback if IPFS not configured
    if (isIpfsConfigured()) {
      specCid = await uploadJSON({
        title: `Task for ${input.contributorUsername || input.contributorAddress}`,
        description: input.taskDescription,
        amountMNEE: input.amountMNEE,
        createdAt: Date.now(),
        creatorDiscordId: input.creatorDiscordId,
        version: '1.0',
      }, `spec-${Date.now()}`);
      console.log(`[Commit] Uploaded spec to IPFS: ${specCid}`);
    } else {
      console.warn('[Commit] IPFS not configured, using mock CID');
    }

    // Convert amount to wei (18 decimals)
    const amountWei = (BigInt(Math.floor(input.amountMNEE * 1e6)) * BigInt(1e12)).toString();

    // Calculate deadline timestamp
    const deadline = Math.floor(Date.now() / 1000) + (input.deadlineDays * 24 * 60 * 60);

    // Create commitment on-chain
    const result = await contractCreateCommitment(
      input.guildId,
      input.contributorAddress,
      MNEE_TOKEN,
      amountWei,
      deadline,
      DEFAULT_DISPUTE_WINDOW,
      specCid
    );

    res.status(201).json({
      success: true,
      data: {
        commitId: result.commitId,
        txHash: result.txHash,
        specCid,
        message: `Commitment #${result.commitId} created successfully`,
      },
    } satisfies ApiResponse<CreateCommitmentResponse & { specCid: string }>);
  } catch (error) {
    console.error('Error creating commitment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create commitment',
    } satisfies ApiResponse<never>);
  }
});

/**
 * POST /commit/:id/submit
 * Submit work - accepts description + URL, handles IPFS internally
 */
interface NaturalSubmitRequest {
  guildId: string;
  description: string;
  deliverableUrl?: string;
  submitterDiscordId?: string;
}

commitRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const commitId = parseInt(req.params.id ?? '', 10);
    const input = req.body as NaturalSubmitRequest;

    if (isNaN(commitId)) {
      res.status(400).json({ success: false, error: 'Invalid commitment ID' });
      return;
    }

    if (!input.guildId) {
      res.status(400).json({ success: false, error: 'guildId is required' });
      return;
    }

    if (!input.description) {
      res.status(400).json({ success: false, error: 'description is required' });
      return;
    }

    // Upload evidence to IPFS
    let evidenceCid = 'mock-evidence-cid';
    if (isIpfsConfigured()) {
      evidenceCid = await uploadJSON({
        description: input.description,
        deliverableUrl: input.deliverableUrl,
        submittedAt: Date.now(),
        submitterDiscordId: input.submitterDiscordId,
        version: '1.0',
      }, `evidence-${commitId}-${Date.now()}`);
      console.log(`[Commit] Uploaded evidence to IPFS: ${evidenceCid}`);
    } else {
      console.warn('[Commit] IPFS not configured, using mock CID');
    }

    const txHash = await contractSubmitWork(
      input.guildId,
      commitId,
      evidenceCid
    );

    res.status(200).json({
      success: true,
      data: {
        commitId,
        evidenceCid,
        txHash,
        message: 'Work submitted successfully',
      },
    } satisfies ApiResponse<SubmitWorkResponse>);
  } catch (error) {
    console.error('Error submitting work:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit work',
    } satisfies ApiResponse<never>);
  }
});

/**
 * GET /commit/:id
 * Get commitment details
 */
commitRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const commitId = parseInt(req.params.id ?? '', 10);

    if (isNaN(commitId)) {
      res.status(400).json({ success: false, error: 'Invalid commitment ID' });
      return;
    }

    const commitment = await getCommitment(commitId);

    // Check if commitment exists
    if (commitment.creator === '0x0000000000000000000000000000000000000000') {
      res.status(404).json({ success: false, error: 'Commitment not found' });
      return;
    }

    // Map state to human-readable
    const stateNames = ['FUNDED', 'SUBMITTED', 'DISPUTED', 'SETTLED', 'REFUNDED'];

    res.status(200).json({
      success: true,
      data: {
        ...commitment,
        commitId,
        state: stateNames[commitment.state] || 'UNKNOWN',
      },
    });
  } catch (error) {
    console.error('Error getting commitment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get commitment',
    } satisfies ApiResponse<never>);
  }
});
