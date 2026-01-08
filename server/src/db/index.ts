/**
 * Database Module - Prisma Client
 * PostgreSQL + Supabase
 */

import { PrismaClient, CommitmentState, DisputeState } from '@prisma/client';
import type { Commitment, Dispute } from '../types/commit.js';

// Singleton Prisma Client instance
let prisma: PrismaClient | null = null;

/**
 * Get Prisma Client instance (lazy initialization)
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<void> {
  const db = getPrisma();
  try {
    await db.$connect();
    console.log('✅ Database connected (PostgreSQL via Prisma)');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    console.log('Database disconnected');
  }
}

// ============================================================================
// Type Converters (Prisma <-> App Types)
// ============================================================================

function prismaToCommitment(record: any): Commitment {
  return {
    id: record.id,
    clientAddress: record.clientAddress,
    contributorAddress: record.contributorAddress,
    amount: Number(record.amount),
    tokenAddress: record.tokenAddress,
    deliveryDeadline: Number(record.deliveryDeadline),
    releaseAfter: Number(record.releaseAfter),
    state: record.state as Commitment['state'],
    metadataHash: record.metadataHash,
    specCid: record.specCid,
    deliverableHash: record.deliverableHash,
    evidenceCid: record.evidenceCid,
    onChainCommitId: record.onChainCommitId,
    createdAt: Number(record.createdAt),
    deliveredAt: record.deliveredAt ? Number(record.deliveredAt) : null,
  };
}

function prismaToDispute(record: any): Dispute {
  return {
    id: record.id,
    commitmentId: record.commitmentId,
    stakeAmount: record.stakeAmount,
    onChainStakeTicketId: record.onChainStakeTicketId,
    state: record.state as Dispute['state'],
    reason: record.reason,
    createdAt: Number(record.createdAt),
    resolvedAt: record.resolvedAt ? Number(record.resolvedAt) : null,
  };
}

// ============================================================================
// Commitment Queries
// ============================================================================

export async function insertCommitment(commitment: Commitment): Promise<void> {
  const db = getPrisma();
  await db.commitment.create({
    data: {
      id: commitment.id,
      clientAddress: commitment.clientAddress,
      contributorAddress: commitment.contributorAddress,
      amount: commitment.amount.toString(), // Decimal expects string
      tokenAddress: commitment.tokenAddress,
      deliveryDeadline: BigInt(commitment.deliveryDeadline),
      releaseAfter: BigInt(commitment.releaseAfter),
      state: commitment.state as CommitmentState,
      metadataHash: commitment.metadataHash,
      specCid: commitment.specCid,
      deliverableHash: commitment.deliverableHash,
      evidenceCid: commitment.evidenceCid,
      onChainCommitId: commitment.onChainCommitId,
      createdAt: BigInt(commitment.createdAt),
      deliveredAt: commitment.deliveredAt ? BigInt(commitment.deliveredAt) : null,
    },
  });
}

export async function getCommitmentById(id: string): Promise<Commitment | undefined> {
  const db = getPrisma();
  const record = await db.commitment.findUnique({
    where: { id },
  });
  return record ? prismaToCommitment(record) : undefined;
}

export async function getCommitmentsByAddress(address: string): Promise<Commitment[]> {
  const db = getPrisma();
  const records = await db.commitment.findMany({
    where: {
      OR: [
        { clientAddress: address },
        { contributorAddress: address },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return records.map(prismaToCommitment);
}

export async function getSettleableCommitments(currentTime: number): Promise<Commitment[]> {
  const db = getPrisma();
  const records = await db.commitment.findMany({
    where: {
      state: 'SUBMITTED',
      releaseAfter: {
        lt: BigInt(currentTime),
      },
      dispute: null, // No active dispute
    },
  });
  return records.map(prismaToCommitment);
}

export async function updateCommitmentState(
  id: string,
  state: Commitment['state'],
  deliveredAt?: number,
  deliverableHash?: string
): Promise<void> {
  const db = getPrisma();
  await db.commitment.update({
    where: { id },
    data: {
      state: state as CommitmentState,
      ...(deliveredAt !== undefined && { deliveredAt: BigInt(deliveredAt) }),
      ...(deliverableHash !== undefined && { deliverableHash }),
    },
  });
}

export async function updateCommitmentOnChainId(id: string, onChainCommitId: string): Promise<void> {
  const db = getPrisma();
  await db.commitment.update({
    where: { id },
    data: { onChainCommitId },
  });
}

// ============================================================================
// Dispute Queries
// ============================================================================

export async function insertDispute(dispute: Dispute): Promise<void> {
  const db = getPrisma();
  await db.dispute.create({
    data: {
      id: dispute.id,
      commitmentId: dispute.commitmentId,
      stakeAmount: dispute.stakeAmount,
      onChainStakeTicketId: dispute.onChainStakeTicketId,
      state: dispute.state as DisputeState,
      reason: dispute.reason,
      createdAt: BigInt(dispute.createdAt),
      resolvedAt: dispute.resolvedAt ? BigInt(dispute.resolvedAt) : null,
    },
  });
}

export async function getDisputeByCommitmentId(commitmentId: string): Promise<Dispute | undefined> {
  const db = getPrisma();
  const record = await db.dispute.findUnique({
    where: { commitmentId },
  });
  return record ? prismaToDispute(record) : undefined;
}

export async function updateDisputeState(
  id: string,
  state: Dispute['state'],
  resolvedAt?: number
): Promise<void> {
  const db = getPrisma();
  await db.dispute.update({
    where: { id },
    data: {
      state: state as DisputeState,
      resolvedAt: resolvedAt ? BigInt(resolvedAt) : null,
    },
  });
}

// ============================================================================
// Contract Event Queries
// ============================================================================

export async function insertContractEvent(event: {
  id: string;
  eventName: string;
  commitId: string;
  blockNumber: number;
  transactionHash: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const db = getPrisma();
  await db.contractEvent.create({
    data: {
      id: event.id,
      eventName: event.eventName,
      commitId: event.commitId,
      blockNumber: BigInt(event.blockNumber),
      transactionHash: event.transactionHash,
      data: event.data as any, // Prisma Json type
      createdAt: BigInt(Date.now()),
    },
  });
}

export async function getUnprocessedEvents(): Promise<Array<{
  id: string;
  eventName: string;
  commitId: string;
  blockNumber: number;
  data: Record<string, unknown>;
}>> {
  const db = getPrisma();
  const records = await db.contractEvent.findMany({
    where: { processed: false },
    orderBy: { blockNumber: 'asc' },
  });
  
  return records.map(record => ({
    id: record.id,
    eventName: record.eventName,
    commitId: record.commitId,
    blockNumber: Number(record.blockNumber),
    data: record.data as Record<string, unknown>,
  }));
}

export async function markEventProcessed(id: string): Promise<void> {
  const db = getPrisma();
  await db.contractEvent.update({
    where: { id },
    data: { processed: true },
  });
}

// Re-export Prisma instance for direct queries if needed
export { getPrisma as getDb };
