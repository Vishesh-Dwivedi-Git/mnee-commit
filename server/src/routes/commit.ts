import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createCommitment,
  markDelivered,
  getCommitment,
  listCommitments,
} from '../services/commitService.js';
import type {
  ApiResponse,
  CreateCommitmentRequest,
  CreateCommitmentResponse,
  DeliverRequest,
  DeliverResponse,
  Commitment,
} from '../types/commit.js';

export const commitRouter = Router();

/**
 * POST /commit/create
 * Create a new commitment
 */
commitRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const input = req.body as CreateCommitmentRequest;

    // Validate required fields
    if (!input.clientWif || !input.clientAddress || !input.contributorAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: clientWif, clientAddress, contributorAddress',
      } satisfies ApiResponse<never>);
      return;
    }

    if (!input.amount || input.amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Amount must be a positive number',
      } satisfies ApiResponse<never>);
      return;
    }

    if (!input.deliveryDeadline) {
      res.status(400).json({
        success: false,
        error: 'deliveryDeadline is required',
      } satisfies ApiResponse<never>);
      return;
    }

    if (!input.disputeWindowSeconds || input.disputeWindowSeconds <= 0) {
      res.status(400).json({
        success: false,
        error: 'disputeWindowSeconds must be a positive number',
      } satisfies ApiResponse<never>);
      return;
    }

    const result = await createCommitment(input);

    res.status(201).json({
      success: true,
      data: result,
    } satisfies ApiResponse<CreateCommitmentResponse>);
  } catch (error) {
    console.error('Error creating commitment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create commitment',
    } satisfies ApiResponse<never>);
  }
});

/**
 * POST /commit/deliver
 * Mark a commitment as delivered
 */
commitRouter.post('/deliver', async (req: Request, res: Response) => {
  try {
    const input = req.body as DeliverRequest;

    if (!input.commitId) {
      res.status(400).json({
        success: false,
        error: 'commitId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    if (!input.deliverableHash) {
      res.status(400).json({
        success: false,
        error: 'deliverableHash is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const result = await markDelivered(input);

    res.status(200).json({
      success: true,
      data: result,
    } satisfies ApiResponse<DeliverResponse>);
  } catch (error) {
    console.error('Error delivering commitment:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark as delivered',
    } satisfies ApiResponse<never>);
  }
});

/**
 * GET /commit/:id
 * Get commitment details by ID
 */
commitRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Commitment ID is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const commitment = getCommitment(id);

    if (!commitment) {
      res.status(404).json({
        success: false,
        error: 'Commitment not found',
      } satisfies ApiResponse<never>);
      return;
    }

    res.status(200).json({
      success: true,
      data: commitment,
    } satisfies ApiResponse<Commitment>);
  } catch (error) {
    console.error('Error getting commitment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get commitment',
    } satisfies ApiResponse<never>);
  }
});

/**
 * GET /commit/list/:address
 * List commitments for an address (as client or contributor)
 */
commitRouter.get('/list/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({
        success: false,
        error: 'Address is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const commitments = listCommitments(address);

    res.status(200).json({
      success: true,
      data: commitments,
    } satisfies ApiResponse<Commitment[]>);
  } catch (error) {
    console.error('Error listing commitments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list commitments',
    } satisfies ApiResponse<never>);
  }
});
