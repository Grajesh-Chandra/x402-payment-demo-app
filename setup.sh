#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║      x402 Payment Protocol Demo — Setup          ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# ─── Install Dependencies ───────────────────────────────────────
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# ─── Environment Configuration ──────────────────────────────────
echo ""
echo "  ─────────────────────────────────────────────────"
echo "  🔐 Environment Configuration"
echo "  ─────────────────────────────────────────────────"

ENV_FILE="server/.env"

if [ -f "$ENV_FILE" ]; then
  echo ""
  echo "  ⚠️  $ENV_FILE already exists."
  read -p "  Overwrite it? (y/N): " OVERWRITE
  if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
    echo "  Keeping existing $ENV_FILE"
    echo ""
    echo "  ✅ Setup complete! Run 'cd server && npm run dev' and 'cd frontend && npm run dev' to start."
    echo ""
    exit 0
  fi
fi

echo ""
echo "  Before configuring, you'll need a testnet wallet."
echo "  If you don't have one yet, create one using either:"
echo ""
echo "    Option A: MetaMask  → https://metamask.io/"
echo "    Option B: Vanity ETH → https://vanity-eth.tk/ (quick, runs locally)"
echo ""
echo "  Then fund it with testnet tokens:"
echo "    • ETH (gas):   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
echo "    • USDC (pays): https://faucet.circle.com/ (select Base Sepolia)"
echo ""
echo "  ─────────────────────────────────────────────────"
echo ""

# Default values
DEFAULT_PAY_TO="0x209693Bc6EfC3BEDC16a31990A4B163C56Db0434"
DEFAULT_FACILITATOR="https://x402.org/facilitator"
DEFAULT_NETWORK="eip155:84532"
DEFAULT_PORT="4021"

# Prompt for wallet address
read -p "  💰 Pay-to wallet address (receives payments)
     [default: ${DEFAULT_PAY_TO:0:10}...${DEFAULT_PAY_TO: -6}]: " PAY_TO
PAY_TO="${PAY_TO:-$DEFAULT_PAY_TO}"

echo ""

# Prompt for private key
read -p "  🔑 Wallet private key (for signing — TESTNET ONLY!)
     [starts with 0x]: " PRIVATE_KEY

if [ -z "$PRIVATE_KEY" ]; then
  PRIVATE_KEY="0x_YOUR_TESTNET_PRIVATE_KEY_HERE"
  echo ""
  echo "  ⚠️  No private key provided. You'll need to add it manually to $ENV_FILE"
fi

echo ""

# Prompt for optional overrides
read -p "  🌐 Facilitator URL [default: $DEFAULT_FACILITATOR]: " FACILITATOR
FACILITATOR="${FACILITATOR:-$DEFAULT_FACILITATOR}"

read -p "  ⛓️  Network (CAIP-2) [default: $DEFAULT_NETWORK]: " NETWORK
NETWORK="${NETWORK:-$DEFAULT_NETWORK}"

read -p "  🔌 Server port [default: $DEFAULT_PORT]: " PORT
PORT="${PORT:-$DEFAULT_PORT}"

# Write .env file
cat > "$ENV_FILE" << EOF
# ─── x402 Demo Configuration ────────────────────────────────────
# Wallet that receives payments (any EVM address)
PAY_TO_ADDRESS=$PAY_TO

# Client wallet private key (for signing payments — TESTNET ONLY!)
# Generate one at: https://vanity-eth.tk/ or use MetaMask export
EVM_PRIVATE_KEY=$PRIVATE_KEY

# Facilitator URL (public testnet facilitator by Coinbase)
FACILITATOR_URL=$FACILITATOR

# Network: Base Sepolia testnet (CAIP-2 format)
NETWORK=$NETWORK

# Server port
PORT=$PORT
EOF

echo ""
echo "  ✅ Created $ENV_FILE with your configuration"

# ─── Launch Dev Servers ──────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║               ✅  Setup Complete!                ║"
echo "  ╠══════════════════════════════════════════════════╣"
echo "  ║  Before testing payments, make sure:             ║"
echo "  ║    ✓ Your private key is set in server/.env      ║"
echo "  ║    ✓ Your wallet has testnet ETH (gas)           ║"
echo "  ║    ✓ Your wallet has testnet USDC (payments)     ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""
echo "  🚀 Launching dev servers..."
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Open Terminal 1 — Resource Server
osascript -e "
tell application \"Terminal\"
  do script \"cd '$PROJECT_DIR/server' && echo '🖥️  x402 Resource Server' && npm run dev\"
  set custom title of front window to \"x402 Server\"
end tell
"
echo "  ✓ Opened terminal: Resource Server (port 4021)"

# Open Terminal 2 — Frontend
osascript -e "
tell application \"Terminal\"
  do script \"cd '$PROJECT_DIR/frontend' && echo '🌐 x402 Frontend' && npm run dev\"
  set custom title of front window to \"x402 Frontend\"
end tell
"
echo "  ✓ Opened terminal: Frontend (port 3000)"

# Wait a moment then open browser
echo ""
echo "  ⏳ Waiting for servers to start..."
sleep 4
open http://localhost:3000
echo "  ✓ Opened http://localhost:3000 in your browser"
echo ""
echo "  🎉 You're all set! Happy demo-ing!"
echo ""

