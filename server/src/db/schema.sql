-- Commit Protocol Database Schema
-- SQLite

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
