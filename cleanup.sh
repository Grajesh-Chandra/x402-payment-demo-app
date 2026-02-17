#!/bin/bash
set -e

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║      x402 Payment Protocol Demo — Cleanup        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# ─── Kill running dev servers ───────────────────────────────────
echo "🔍 Checking for running dev servers..."

KILLED=0

# Kill server (port 4021)
SERVER_PID=$(lsof -ti :4021 2>/dev/null || true)
if [ -n "$SERVER_PID" ]; then
  kill $SERVER_PID 2>/dev/null || true
  echo "  ✓ Stopped Resource Server (port 4021, PID: $SERVER_PID)"
  KILLED=$((KILLED + 1))
fi

# Kill frontend (port 3000)
FRONTEND_PID=$(lsof -ti :3000 2>/dev/null || true)
if [ -n "$FRONTEND_PID" ]; then
  kill $FRONTEND_PID 2>/dev/null || true
  echo "  ✓ Stopped Frontend (port 3000, PID: $FRONTEND_PID)"
  KILLED=$((KILLED + 1))
fi

if [ "$KILLED" -eq 0 ]; then
  echo "  No running servers found."
fi

# ─── Remove node_modules ───────────────────────────────────────
echo ""
echo "🗑️  Removing node_modules..."

if [ -d "server/node_modules" ]; then
  rm -rf server/node_modules
  echo "  ✓ Removed server/node_modules"
fi

if [ -d "frontend/node_modules" ]; then
  rm -rf frontend/node_modules
  echo "  ✓ Removed frontend/node_modules"
fi

# ─── Remove build artifacts ────────────────────────────────────
echo ""
echo "🗑️  Removing build artifacts..."

if [ -d "frontend/.next" ]; then
  rm -rf frontend/.next
  echo "  ✓ Removed frontend/.next"
fi

if [ -d "server/dist" ]; then
  rm -rf server/dist
  echo "  ✓ Removed server/dist"
fi

# ─── Optionally remove .env ────────────────────────────────────
echo ""
if [ -f "server/.env" ]; then
  read -p "  🔑 Remove server/.env (contains your private key)? (y/N): " REMOVE_ENV
  if [[ "$REMOVE_ENV" =~ ^[Yy]$ ]]; then
    rm -f server/.env
    echo "  ✓ Removed server/.env"
  else
    echo "  Kept server/.env"
  fi
fi

# ─── Done ───────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║             🧹  Cleanup Complete!                ║"
echo "  ╠══════════════════════════════════════════════════╣"
echo "  ║                                                  ║"
echo "  ║  To re-setup the project, run:                   ║"
echo "  ║    chmod +x setup.sh && ./setup.sh               ║"
echo "  ║                                                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""
