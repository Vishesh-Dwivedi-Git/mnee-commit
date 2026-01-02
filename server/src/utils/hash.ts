import crypto from 'crypto';

/**
 * Generate SHA-256 hash of metadata object
 */
export function hashMetadata(metadata: Record<string, unknown>): string {
  const json = JSON.stringify(metadata, Object.keys(metadata).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Generate a unique commitment ID
 */
export function generateCommitmentId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique dispute ID
 */
export function generateDisputeId(): string {
  return crypto.randomUUID();
}
