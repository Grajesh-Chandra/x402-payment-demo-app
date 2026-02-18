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
CONFIGURE_ENV=true

if [ -f "$ENV_FILE" ]; then
  echo ""
  echo "  ⚠️  $ENV_FILE already exists."
  read -p "  Overwrite it? (y/N): " OVERWRITE
  if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
    echo "  Keeping existing $ENV_FILE"
    CONFIGURE_ENV=false
  fi
fi

if [ "$CONFIGURE_ENV" = true ]; then
  echo ""
  echo "  ─────────────────────────────────────────────────"
  echo "  🔑 Generating a fresh testnet wallet..."
  echo "  ─────────────────────────────────────────────────"
  echo ""

  # Generate wallet using viem via Node.js (run from server dir where viem is installed)
  WALLET_JSON=$(node server/scripts/generate-wallet.mjs 2>/dev/null)
  GEN_ADDRESS=$(echo "$WALLET_JSON" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).address))")
  GEN_PRIVATE_KEY=$(echo "$WALLET_JSON" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).privateKey))")

  echo "  ╔══════════════════════════════════════════════════╗"
  echo "  ║   🆕  New Wallet Generated (Base Sepolia)        ║"
  echo "  ╠══════════════════════════════════════════════════╣"
  echo "  ║                                                  ║"
  echo "  ║  Address:                                        ║"
  echo "  ║  $GEN_ADDRESS  ║"
  echo "  ║                                                  ║"
  echo "  ║  Private Key:                                    ║"
  echo "  ║  ${GEN_PRIVATE_KEY:0:34}  ║"
  echo "  ║  ${GEN_PRIVATE_KEY:34}  ║"
  echo "  ║                                                  ║"
  echo "  ║  ⚠️  SAVE THESE! They won't be shown again.      ║"
  echo "  ╚══════════════════════════════════════════════════╝"
  echo ""
  echo "  ─────────────────────────────────────────────────"
  echo "  📋 Fund Your Wallet (2 steps):"
  echo "  ─────────────────────────────────────────────────"
  echo ""
  echo "  Step 1: Get testnet ETH (for gas fees)"
  echo "    → https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet"
  echo "    → Paste your address: $GEN_ADDRESS"
  echo ""
  echo "  Step 2: Get testnet USDC (for payments)"
  echo "    → https://faucet.circle.com/"
  echo "    → Select 'Base Sepolia' and paste your address"
  echo ""
  echo "  ─────────────────────────────────────────────────"
  echo ""

  # Ask if they want to use the generated wallet or provide their own
  read -p "  Use this generated wallet? (Y/n): " USE_GENERATED
  if [[ "$USE_GENERATED" =~ ^[Nn]$ ]]; then
    read -p "  💰 Pay-to wallet address: " PAY_TO
    echo ""
    read -p "  🔑 Wallet private key (0x...): " PRIVATE_KEY
    if [ -z "$PRIVATE_KEY" ]; then
      PRIVATE_KEY="0x_YOUR_TESTNET_PRIVATE_KEY_HERE"
      echo ""
      echo "  ⚠️  No private key provided. You'll need to add it manually to $ENV_FILE"
    fi
    if [ -z "$PAY_TO" ]; then
      PAY_TO="0x209693Bc6EfC3BEDC16a31990A4B163C56Db0434"
    fi
  else
    PAY_TO="$GEN_ADDRESS"
    PRIVATE_KEY="$GEN_PRIVATE_KEY"
    echo "  ✅ Using generated wallet"
  fi

  echo ""

  # Default values for other settings
  DEFAULT_FACILITATOR="https://x402.org/facilitator"
  DEFAULT_NETWORK="eip155:84532"
  DEFAULT_PORT="4021"

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
fi

# ─── Initialize Log Files ────────────────────────────────────────
mkdir -p server/data
echo "[]" > server/data/transactions.json
: > server/data/server.log
echo "  📋 Initialized server/data (transactions.json + server.log)"

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

