#!/bin/bash

# Kill all running dev servers and processes

echo "🔍 Finding running processes..."

# Kill npm processes
pkill -f "npm run dev" 2>/dev/null && echo "✓ Killed npm dev servers"

# Kill node processes (be careful - this kills ALL node processes)
# pkill -f "node" 2>/dev/null && echo "✓ Killed node processes"

# Kill Next.js dev servers specifically
pkill -f "next dev" 2>/dev/null && echo "✓ Killed Next.js dev servers"

# Kill any remaining processes on common ports
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✓ Freed port 3000 (frontend)"
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "✓ Freed port 3001 (server)"
lsof -ti:8545 | xargs kill -9 2>/dev/null && echo "✓ Freed port 8545 (anvil)"

echo ""
echo "✅ All processes killed"
echo ""
echo "To start fresh:"
echo "  Terminal 1: cd contracts && ./scripts/start-anvil.sh"
echo "  Terminal 2: cd server && npm run dev"
echo "  Terminal 3: cd frontend && npm run dev"
