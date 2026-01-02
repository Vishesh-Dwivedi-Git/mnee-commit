import Mnee from '@mnee/ts-sdk';

/**
 * MNEE SDK singleton instance
 * 
 * This is the only place where MNEE is initialized.
 * All other modules should import from here.
 */
const apiKey = process.env['MNEE_API_KEY'];
export const mnee = new Mnee({
  environment: (process.env['MNEE_ENV'] as 'sandbox' | 'production') || 'sandbox',
  ...(apiKey ? { apiKey } : {}),
});

/**
 * Escrow wallet address (server-controlled)
 */
export const ESCROW_ADDRESS = process.env['ESCROW_ADDRESS'] ?? '';

/**
 * Escrow wallet private key (WIF format)
 */
export const ESCROW_WIF = process.env['ESCROW_WIF'] ?? '';

/**
 * Dispute stake percentage (e.g., 10 = 10%)
 */
export const DISPUTE_STAKE_PERCENT = parseInt(process.env['DISPUTE_STAKE_PERCENT'] ?? '10', 10);

/**
 * Validate required environment variables
 */
export function validateMneeConfig(): void {
  const errors: string[] = [];

  if (!process.env['MNEE_API_KEY']) {
    errors.push('MNEE_API_KEY is required');
  }
  if (!process.env['ESCROW_ADDRESS']) {
    errors.push('ESCROW_ADDRESS is required');
  }
  if (!process.env['ESCROW_WIF']) {
    errors.push('ESCROW_WIF is required');
  }

  if (errors.length > 0) {
    console.warn('MNEE Configuration Warnings:');
    errors.forEach((err) => console.warn(`${err}`));
    console.warn('Some features may not work correctly.');
  }
}
