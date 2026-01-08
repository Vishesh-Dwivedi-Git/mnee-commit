import { getSettleableCommitments, updateCommitmentState } from '../db/index.js';
import { isContractConfigured } from './contractService.js';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Auto-settlement scheduler (Relayer)
 * 
 * Runs periodically to check for commitments that:
 * 1. Are in SUBMITTED state
 * 2. Have passed the release_after timestamp (dispute window closed)
 * 3. Have no active disputes
 * 
 * These commitments are eligible for automatic settlement.
 * The scheduler calls settle() on the smart contract to release funds.
 * 
 * NOTE: settle() is a public function - if the relayer is down,
 * users can manually call it on Etherscan.
 */
async function processSettleableCommitments(): Promise<void> {
  const now = Date.now();
  const settleable = await getSettleableCommitments(now);

  if (settleable.length === 0) {
    return;
  }

  console.log(`[Scheduler] Found ${settleable.length} commitment(s) ready for settlement`);

  for (const commitment of settleable) {
    try {
      if (isContractConfigured()) {
        // TODO: Call settle() on smart contract
        // const txHash = await settleCommitment(commitment.onChainCommitId);
        console.log(`[Scheduler] Would settle commitment ${commitment.id} on-chain`);
      }

      // Update local state to SETTLED
      await updateCommitmentState(commitment.id, 'SETTLED');

      console.log(`[Scheduler] Marked commitment ${commitment.id} as settled`);
    } catch (error) {
      console.error(`[Scheduler] Failed to settle commitment ${commitment.id}:`, error);
      // Continue with other commitments even if one fails
    }
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
