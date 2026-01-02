import 'dotenv/config';
import express from 'express';

import { initializeDatabase } from './db/index.js';
import { validateMneeConfig } from './config/mnee.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { commitRouter } from './routes/commit.js';
import { disputeRouter } from './routes/dispute.js';
import { webhookRouter } from './routes/webhook.js';

// ============================================================================
// Server Configuration
// ============================================================================

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
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
    environment: process.env['MNEE_ENV'] ?? 'sandbox',
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
  console.log('Starting Commit Protocol Server...\n');

  // Validate MNEE configuration
  validateMneeConfig();

  // Initialize database (also creates data directory)
  initializeDatabase();

  // Start scheduler
  startScheduler();

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env['MNEE_ENV'] ?? 'sandbox'}`);
    console.log('\nAvailable endpoints:');
    console.log('POST /commit/create     - Create new commitment');
    console.log('POST /commit/deliver    - Mark as delivered');
    console.log('GET  /commit/:id        - Get commitment details');
    console.log('GET  /commit/list/:addr - List commitments by address');
    console.log('POST /dispute/open      - Open dispute');
    console.log('POST /dispute/resolve   - Resolve dispute');
    console.log('GET  /dispute/:commitId - Get dispute details');
    console.log('POST /webhook/mnee      - MNEE webhook handler');
    console.log('GET  /health            - Health check\n');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    stopScheduler();
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
