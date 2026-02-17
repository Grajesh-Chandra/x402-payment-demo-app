#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║      x402 Payment Protocol Demo — Setup          ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "  ✅ Setup complete!"
echo ""
echo "  To run the demo:"
echo "  ─────────────────────────────────────────────────"
echo "  Terminal 1 (Resource Server):"
echo "    cd server && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:3000"
echo "  ─────────────────────────────────────────────────"
echo ""
echo "  ⚠️  Before testing payments:"
echo "  1. Add your testnet private key to server/.env"
echo "  2. Get testnet USDC on Base Sepolia"
echo "     Faucet: https://faucet.circle.com/"
echo ""
