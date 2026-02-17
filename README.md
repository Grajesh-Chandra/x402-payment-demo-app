# x402 Payment Protocol — Interactive Demo

> **Internet-native payments built on HTTP 402** — An open standard by [Coinbase](https://github.com/coinbase/x402)

![x402 Demo](https://img.shields.io/badge/Protocol-x402-00d4ff?style=for-the-badge)
![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-8b5cf6?style=for-the-badge)
![USDC](https://img.shields.io/badge/Currency-USDC-10b981?style=for-the-badge)

## 🌐 What is x402?

x402 is an open payment standard that enables **internet-native payments** using the HTTP `402 Payment Required` status code. It allows any API, resource, or service to be monetized with **a single line of code** — no accounts, no API keys, no subscriptions.

### How it Works

```
Client → GET /api/weather → Server responds: 402 Payment Required
Client → Signs payment (USDC on Base) → Re-sends with payment header
Server → Verifies via Facilitator → Settles on-chain → Returns data
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- A **testnet wallet** with Base Sepolia USDC
  - Create one at [MetaMask](https://metamask.io/) or use any EVM wallet
  - Get testnet ETH: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
  - Get testnet USDC: [Circle Faucet](https://faucet.circle.com/)

### Setup

```bash
# 1. Install dependencies
chmod +x setup.sh && ./setup.sh

# 2. Configure environment
cp .env.example server/.env
# Edit server/.env and add your wallet address & private key

# 3. Start the Resource Server (Terminal 1)
cd server && npm run dev

# 4. Start the Frontend (Terminal 2)
cd frontend && npm run dev

# 5. Open the demo
open http://localhost:3000
```

## 📁 Project Structure

```
├── server/                    # Express Resource Server
│   ├── src/index.ts          # x402 payment middleware + API endpoints
│   ├── package.json
│   └── .env                  # Configuration (wallet, network, etc.)
│
├── frontend/                  # Next.js Premium UI
│   ├── app/
│   │   ├── page.tsx          # Landing page (protocol explanation)
│   │   ├── demo/page.tsx     # Interactive demo dashboard
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Design system
│   └── components/
│       └── Header.tsx        # Navigation
│
├── .env.example              # Environment variable template
├── setup.sh                  # One-command setup
└── README.md                 # This file
```

## 🔌 API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/weather` | GET | $0.001 USDC | Weather data for random cities |
| `/api/joke` | GET | $0.0005 USDC | Premium developer jokes |
| `/api/premium-report` | GET | $0.01 USDC | Crypto market analysis report |
| `/api/health` | GET | Free | Server health check |
| `/api/endpoints` | GET | Free | Endpoint discovery with pricing |

## 🎯 Demo Walkthrough

1. **Landing Page** — Explains x402 with animated flow diagram and code snippets
2. **Live Demo** — Connect testnet wallet and make paid API calls
   - See the full 402 → Sign → Verify → Settle → Response flow
   - Real-time payment visualization
   - Transaction log with receipts

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PAY_TO_ADDRESS` | Wallet to receive payments | Demo address |
| `EVM_PRIVATE_KEY` | Client wallet for signing payments | Required |
| `FACILITATOR_URL` | x402 facilitator server | `https://x402.org/facilitator` |
| `NETWORK` | Blockchain network (CAIP-2) | `eip155:84532` (Base Sepolia) |
| `PORT` | Server port | `4021` |

## 📚 Resources

- [x402 GitHub](https://github.com/coinbase/x402)
- [x402 Documentation](https://docs.x402.org)
- [x402 Website](https://x402.org)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

## 📄 License

This demo is open source. The x402 protocol is licensed under Apache-2.0 by Coinbase.
