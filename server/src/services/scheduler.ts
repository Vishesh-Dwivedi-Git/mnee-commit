import { getReleasableCommitments, updateCommitmentState } from '../db/index.js';
import { releaseToContributor } from './mneeService.js';

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Auto-release scheduler
 * 
 * Runs periodically to check for commitments that:
 * 1. Are in DELIVERED state
 * 2. Have passed the release_after timestamp
 * 3. Have no active disputes
 * 
 * These commitments are automatically released to the contributor.
 */
async function processReleasableCommitments(): Promise<void> {
  const now = Date.now();
  const releasable = getReleasableCommitments(now);

  if (releasable.length === 0) {
    return;
  }

  console.log(`Scheduler: Found ${releasable.length} commitment(s) ready for release`);

  for (const commitment of releasable) {
    try {
      // Transfer MNEE from escrow to contributor
      const { ticketId } = await releaseToContributor(
        commitment.amount,
        commitment.contributorAddress
      );

      // Update state to RELEASED
      updateCommitmentState(commitment.id, 'RELEASED');

      console.log(`Auto-released commitment ${commitment.id} to ${commitment.contributorAddress} (ticket: ${ticketId})`);
    } catch (error) {
      console.error(`Failed to release commitment ${commitment.id}:`, error);
      // Continue with other commitments even if one fails
    }
  }
}

/**
 * Start the auto-release scheduler
 * @param intervalMs Interval in milliseconds (default: 60 seconds)
 */
export function startScheduler(intervalMs: number = 60_000): void {
  if (schedulerInterval) {
    console.warn('Scheduler already running');
    return;
  }

  console.log(`Starting auto-release scheduler (interval: ${intervalMs}ms)`);

  // Run immediately on start
  processReleasableCommitments().catch(console.error);

  // Then run periodically
  schedulerInterval = setInterval(() => {
    processReleasableCommitments().catch(console.error);
  }, intervalMs);
}

/**
 * Stop the auto-release scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Scheduler stopped');
  }
}

/**
 * Manually trigger the scheduler (for testing)
 */
export async function triggerScheduler(): Promise<void> {
  await processReleasableCommitments();
}
