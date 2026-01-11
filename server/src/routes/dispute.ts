/**
 * Dispute Routes
 * POST /dispute/open      - Open dispute with stake
 * GET  /dispute/:commitId - Get dispute details
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  openDispute,
  getDispute,
  calculateStake,
} from '../services/contractService.js';
import type {
  ApiResponse,
  OpenDisputeRequest,
  OpenDisputeResponse,
  DisputeData,
} from '../types/index.js';

export const disputeRouter = Router();

/**
 * GET /dispute/calculate-stake/:commitId
 * Calculate required stake for a commitment
 */
disputeRouter.get('/calculate-stake/:commitId', async (req: Request, res: Response) => {
  try {
    const { commitId } = req.params;

    if (!commitId) {
      res.status(400).json({
        success: false,
        error: 'commitId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    const stakeAmount = await calculateStake(parseInt(commitId));

    res.status(200).json({
      success: true,
      data: stakeAmount,
    } satisfies ApiResponse<string>);
  } catch (error) {
    console.error('Error calculating stake:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate stake',
    } satisfies ApiResponse<never>);
  }
});

/**
 * POST /dispute/open
 * Open a dispute for a commitment (requires stake)
 */
disputeRouter.post('/open', async (req: Request, res: Response) => {
  try {
    const input = req.body as OpenDisputeRequest;

    if (!input.guildId) {
      res.status(400).json({
        success: false,
        error: 'guildId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    if (input.commitId === undefined || input.commitId === null) {
      res.status(400).json({
        success: false,
        error: 'commitId is required',
      } satisfies ApiResponse<never>);
      return;
    }

    // Calculate stake amount for response (equal to commitment amount)
    const stakeAmount = await calculateStake(input.commitId);

    // Open dispute - stake is automatically deducted from server balance
    const txHash = await openDispute(input.guildId, input.commitId);

    res.status(201).json({
      success: true,
      data: {
        commitId: input.commitId,
        stakeAmount,
        txHash,
        message: `Dispute opened for commitment #${input.commitId}. Stake of ${stakeAmount} MNEE deducted from server balance.`,
      },
    } satisfies ApiResponse<OpenDisputeResponse>);
  } catch (error) {
    console.error('Error opening dispute:', error);
    const message = error instanceof Error ? error.message : 'Failed to open dispute';
    const statusCode = message.includes('not found') ? 404 :
      message.includes('Only') ? 403 :
        message.includes('window') ? 400 : 500;
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
    const commitId = parseInt(req.params.commitId ?? '', 10);

    if (isNaN(commitId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid commitment ID',
      } satisfies ApiResponse<never>);
      return;
    }

    const dispute = await getDispute(commitId);

    // Check if dispute exists (disputer address would be zero for non-existent)
    if (dispute.disputer === '0x0000000000000000000000000000000000000000') {
      res.status(404).json({
        success: false,
        error: 'No dispute found for this commitment',
      } satisfies ApiResponse<never>);
      return;
    }

    res.status(200).json({
      success: true,
      data: { ...dispute, commitId },
    } satisfies ApiResponse<DisputeData & { commitId: number }>);
  } catch (error) {
    console.error('Error getting dispute:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dispute',
    } satisfies ApiResponse<never>);
  }
});
