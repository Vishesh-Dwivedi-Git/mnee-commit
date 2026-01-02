import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Commitment, Dispute } from '../types/commit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../../data/commit-protocol.db');

// Database schema (embedded to avoid file copying issues in production build)
const SCHEMA = `
-- Commitments table: tracks the lifecycle of each commitment
CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  client_address TEXT NOT NULL,
  contributor_address TEXT NOT NULL,
  amount REAL NOT NULL,
  delivery_deadline INTEGER NOT NULL,
  release_after INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('CREATED', 'DELIVERED', 'RELEASED', 'DISPUTED', 'REFUNDED')),
  metadata_hash TEXT,
  deliverable_hash TEXT,
  transfer_ticket_id TEXT,
  created_at INTEGER NOT NULL,
  delivered_at INTEGER
);

-- Disputes table: tracks active disputes
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  commitment_id TEXT NOT NULL UNIQUE,
  stake_amount REAL NOT NULL,
  stake_ticket_id TEXT,
  state TEXT NOT NULL CHECK(state IN ('OPEN', 'RESOLVED_CLIENT', 'RESOLVED_CONTRIBUTOR')),
  reason TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (commitment_id) REFERENCES commitments(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_commitments_client ON commitments(client_address);
CREATE INDEX IF NOT EXISTS idx_commitments_contributor ON commitments(contributor_address);
CREATE INDEX IF NOT EXISTS idx_commitments_state ON commitments(state);
CREATE INDEX IF NOT EXISTS idx_disputes_commitment ON disputes(commitment_id);
`;

// Lazy-initialized database instance
let _db: DatabaseType | null = null;

/**
 * Get database instance (lazy initialization)
 */
export function getDb(): DatabaseType {
  if (!_db) {
    // Ensure data directory exists
    const dataDir = dirname(dbPath);
    mkdirSync(dataDir, { recursive: true });
    
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  const db = getDb();
  db.exec(SCHEMA);
  console.log('Database initialized');
}

// ============================================================================
// Commitment Queries
// ============================================================================

export function insertCommitment(commitment: Commitment): void {
  const stmt = getDb().prepare(`
    INSERT INTO commitments (
      id, client_address, contributor_address, amount,
      delivery_deadline, release_after, state, metadata_hash,
      deliverable_hash, transfer_ticket_id, created_at, delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    commitment.id,
    commitment.clientAddress,
    commitment.contributorAddress,
    commitment.amount,
    commitment.deliveryDeadline,
    commitment.releaseAfter,
    commitment.state,
    commitment.metadataHash,
    commitment.deliverableHash,
    commitment.transferTicketId,
    commitment.createdAt,
    commitment.deliveredAt
  );
}

export function getCommitmentById(id: string): Commitment | undefined {
  const stmt = getDb().prepare(`SELECT * FROM commitments WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? mapRowToCommitment(row) : undefined;
}

export function getCommitmentsByAddress(address: string): Commitment[] {
  const stmt = getDb().prepare(`
    SELECT * FROM commitments 
    WHERE client_address = ? OR contributor_address = ?
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(address, address) as Record<string, unknown>[];
  return rows.map(mapRowToCommitment);
}

export function getReleasableCommitments(currentTime: number): Commitment[] {
  const stmt = getDb().prepare(`
    SELECT c.* FROM commitments c
    LEFT JOIN disputes d ON c.id = d.commitment_id
    WHERE c.state = 'DELIVERED'
    AND c.release_after < ?
    AND d.id IS NULL
  `);
  const rows = stmt.all(currentTime) as Record<string, unknown>[];
  return rows.map(mapRowToCommitment);
}

export function updateCommitmentState(
  id: string,
  state: Commitment['state'],
  deliveredAt?: number,
  deliverableHash?: string
): void {
  if (deliveredAt !== undefined && deliverableHash !== undefined) {
    const stmt = getDb().prepare(`
      UPDATE commitments 
      SET state = ?, delivered_at = ?, deliverable_hash = ?
      WHERE id = ?
    `);
    stmt.run(state, deliveredAt, deliverableHash, id);
  } else {
    const stmt = getDb().prepare(`UPDATE commitments SET state = ? WHERE id = ?`);
    stmt.run(state, id);
  }
}

function mapRowToCommitment(row: Record<string, unknown>): Commitment {
  return {
    id: row['id'] as string,
    clientAddress: row['client_address'] as string,
    contributorAddress: row['contributor_address'] as string,
    amount: row['amount'] as number,
    deliveryDeadline: row['delivery_deadline'] as number,
    releaseAfter: row['release_after'] as number,
    state: row['state'] as Commitment['state'],
    metadataHash: row['metadata_hash'] as string | null,
    deliverableHash: row['deliverable_hash'] as string | null,
    transferTicketId: row['transfer_ticket_id'] as string | null,
    createdAt: row['created_at'] as number,
    deliveredAt: row['delivered_at'] as number | null,
  };
}

// ============================================================================
// Dispute Queries
// ============================================================================

export function insertDispute(dispute: Dispute): void {
  const stmt = getDb().prepare(`
    INSERT INTO disputes (
      id, commitment_id, stake_amount, stake_ticket_id,
      state, reason, created_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    dispute.id,
    dispute.commitmentId,
    dispute.stakeAmount,
    dispute.stakeTicketId,
    dispute.state,
    dispute.reason,
    dispute.createdAt,
    dispute.resolvedAt
  );
}

export function getDisputeByCommitmentId(commitmentId: string): Dispute | undefined {
  const stmt = getDb().prepare(`SELECT * FROM disputes WHERE commitment_id = ?`);
  const row = stmt.get(commitmentId) as Record<string, unknown> | undefined;
  return row ? mapRowToDispute(row) : undefined;
}

export function updateDisputeState(
  id: string,
  state: Dispute['state'],
  resolvedAt?: number
): void {
  const stmt = getDb().prepare(`
    UPDATE disputes SET state = ?, resolved_at = ? WHERE id = ?
  `);
  stmt.run(state, resolvedAt ?? null, id);
}

function mapRowToDispute(row: Record<string, unknown>): Dispute {
  return {
    id: row['id'] as string,
    commitmentId: row['commitment_id'] as string,
    stakeAmount: row['stake_amount'] as number,
    stakeTicketId: row['stake_ticket_id'] as string | null,
    state: row['state'] as Dispute['state'],
    reason: row['reason'] as string | null,
    createdAt: row['created_at'] as number,
    resolvedAt: row['resolved_at'] as number | null,
  };
}
