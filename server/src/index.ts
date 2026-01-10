import 'dotenv/config';
import express from 'express';

import { validateConfig, PORT } from './config/index.js';
import { initializeContract, isContractConfigured } from './services/contractService.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';
import { isIpfsConfigured } from './services/ipfsService.js';
import { connectToMongoDB, disconnectFromMongoDB, isMongoDBConnected } from './services/mongoService.js';
import { serverRouter } from './routes/server.js';
import { commitRouter } from './routes/commit.js';
import { disputeRouter } from './routes/dispute.js';
import { settlementRouter } from './routes/settlement.js';
import { adminRouter } from './routes/admin.js';
import { agentRouter } from './routes/agent.js';
import { userRouter } from './routes/user.js';

// ============================================================================
// Server Configuration
// ============================================================================

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for document uploads

// CORS middleware - allow frontend to access API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

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
    version: 'v2.2-users',
    contractConfigured: isContractConfigured(),
    ipfsConfigured: isIpfsConfigured(),
    mongoConnected: isMongoDBConnected(),
  });
});

// API routes
app.use('/server', serverRouter);
app.use('/commit', commitRouter);
app.use('/dispute', disputeRouter);
app.use('/settlement', settlementRouter);
app.use('/admin', adminRouter);
app.use('/agent', agentRouter);
app.use('/user', userRouter);

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
  console.log('Starting MNEE Commit Protocol Server...\n');

  // Validate configuration
  validateConfig();

  // Initialize contract connection
  initializeContract();

  // Connect to MongoDB
  await connectToMongoDB();

  // Start scheduler (for automatic settlement)
  startScheduler();

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log('\n=== Available Endpoints ===\n');

    console.log('Server Management:');
    console.log('  POST /server/register          - Register Discord server (15 MNEE)');
    console.log('  POST /server/:guildId/deposit  - Deposit MNEE to balance');
    console.log('  POST /server/:guildId/withdraw - Withdraw MNEE');
    console.log('  GET  /server/:guildId          - Get server info & balance');

    console.log('\nCommitments:');
    console.log('  POST /commit/create              - Create commitment (deducts balance)');
    console.log('  POST /commit/:id/submit          - Submit work evidence');
    console.log('  GET  /commit/:id                 - Get commitment details');
    console.log('  GET  /commit/server/:guildId     - List by server');
    console.log('  GET  /commit/contributor/:addr   - List by contributor');

    console.log('\nDisputes:');
    console.log('  POST /dispute/open               - Open dispute with stake');
    console.log('  GET  /dispute/:commitId          - Get dispute details');

    console.log('\nSettlement:');
    console.log('  POST /settlement/batch           - Batch settle (cron job)');
    console.log('  GET  /settlement/pending         - Get pending settlements');

    console.log('\nVerification Agents:');
    console.log('  POST /agent/github               - GitHub Code Diff verification');
    console.log('  POST /agent/design               - Visual Design Diff verification');
    console.log('  POST /agent/document             - Document/Research Diff verification');
    console.log('  GET  /agent/:cid                 - Retrieve evidence by CID');

    console.log('\nUser Mapping:');
    console.log('  POST /user                       - Register/update user-wallet mapping');
    console.log('  GET  /user/:username             - Get wallet by username');
    console.log('  GET  /user/wallet/:address       - Get username by wallet');
    console.log('  DELETE /user/:username           - Remove user mapping');

    console.log('\nHealth & Admin:');
    console.log('  GET  /health                     - Health check');
    console.log('  GET  /admin/stats                - Protocol statistics');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    stopScheduler();
    await disconnectFromMongoDB();
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
