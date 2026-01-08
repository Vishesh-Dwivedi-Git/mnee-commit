import 'dotenv/config';
import express from 'express';

import { initializeDatabase, disconnectDatabase } from './db/index.js';
import { validateConfig, PORT } from './config/index.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { commitRouter } from './routes/commit.js';
import { disputeRouter } from './routes/dispute.js';
import { webhookRouter } from './routes/webhook.js';

// ============================================================================
// Server Configuration
// ============================================================================

const app = express();

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'v1.0-erc20',
  });
});

// API routes
app.use('/commit', commitRouter);
app.use('/dispute', disputeRouter);
app.use('/webhook', webhookRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Not found: ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ============================================================================
// Server Startup
// ============================================================================

async function main(): Promise<void> {
  console.log('Starting Commit Protocol Orchestrator...\n');

  // Validate configuration
  validateConfig();

  // Initialize database (Prisma + PostgreSQL)
  await initializeDatabase();

  // Start scheduler (for automatic settlement)
  startScheduler();

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`\nOrchestrator running on http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('POST /commit/create     - Create new commitment');
    console.log('POST /commit/deliver    - Submit work for a commitment');
    console.log('GET  /commit/:id        - Get commitment details');
    console.log('GET  /commit/list/:addr - List commitments by address');
    console.log('POST /dispute/open      - Open dispute');
    console.log('POST /dispute/resolve   - Resolve dispute');
    console.log('GET  /dispute/:commitId - Get dispute details');
    console.log('POST /webhook/contract  - Contract event webhook');
    console.log('GET  /health            - Health check\n');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    stopScheduler();
    await disconnectDatabase();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
