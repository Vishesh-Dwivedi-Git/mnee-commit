/**
 * Auto-settlement Scheduler
 * 
 * Runs periodically to find and settle eligible commitments.
 * Calls batchSettle() on the smart contract.
 */

import {
  getPendingSettlements,
  batchSettle,
  getMaxBatchSize,
  isContractConfigured,
  canWrite,
} from './contractService.js';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Process settleable commitments
 */
async function processSettleableCommitments(): Promise<void> {
  if (!isContractConfigured()) {
    return;
  }

  if (!canWrite()) {
    console.log('[Scheduler] Skipping - no relayer key configured');
    return;
  }

  try {
    console.log('[Scheduler] Checking for pending settlements...');
    const pending = await getPendingSettlements();

    if (pending.length === 0) {
      console.log('[Scheduler] No pending settlements found');
      return;
    }

    console.log(`[Scheduler] Found ${pending.length} commitment(s) ready for settlement:`);
    pending.forEach(p => console.log(`  - Commitment #${p.commitId}: ${p.commitment.amount} wei to ${p.commitment.contributor}`));

    // Get max batch size from contract
    const maxBatchSize = await getMaxBatchSize();

    // Process in batches
    const commitIds = pending.map(p => p.commitId);
    console.log(`[Scheduler] Processing commit IDs: [${commitIds.join(', ')}]`);

    for (let i = 0; i < commitIds.length; i += maxBatchSize) {
      const batch = commitIds.slice(i, i + maxBatchSize);

      try {
        console.log(`[Scheduler] Settling batch: [${batch.join(', ')}]`);
        const txHash = await batchSettle(batch);
        console.log(`[Scheduler] ✅ Settled ${batch.length} commitments. TX: ${txHash}`);
      } catch (error) {
        console.error(`[Scheduler] Failed to settle batch:`, error);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error processing settlements:', error);
  }
}

/**
 * Start the auto-settlement scheduler
 * @param intervalMs Interval in milliseconds (default: 60 seconds)
 */
export function startScheduler(intervalMs: number = 60_000): void {
  if (schedulerInterval) {
    console.warn('[Scheduler] Already running');
    return;
  }

  if (!isContractConfigured()) {
    console.warn('[Scheduler] Contract not configured - scheduler disabled');
    return;
  }

  if (!canWrite()) {
    console.warn('[Scheduler] No relayer key - scheduler disabled');
    return;
  }

  console.log(`[Scheduler] Starting auto-settlement scheduler (interval: ${intervalMs}ms)`);

  // Run immediately on start
  processSettleableCommitments().catch(console.error);

  // Then run periodically
  schedulerInterval = setInterval(() => {
    processSettleableCommitments().catch(console.error);
  }, intervalMs);
}

/**
 * Stop the auto-settlement scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Manually trigger the scheduler (for testing)
 */
export async function triggerScheduler(): Promise<void> {
  await processSettleableCommitments();
}
