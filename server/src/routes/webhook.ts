import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ApiResponse, ContractEventPayload } from '../types/commit.js';

export const webhookRouter = Router();

/**
 * POST /webhook/contract
 * Handle contract events from indexer/listener
 * 
 * Events:
 * - CommitCreated: Sync off-chain record with on-chain commit ID
 * - WorkSubmitted: Trigger AI verification agents
 * - DisputeOpened: Update dispute state
 * - CommitSettled: Mark as settled
 */
webhookRouter.post('/contract', async (req: Request, res: Response) => {
  try {
    const event = req.body as ContractEventPayload;

    if (!event.eventName || !event.commitId) {
      res.status(400).json({
        success: false,
        error: 'eventName and commitId are required',
      } satisfies ApiResponse<never>);
      return;
    }

    console.log(`[Webhook] Received ${event.eventName} for commit ${event.commitId}`);

    switch (event.eventName) {
      case 'CommitCreated':
        // TODO: Sync off-chain record with on-chain commit ID
        console.log(`[Webhook] CommitCreated: ${JSON.stringify(event.data)}`);
        break;

      case 'WorkSubmitted':
        // TODO: Trigger AI verification agents
        console.log(`[Webhook] WorkSubmitted: triggering agents`);
        break;

      case 'DisputeOpened':
        // TODO: Update dispute state to OPEN
        console.log(`[Webhook] DisputeOpened: updating state`);
        break;

      case 'CommitSettled':
        // TODO: Mark as settled
        console.log(`[Webhook] CommitSettled: marking complete`);
        break;

      default:
        console.log(`[Webhook] Unknown event: ${event.eventName}`);
    }

    res.status(200).json({
      success: true,
      data: { received: event.eventName },
    } satisfies ApiResponse<{ received: string }>);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process webhook',
    } satisfies ApiResponse<never>);
  }
});

/**
 * GET /webhook/health
 * Webhook endpoint health check
 */
webhookRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: 'ok', endpoint: 'contract-webhook' },
  } satisfies ApiResponse<{ status: string; endpoint: string }>);
});
