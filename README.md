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

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Git**

### 1. Clone & Setup

```bash
git clone https://github.com/Grajesh-Chandra/x402-payment-demo-app.git
cd x402-payment-demo-app
chmod +x setup.sh && ./setup.sh
```

The setup script will:
- Install all dependencies (server + frontend)
- Create your `server/.env` from the template
- Prompt you to configure your wallet (see below)

---

## 🔐 Wallet Setup (Required Before Testing Payments)

You need **two things** to test payments: a wallet with testnet USDC, and its private key in the `.env` file.

### Step 1: Create a Wallet

You can use **any EVM wallet**. Here are two options:

<details>
<summary><b>Option A: MetaMask (Browser Extension)</b></summary>

1. Install [MetaMask](https://metamask.io/) browser extension
2. Create a new wallet (or use an existing one)
3. **Add Base Sepolia network** to MetaMask:
   - Go to Settings → Networks → Add Network
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency: `ETH`
   - Explorer: `https://sepolia.basescan.org`
4. **Export your private key**:
   - Click the three dots `⋮` next to your account name
   - Select **Account Details** → **Show Private Key**
   - Confirm your password and copy the key

</details>

<details>
<summary><b>Option B: Generate a New Wallet (Quick)</b></summary>

1. Go to [Vanity ETH](https://vanity-eth.tk/) (runs locally in your browser)
2. Click **Generate** to create a random wallet
3. Copy both the **Address** and **Private Key**

> ⚠️ This wallet is for **testnet use only**. Never send real funds to it.

</details>

### Step 2: Fund Your Wallet with Testnet Tokens

Your wallet needs a small amount of **testnet ETH** (for gas) and **testnet USDC** (for payments).

| Token | Faucet | Amount Needed |
|-------|--------|---------------|
| **ETH** (gas) | [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) | ~0.01 ETH |
| **USDC** (payments) | [Circle USDC Faucet](https://faucet.circle.com/) | ~10 USDC |

1. Go to the **ETH faucet** → paste your wallet address → claim testnet ETH
2. Go to the **USDC faucet** → select **Base Sepolia** → paste your address → claim USDC

> 💡 The Circle faucet gives 10 USDC at a time. That's enough for ~10,000 weather API calls!

### Step 3: Configure Environment Variables

Edit `server/.env` and fill in your wallet details:

```env
# Your wallet address (receives payments)
PAY_TO_ADDRESS=0xYourWalletAddressHere

# Your wallet's private key (signs payment transactions — TESTNET ONLY!)
EVM_PRIVATE_KEY=0xYourPrivateKeyHere

# These defaults work out of the box:
FACILITATOR_URL=https://x402.org/facilitator
NETWORK=eip155:84532
PORT=4021
```

> ⚠️ **NEVER use a mainnet private key or a wallet with real funds!** This is for testnet demo purposes only.

---

## ▶️ Running the Demo

You need two terminals:

```bash
# Terminal 1 — Resource Server (backend)
cd server && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## 📁 Project Structure

```
├── server/                    # Express Resource Server
│   ├── src/index.ts          # x402 payment middleware + API endpoints + logging
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

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PAY_TO_ADDRESS` | Wallet to receive payments | Demo address |
| `EVM_PRIVATE_KEY` | Client wallet private key for signing payments | **Required** |
| `FACILITATOR_URL` | x402 facilitator server | `https://x402.org/facilitator` |
| `NETWORK` | Blockchain network (CAIP-2) | `eip155:84532` (Base Sepolia) |
| `PORT` | Server port | `4021` |

## 🎯 Demo Walkthrough

1. **Landing Page** — Explains x402 with animated flow diagram and code snippets
2. **Live Demo** — Connect testnet wallet and make paid API calls
   - See the full 402 → Sign → Verify → Settle → Response flow
   - Real-time payment visualization
   - Transaction log with receipts

## 🪵 Server Logging

The server includes **color-coded request/response logging** in the terminal. Every API call shows:
- Incoming request (method, URL, headers, body)
- x402 payment headers (`x-payment`, `payment-required`, etc.)
- Response (status, duration, body)

This gives you full visibility into the x402 payment flow as it happens.

## 📚 Resources

- [x402 GitHub](https://github.com/coinbase/x402)
- [x402 Documentation](https://docs.x402.org)
- [x402 Website](https://x402.org)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)

## 📄 License

This demo is open source. The x402 protocol is licensed under Apache-2.0 by Coinbase.
