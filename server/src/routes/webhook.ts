import { Router } from 'express';
import type { Request, Response } from 'express';
import type { MneeWebhookPayload } from '../types/commit.js';

export const webhookRouter = Router();

/**
 * POST /webhook/mnee
 * Handle MNEE transaction status webhooks
 */
webhookRouter.post('/mnee', (req: Request, res: Response) => {
  try {
    const payload = req.body as MneeWebhookPayload;

    // Log the webhook for audit trail
    console.log('MNEE Webhook received:', {
      id: payload.id,
      tx_id: payload.tx_id,
      status: payload.status,
      action: payload.action_requested,
      timestamp: new Date().toISOString(),
    });

    // Handle different statuses
    switch (payload.status) {
      case 'BROADCASTING':
        console.log(`Transaction ${payload.tx_id} is broadcasting...`);
        break;
      case 'SUCCESS':
        console.log(`Transaction ${payload.tx_id} broadcast successful`);
        break;
      case 'MINED':
        console.log(`Transaction ${payload.tx_id} confirmed in block`);
        break;
      case 'FAILED':
        console.error(`Transaction ${payload.tx_id} failed:`, payload.errors);
        break;
    }

    // TODO: Optionally update UI/notifications based on status
    // TODO: Store webhook events for audit log

    // Always respond with 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing MNEE webhook:', error);
    // Still respond with 200 to prevent retries
    res.sendStatus(200);
  }
});
