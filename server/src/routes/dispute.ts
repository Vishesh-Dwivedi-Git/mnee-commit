import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  openDispute,
  resolveDispute,
  getDispute,
} from '../services/commitService.js';
import type {
  ApiResponse,
  OpenDisputeRequest,
  OpenDisputeResponse,
  ResolveDisputeRequest,
  ResolveDisputeResponse,
  Dispute,
} from '../types/commit.js';
import { ADMIN_SECRET } from '../config/index.js';

export const disputeRouter = Router();

/**
 * POST /dispute/open
 * Open a dispute for a commitment
 * Returns required stake amount - user must call openDispute() on contract
 */
disputeRouter.post('/open', async (req: Request, res: Response) => {
  try {
    const input = req.body as OpenDisputeRequest;

    if (!input.commitId) {
      res.status(400).json({
        success: false,
        error: 'commitId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    if (!input.clientAddress) {
      res.status(400).json({
        success: false,
        error: 'clientAddress is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const result = await openDispute(input);

    res.status(201).json({
      success: true,
      data: result,
    } satisfies ApiResponse<OpenDisputeResponse>);
  } catch (error) {
    console.error('Error opening dispute:', error);
    const message = error instanceof Error ? error.message : 'Failed to open dispute';
    const statusCode = message.includes('not found') ? 404 :
                       message.includes('Only the creator') ? 403 :
                       message.includes('window has closed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: message,
    } satisfies ApiResponse<never>);
  }
});

/**
 * POST /dispute/resolve
 * Resolve a dispute (admin/arbitrator endpoint)
 */
disputeRouter.post('/resolve', async (req: Request, res: Response) => {
  try {
    const input = req.body as ResolveDisputeRequest;

    if (!input.commitId) {
      res.status(400).json({
        success: false,
        error: 'commitId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    if (!input.resolution || !['CLIENT', 'CONTRIBUTOR'].includes(input.resolution)) {
      res.status(400).json({
        success: false,
        error: 'resolution must be either CLIENT or CONTRIBUTOR',
      } satisfies ApiResponse<never>);
      return;
    }

    // Admin authentication
    if (!input.adminSecret || input.adminSecret !== ADMIN_SECRET) {
      res.status(401).json({
        success: false,
        error: 'Invalid admin credentials',
      } satisfies ApiResponse<never>);
      return;
    }

    const result = await resolveDispute(input);

    res.status(200).json({
      success: true,
      data: result,
    } satisfies ApiResponse<ResolveDisputeResponse>);
  } catch (error) {
    console.error('Error resolving dispute:', error);
    const message = error instanceof Error ? error.message : 'Failed to resolve dispute';
    const statusCode = message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: message,
    } satisfies ApiResponse<never>);
  }
});

/**
 * GET /dispute/:commitId
 * Get dispute details for a commitment
 */
disputeRouter.get('/:commitId', async (req: Request, res: Response) => {
  try {
    const { commitId } = req.params;

    if (!commitId) {
      res.status(400).json({
        success: false,
        error: 'Commitment ID is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const dispute = await getDispute(commitId);

    if (!dispute) {
      res.status(404).json({
        success: false,
        error: 'No dispute found for this commitment',
      } satisfies ApiResponse<never>);
      return;
    }

    res.status(200).json({
      success: true,
      data: dispute,
    } satisfies ApiResponse<Dispute>);
  } catch (error) {
    console.error('Error getting dispute:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dispute',
    } satisfies ApiResponse<never>);
  }
});
