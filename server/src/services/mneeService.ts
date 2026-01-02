import { mnee, ESCROW_ADDRESS, ESCROW_WIF } from '../config/mnee.js';

/**
 * Transfer MNEE from sender to escrow wallet
 */
export async function transferToEscrow(
  amount: number,
  senderWif: string
): Promise<{ ticketId: string | null }> {
  if (!ESCROW_ADDRESS) {
    throw new Error('ESCROW_ADDRESS not configured');
  }

  const result = await mnee.transfer(
    [{ address: ESCROW_ADDRESS, amount }],
    senderWif,
    { broadcast: true }
  );

  return { ticketId: result.ticketId ?? null };
}

/**
 * Release MNEE from escrow to contributor
 */
export async function releaseToContributor(
  amount: number,
  contributorAddress: string
): Promise<{ ticketId: string | null }> {
  if (!ESCROW_WIF) {
    throw new Error('ESCROW_WIF not configured');
  }

  const result = await mnee.transfer(
    [{ address: contributorAddress, amount }],
    ESCROW_WIF,
    { broadcast: true }
  );

  return { ticketId: result.ticketId ?? null };
}

/**
 * Refund MNEE from escrow to client
 */
export async function refundToClient(
  amount: number,
  clientAddress: string
): Promise<{ ticketId: string | null }> {
  if (!ESCROW_WIF) {
    throw new Error('ESCROW_WIF not configured');
  }

  const result = await mnee.transfer(
    [{ address: clientAddress, amount }],
    ESCROW_WIF,
    { broadcast: true }
  );

  return { ticketId: result.ticketId ?? null };
}

/**
 * Get MNEE balance for an address
 */
export async function getBalance(address: string): Promise<number> {
  const balance = await mnee.balance(address);
  return balance.amount;
}

/**
 * Get transaction status by ticket ID
 */
export async function getTransactionStatus(ticketId: string) {
  return await mnee.getTxStatus(ticketId);
}
