import dotenv from 'dotenv';

dotenv.config();

/**
 * Server Configuration
 */
export const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
export const SERVER_BASE_URL = process.env['SERVER_BASE_URL'] ?? 'http://localhost:3000';

/**
 * Smart Contract Configuration
 */
export const CHAIN_ID = parseInt(process.env['CHAIN_ID'] ?? '84532', 10); // Base Sepolia
export const RPC_URL = process.env['RPC_URL'] ?? 'https://sepolia.base.org';
export const CONTRACT_ADDRESS = process.env['CONTRACT_ADDRESS'] ?? '';

/**
 * Orchestrator Wallet (for relayer operations)
 * This wallet calls settle() and other public contract functions
 */
export const ORCHESTRATOR_PRIVATE_KEY = process.env['ORCHESTRATOR_PRIVATE_KEY'] ?? '';

/**
 * Agent Configuration
 */
export const GITHUB_AGENT_ENABLED = process.env['GITHUB_AGENT_ENABLED'] === 'true';
export const OPENAI_API_KEY = process.env['OPENAI_API_KEY'] ?? '';

/**
 * IPFS Configuration (for evidence storage)
 */
export const PINATA_API_KEY = process.env['PINATA_API_KEY'] ?? '';
export const PINATA_SECRET_KEY = process.env['PINATA_SECRET_KEY'] ?? '';

/**
 * Protocol Configuration
 */
export const DISPUTE_STAKE_BASE = BigInt(process.env['DISPUTE_STAKE_BASE'] ?? '1000000000000000000'); // 1 ETH in wei
export const REPUTATION_SCALING_CONSTANT = parseInt(process.env['REPUTATION_SCALING_CONSTANT'] ?? '10000', 10);

/**
 * Admin secret for override operations
 */
export const ADMIN_SECRET = process.env['ADMIN_SECRET'] ?? '';

/**
 * Validate required environment variables
 */
export function validateConfig(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!CONTRACT_ADDRESS) {
    errors.push('CONTRACT_ADDRESS is required');
  }
  if (!RPC_URL) {
    errors.push('RPC_URL is required');
  }

  // Orchestrator wallet is optional - manual settlement will be required if not configured
  if (!ORCHESTRATOR_PRIVATE_KEY) {
    warnings.push('ORCHESTRATOR_PRIVATE_KEY not configured - automatic settlement is DISABLED');
    warnings.push('Users will need to manually call settle() on Etherscan');
  }

  // Agent configuration warnings
  if (GITHUB_AGENT_ENABLED && !OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY not configured - GitHub Agent will not function');
  }

  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    warnings.push('IPFS credentials not configured - evidence storage will fail');
  }

  if (errors.length > 0) {
    console.error('Configuration Errors:');
    errors.forEach((err) => console.error(`  ❌ ${err}`));
    console.error('Server may not function correctly.');
  }

  if (warnings.length > 0) {
    console.warn('Configuration Warnings:');
    warnings.forEach((warn) => console.warn(`  ⚠️  ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Configuration validated successfully');
  }
}
