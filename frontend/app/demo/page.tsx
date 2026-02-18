"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPublicClient, createWalletClient, custom, http, formatUnits } from "viem";
import type { WalletClient } from "viem";
import { baseSepolia } from "viem/chains";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

// Base Sepolia chain params for MetaMask
const BASE_SEPOLIA_CHAIN_ID = "0x14a34"; // 84532 in hex

// ─── USDC on Base Sepolia ────────────────────────────────────────
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// ─── Types ───────────────────────────────────────────────────────
interface Endpoint {
  method: string;
  path: string;
  description: string;
  price: string;
  currency: string;
  network: string;
  scheme: string;
  icon: string;
}

interface FlowStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "success" | "error";
  data?: string;
}

interface TxLogEntry {
  id: string;
  endpoint: string;
  method: string;
  price: string;
  status: "success" | "failed" | "pending";
  statusCode: number;
  time: string;
  timestamp: string;
  durationMs: number;
  error?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
}

const SERVER_URL = "http://localhost:4021";

// ─── Demo Page Component ─────────────────────────────────────────
// ─── Route mapping for resource pages ────────────────────────────
const RESOURCE_ROUTES: Record<string, string> = {
  "/api/weather": "/resource/weather",
  "/api/joke": "/resource/joke",
  "/api/premium-report": "/resource/report",
};

export default function DemoPage() {
  const router = useRouter();
  const [walletMode, setWalletMode] = useState<"metamask" | "privateKey">("metamask");
  const [privateKey, setPrivateKey] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [txLog, setTxLog] = useState<TxLogEntry[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
  const [consentEndpoint, setConsentEndpoint] = useState<Endpoint | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [metamaskConnecting, setMetamaskConnecting] = useState(false);
  const walletClientRef = useRef<WalletClient | null>(null);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  // Detect MetaMask on mount
  useEffect(() => {
    setHasMetaMask(typeof window !== "undefined" && !!window.ethereum);
  }, []);

  // ─── Fetch Transactions ─────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/transactions`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTxLog(data.transactions.map((tx: any) => ({
             id: tx.id,
             endpoint: tx.endpoint,
             method: tx.method || "GET",
             price: tx.price,
             status: tx.status,
             statusCode: tx.statusCode || 200,
             time: new Date(tx.timestamp).toLocaleTimeString(),
             timestamp: tx.timestamp,
             durationMs: tx.durationMs || 0,
             error: tx.error,
             requestHeaders: tx.requestHeaders,
             responseHeaders: tx.responseHeaders,
             responseBody: tx.responseBody,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  }, []);

  // ─── Check Server Status ────────────────────────────────────
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/health`);
        if (res.ok) {
          setServerStatus("online");
          // Also fetch endpoints
          const epRes = await fetch(`${SERVER_URL}/api/endpoints`);
          if (epRes.ok) {
            const data = await epRes.json();
            setEndpoints(data.endpoints || []);
          }
           // Fetch transactions when server is online
           fetchTransactions();
        } else {
          setServerStatus("offline");
        }
      } catch {
        setServerStatus("offline");
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  // ─── Fetch USDC Balance ─────────────────────────────────────
  const fetchBalance = useCallback(async (address: string) => {
    setBalanceLoading(true);
    try {
      const raw = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      const formatted = formatUnits(raw, 6); // USDC has 6 decimals
      setUsdcBalance(formatted);
    } catch {
      setUsdcBalance("0");
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // ─── Connect via Private Key ────────────────────────────────
  const connectWithPrivateKey = useCallback(async () => {
    setWalletError(null);
    const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    if (!key || key.length < 64) {
      setWalletError("Please enter a valid hex private key (0x...)");
      return;
    }
    try {
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(key as `0x${string}`);
      setWalletAddress(account.address);
      walletClientRef.current = null; // clear MetaMask client
      fetchBalance(account.address);
    } catch (err: unknown) {
      setWalletError(`Invalid private key: ${err instanceof Error ? err.message : "unknown error"}`);
      setWalletAddress(null);
      setUsdcBalance(null);
    }
  }, [privateKey, fetchBalance]);

  // ─── Connect via MetaMask ──────────────────────────────────
  const connectMetaMask = useCallback(async () => {
    setWalletError(null);
    setMetamaskConnecting(true);
    try {
      if (!window.ethereum) {
        setWalletError("MetaMask not detected. Please install MetaMask browser extension.");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts || accounts.length === 0) {
        setWalletError("No accounts found. Please unlock MetaMask.");
        return;
      }

      // Try to switch to Base Sepolia — but don't block connection on failure
      // MetaMask may already have it, or may throw internal errors on add
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
        });
      } catch (switchError: unknown) {
        const code = switchError && typeof switchError === "object" && "code" in switchError
          ? (switchError as { code: number }).code
          : 0;

        if (code === 4001) {
          // User rejected the chain switch
          setWalletError("Please switch to Base Sepolia network in MetaMask to continue.");
          return;
        }

        if (code === 4902) {
          // Chain not in MetaMask — try adding it
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: BASE_SEPOLIA_CHAIN_ID,
                chainName: "Base Sepolia Testnet",
                nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              }],
            });
          } catch (addError: unknown) {
            // MetaMask may still accept the chain despite throwing — continue
            console.warn("wallet_addEthereumChain error (may be ignorable):", addError);
          }
        }
        // For any other error, continue anyway — the WalletClient will enforce the chain
      }

      // Create viem wallet client from MetaMask provider
      const client = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum),
      });

      const [address] = await client.getAddresses();
      walletClientRef.current = client;
      setWalletAddress(address);
      fetchBalance(address);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setWalletError(`MetaMask connection failed: ${msg.slice(0, 150)}`);
      setWalletAddress(null);
      walletClientRef.current = null;
    } finally {
      setMetamaskConnecting(false);
    }
  }, [fetchBalance]);

  // ─── Disconnect wallet ─────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setUsdcBalance(null);
    setWalletError(null);
    walletClientRef.current = null;
    setPrivateKey("");
  }, []);

  // ─── Scroll flow into view ─────────────────────────────────
  useEffect(() => {
    if (flowSteps.length > 0 && flowRef.current) {
      flowRef.current.scrollTop = flowRef.current.scrollHeight;
    }
  }, [flowSteps]);

  // ─── Payment Flow ──────────────────────────────────────────
  const callEndpoint = useCallback(
    async (endpoint: Endpoint) => {
      if (!walletAddress) return;
      if (walletMode === "privateKey" && !privateKey) return;

      setActiveEndpoint(endpoint.path);
      setFlowSteps([]);

      const addStep = (step: FlowStep) => {
        setFlowSteps((prev) => {
          const existing = prev.findIndex((s) => s.id === step.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = step;
            return updated;
          }
          return [...prev, step];
        });
      };

      const txId = `tx-${Date.now()}`;

      try {
        // Step 1: Initial request
        addStep({
          id: "step-1",
          label: "Sending HTTP Request",
          detail: `${endpoint.method} ${SERVER_URL}${endpoint.path}`,
          status: "active",
        });
        await sleep(400);

        // Make initial request to get 402
        const initialRes = await fetch(`${SERVER_URL}${endpoint.path}`, { method: endpoint.method });

        if (initialRes.status === 402) {
          addStep({
            id: "step-1",
            label: "HTTP Request Sent",
            detail: `${endpoint.method} ${SERVER_URL}${endpoint.path}`,
            status: "success",
          });

          // Step 2: 402 received
          const paymentRequiredHeader =
            initialRes.headers.get("X-PAYMENT-REQUIRED") ||
            initialRes.headers.get("PAYMENT-REQUIRED") ||
            initialRes.headers.get("x-payment-required");

          let paymentBody: string;
          try {
            const body = await initialRes.json();
            paymentBody = JSON.stringify(body, null, 2);
          } catch {
            paymentBody = `Status: 402\nHeader: ${paymentRequiredHeader ? "PAYMENT-REQUIRED present" : "checking..."}`;
          }

          addStep({
            id: "step-2",
            label: "402 Payment Required",
            detail: `Server requires ${endpoint.price} ${endpoint.currency} via ${endpoint.scheme} scheme`,
            status: "success",
            data: paymentBody,
          });
          await sleep(300);

          // Step 3: Sign payment
          addStep({
            id: "step-3",
            label: "Signing Payment Payload",
            detail: `Using wallet ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)} to sign a payment of ${endpoint.price}`,
            status: "active",
          });
          await sleep(500);

          // Build x402 client and make paid request
          addStep({
            id: "step-3",
            label: "Payment Payload Signed",
            detail: `Wallet ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)} signed the EIP-712 payload`,
            status: "success",
          });

          // Step 4: Re-send with payment header
          addStep({
            id: "step-4",
            label: "Sending Paid Request",
            detail: "Re-sending request with PAYMENT-SIGNATURE header attached",
            status: "active",
          });
          await sleep(300);

          // Use the x402 fetch wrapper for the real paid request
          try {
            const { wrapFetchWithPayment } = await import("@x402/fetch");
            const { x402Client } = await import("@x402/core/client");
            const { registerExactEvmScheme } = await import("@x402/evm/exact/client");

            let signer: { address: `0x${string}`; signTypedData: (args: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) => Promise<`0x${string}`> };

            if (walletMode === "metamask" && walletClientRef.current) {
              // Use MetaMask wallet client as signer
              const wc = walletClientRef.current;
              const [addr] = await wc.getAddresses();
              signer = {
                address: addr,
                signTypedData: (args) => wc.signTypedData({
                  account: addr,
                  domain: args.domain as Record<string, unknown>,
                  types: args.types as Record<string, readonly { name: string; type: string }[]>,
                  primaryType: args.primaryType,
                  message: args.message,
                }),
              };
            } else {
              // Use private key signer
              const { privateKeyToAccount } = await import("viem/accounts");
              const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
              signer = privateKeyToAccount(key as `0x${string}`);
            }

            const client = new x402Client();
            registerExactEvmScheme(client, { signer });

            const fetchWithPayment = wrapFetchWithPayment(fetch, client);

            const paidRes = await fetchWithPayment(`${SERVER_URL}${endpoint.path}`, {
              method: endpoint.method,
            });

            if (paidRes.ok) {
              addStep({
                id: "step-4",
                label: "Paid Request Accepted",
                detail: "Server verified payment via facilitator and settled on-chain",
                status: "success",
              });

              const paidData = await paidRes.json();

              // Step 5: Success
              addStep({
                id: "step-5",
                label: "✅ Resource Delivered!",
                detail: `Payment of ${endpoint.price} ${endpoint.currency} settled. Redirecting to resource page...`,
                status: "success",
              });

              // Refresh balance after payment
              if (walletAddress) fetchBalance(walletAddress);

              // Refresh transaction logs
              fetchTransactions();

              // Redirect to resource page after a brief delay
              const resourceRoute = RESOURCE_ROUTES[endpoint.path];
              if (resourceRoute) {
                const encodedData = btoa(JSON.stringify(paidData));
                setTimeout(() => {
                  router.push(`${resourceRoute}?data=${encodedData}`);
                }, 1200);
              }

              // We removed local setTxLog here because we fetch from server now
            } else {
              throw new Error(`Server returned ${paidRes.status}: ${await paidRes.text()}`);
            }
          } catch (payErr: unknown) {
            const errorMsg = payErr instanceof Error ? payErr.message : String(payErr);
            addStep({
              id: "step-4",
              label: "Payment Processing",
              detail: errorMsg.includes("insufficient")
                ? "Insufficient USDC balance on Base Sepolia. Get testnet USDC from a faucet."
                : `Error: ${errorMsg.slice(0, 200)}`,
              status: "error",
            });

             // Refresh logs — server now logs 402 failures too
             fetchTransactions();
          }
        } else if (initialRes.ok) {
          // Somehow the endpoint responded without payment required
          addStep({
            id: "step-1",
            label: "Direct Response (No Payment)",
            detail: "Server responded with 200 OK directly",
            status: "success",
            data: JSON.stringify(await initialRes.json(), null, 2),
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Network error";
        addStep({
          id: "step-error",
          label: "Request Failed",
          detail: errorMsg.includes("fetch")
            ? "Cannot reach the server. Make sure the Resource Server is running on port 4021."
            : errorMsg,
          status: "error",
        });
      }

      setActiveEndpoint(null);
    },
    [walletAddress, privateKey, walletMode, activeEndpoint, fetchBalance, fetchTransactions, router]
  );

  return (
    <>
      <Header />

      <main className="demo-page container">
        {/* Demo Header */}
        <div className="demo-header">
          <div className="section-tag">Interactive Demo</div>
          <h1 className="section-title" style={{ marginBottom: 8 }}>
            x402 Payment Playground
          </h1>
          <p className="section-subtitle" style={{ maxWidth: 600 }}>
            Connect a testnet wallet, pick an endpoint, and watch the HTTP 402 payment flow in real-time
          </p>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 100,
              background: serverStatus === "online" ? "rgba(16, 185, 129, 0.1)" : serverStatus === "offline" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
              border: `1px solid ${serverStatus === "online" ? "rgba(16, 185, 129, 0.3)" : serverStatus === "offline" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
              color: serverStatus === "online" ? "#10b981" : serverStatus === "offline" ? "#ef4444" : "#f59e0b",
              fontSize: 12,
              fontWeight: 600,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "currentColor",
                animation: serverStatus === "checking" ? "pulse-dot 1s ease infinite" : undefined
              }} />
              Server: {serverStatus === "online" ? "Online" : serverStatus === "offline" ? "Offline" : "Checking..."}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Base Sepolia · USDC · Exact Scheme
            </span>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="wallet-section">
          <div className="wallet-card">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
              }}>🔐</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Wallet Configuration</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Connect your wallet to sign x402 payment transactions</div>
              </div>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", marginBottom: 16 }}>
              <button
                onClick={() => { disconnectWallet(); setWalletMode("metamask"); }}
                style={{
                  flex: 1, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                  background: walletMode === "metamask" ? "rgba(245, 158, 11, 0.15)" : "transparent",
                  color: walletMode === "metamask" ? "#f59e0b" : "var(--text-muted)",
                  boxShadow: walletMode === "metamask" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}
              >
                🦊 MetaMask
              </button>
              <button
                onClick={() => { disconnectWallet(); setWalletMode("privateKey"); }}
                style={{
                  flex: 1, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                  background: walletMode === "privateKey" ? "rgba(139, 92, 246, 0.15)" : "transparent",
                  color: walletMode === "privateKey" ? "#8b5cf6" : "var(--text-muted)",
                  boxShadow: walletMode === "privateKey" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}
              >
                🔑 Private Key
              </button>
            </div>

            {/* MetaMask Mode */}
            {walletMode === "metamask" && !walletAddress && (
              <div>
                {hasMetaMask ? (
                  <button
                    className="btn-primary"
                    onClick={connectMetaMask}
                    disabled={metamaskConnecting}
                    style={{ width: "100%", height: 48, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    {metamaskConnecting ? (
                      <><span style={{ animation: "pulse-dot 1s ease infinite" }}>⟳</span> Connecting...</>
                    ) : (
                      <>🦊 Connect MetaMask</>
                    )}
                  </button>
                ) : (
                  <div style={{ textAlign: "center", padding: 16 }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                      MetaMask not detected in your browser.
                    </div>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{ display: "inline-block", padding: "8px 20px", fontSize: 13, textDecoration: "none" }}
                    >
                      Install MetaMask →
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Private Key Mode */}
            {walletMode === "privateKey" && !walletAddress && (
              <div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label className="wallet-label">EVM Private Key (Testnet Only)</label>
                    <input
                      type="password"
                      className="wallet-input"
                      placeholder="0x..."
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && connectWithPrivateKey()}
                    />
                  </div>
                  <button className="btn-primary" onClick={connectWithPrivateKey} style={{ height: 44, whiteSpace: "nowrap" }}>
                    Connect
                  </button>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                  ⚠️ Never use mainnet private keys! This is for testnet only.
                </div>
              </div>
            )}

            {walletError && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                ⚠️ {walletError}
              </div>
            )}

            {walletAddress && (
              <div className="wallet-status connected" style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  ✅ {walletMode === "metamask" ? "🦊" : "🔑"} Connected:
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 12px", borderRadius: 100,
                    background: "rgba(0, 212, 255, 0.08)", border: "1px solid rgba(0, 212, 255, 0.2)",
                    fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
                    color: "var(--accent-cyan)", letterSpacing: "0.02em",
                  }}>
                    💰 {balanceLoading ? "Loading..." : usdcBalance !== null ? `${usdcBalance} USDC` : "—"}
                  </span>
                  <button
                    onClick={disconnectWallet}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 11,
                      fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Disconnect
                  </button>
                </span>
              </div>
            )}

            {!walletAddress && !walletError && walletMode === "privateKey" && (
              <div className="wallet-status disconnected" style={{ marginTop: 12 }}>
                ⚠️ Enter your testnet private key to enable payments
              </div>
            )}
          </div>
        </div>

        {/* Main Demo Grid */}
        <div className="demo-grid">
          {/* Left: Endpoints */}
          <div className="demo-panel">
            <div className="demo-panel-header">
              <div className="demo-panel-icon" style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8 }}>🔌</div>
              <div>
                <div className="demo-panel-title">API Endpoints</div>
                <div className="demo-panel-subtitle">x402-protected resources on the server</div>
              </div>
            </div>
            <div className="demo-panel-body">
              {serverStatus === "offline" ? (
                <div className="flow-vis-empty">
                  <div className="flow-vis-empty-icon">🔴</div>
                  <div className="flow-vis-empty-title">Server Offline</div>
                  <div className="flow-vis-empty-desc">
                    Start the resource server:<br />
                    <code style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      cd server && npm run dev
                    </code>
                  </div>
                </div>
              ) : (
                <div className="endpoints-grid">
                  {endpoints.map((ep) => (
                    <div key={ep.path} className="endpoint-card">
                      <div className="endpoint-top">
                        <div className="endpoint-method-path">
                          <span className="endpoint-method">{ep.method}</span>
                          <span className="endpoint-path">{ep.path}</span>
                        </div>
                        <span className="endpoint-price">{ep.icon} {ep.price}</span>
                      </div>
                      <div className="endpoint-desc">{ep.description}</div>
                      <div className="endpoint-bottom">
                        <div className="endpoint-meta">
                          <span className="endpoint-tag">{ep.scheme}</span>
                          <span className="endpoint-tag" style={{ background: "rgba(0,212,255,0.08)", color: "var(--accent-cyan)" }}>{ep.currency}</span>
                        </div>
                        <button
                          className={`btn-pay ${activeEndpoint === ep.path ? "loading" : ""}`}
                          disabled={!walletAddress || !!activeEndpoint || serverStatus !== "online"}
                          onClick={() => setConsentEndpoint(ep)}
                        >
                          Pay & Call →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment Flow */}
          <div className="demo-panel">
            <div className="demo-panel-header">
              <div className="demo-panel-icon" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8 }}>⚡</div>
              <div>
                <div className="demo-panel-title">Payment Flow</div>
                <div className="demo-panel-subtitle">Live visualization of the x402 protocol</div>
              </div>
            </div>
            <div className="demo-panel-body flow-vis" ref={flowRef} style={{ maxHeight: 500, overflowY: "auto" }}>
              {flowSteps.length === 0 ? (
                <div className="flow-vis-empty">
                  <div className="flow-vis-empty-icon">🔄</div>
                  <div className="flow-vis-empty-title">Waiting for Request</div>
                  <div className="flow-vis-empty-desc">
                    Click &quot;Pay &amp; Call&quot; on an endpoint to see the x402 flow
                  </div>
                </div>
              ) : (
                flowSteps.map((step) => (
                  <div key={step.id} className="flow-step-item">
                    <div className={`flow-step-indicator ${step.status}`}>
                      {step.status === "success"
                        ? "✓"
                        : step.status === "error"
                        ? "✗"
                        : step.status === "active"
                        ? "⟳"
                        : "○"}
                    </div>
                    <div className="flow-step-content">
                      <div className="flow-step-label">{step.label}</div>
                      <div className="flow-step-detail">{step.detail}</div>
                      {step.data && <div className="flow-step-data">{step.data}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Transaction Log */}
        <div className="tx-log" style={{ marginBottom: 60 }}>
          <div className="tx-log-header">
            <div className="tx-log-title">📋 Transaction Log</div>
            {txLog.length > 0 && <div className="tx-log-count">{txLog.length} transactions</div>}
          </div>
          <div className="tx-log-body">
            {txLog.length === 0 ? (
              <div className="tx-log-empty">No transactions yet. Make a paid API call to see results here.</div>
            ) : (
              txLog.map((tx) => (
                <div key={tx.id} className="tx-log-entry">
                  {/* Clickable summary row */}
                  <div
                    className={`tx-log-item ${expandedTx === tx.id ? "expanded" : ""}`}
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                    style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                  >
                    <span className="tx-expand-arrow" style={{
                      fontSize: 10, color: "var(--text-muted)", transition: "transform 0.2s",
                      transform: expandedTx === tx.id ? "rotate(90deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}>▶</span>
                    <span className={`tx-status-dot ${tx.status}`} />
                    <span className="endpoint-method" style={{ fontSize: 10 }}>{tx.method}</span>
                    <span className="tx-log-endpoint">{tx.endpoint}</span>
                    <span className="tx-status-badge" style={{
                      fontSize: 11, fontFamily: "var(--font-mono)", padding: "2px 6px", borderRadius: 4,
                      background: tx.statusCode === 200 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: tx.statusCode === 200 ? "#10b981" : "#ef4444",
                      border: `1px solid ${tx.statusCode === 200 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}>{tx.statusCode}</span>
                    <span className="tx-log-price">{tx.price}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{tx.durationMs}ms</span>
                    <span className="tx-log-time" style={{ marginLeft: "auto" }}>{tx.time}</span>
                  </div>

                  {/* Expandable detail panel */}
                  {expandedTx === tx.id && (
                    <div className="tx-detail" style={{
                      padding: "16px 24px 20px 44px",
                      borderTop: "1px solid var(--border-subtle)",
                      background: "rgba(0,0,0,0.15)",
                      animation: "slideIn 0.2s ease-out",
                    }}>
                      {/* Timeline */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Step 1: Request */}
                        <div className="tx-detail-step">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, background: "rgba(0,212,255,0.1)", border: "1.5px solid rgba(0,212,255,0.3)", color: "var(--accent-cyan)", flexShrink: 0,
                            }}>1</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Request Sent</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {tx.method} {tx.endpoint}
                            </span>
                          </div>
                          {tx.requestHeaders && Object.keys(tx.requestHeaders).length > 0 && (
                            <div className="tx-detail-data">
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Request Headers</div>
                              <pre style={{
                                margin: 0, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-cyan)",
                                whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5,
                              }}>{Object.entries(tx.requestHeaders).map(([k, v]) => {
                                const display = typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "..." : v;
                                return `${k}: ${display}`;
                              }).join("\n")}</pre>
                            </div>
                          )}
                        </div>

                        {/* Step 2: Payment */}
                        <div className="tx-detail-step">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, background: "rgba(139,92,246,0.1)", border: "1.5px solid rgba(139,92,246,0.3)", color: "var(--accent-purple)", flexShrink: 0,
                            }}>2</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Payment Processing</span>
                            <span style={{ fontSize: 11, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>{tx.price} USDC</span>
                          </div>
                        </div>

                        {/* Step 3: Response */}
                        <div className="tx-detail-step">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10,
                              background: tx.status === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                              border: `1.5px solid ${tx.status === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                              color: tx.status === "success" ? "var(--accent-green)" : "var(--accent-red)", flexShrink: 0,
                            }}>3</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Response {tx.status === "success" ? "Received" : "Failed"}</span>
                            <span style={{
                              fontSize: 11, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 4,
                              background: tx.status === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                              color: tx.status === "success" ? "#10b981" : "#ef4444",
                            }}>{tx.statusCode} • {tx.durationMs}ms</span>
                          </div>
                          {tx.responseHeaders && Object.keys(tx.responseHeaders).length > 0 && (
                            <div className="tx-detail-data" style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Response Headers</div>
                              <pre style={{
                                margin: 0, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-purple)",
                                whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5,
                              }}>{Object.entries(tx.responseHeaders).map(([k, v]) => {
                                const display = typeof v === "string" && v.length > 120 ? v.slice(0, 120) + "..." : v;
                                return `${k}: ${display}`;
                              }).join("\n")}</pre>
                            </div>
                          )}
                          {!!tx.responseBody && (
                            <div className="tx-detail-data">
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Response Body</div>
                              <pre style={{
                                margin: 0, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent-green)",
                                whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, maxHeight: 200, overflowY: "auto",
                              }}>{JSON.stringify(tx.responseBody as Record<string, unknown>, null, 2)}</pre>
                            </div>
                          )}
                          {tx.error && (
                            <div style={{
                              marginTop: 8, padding: "6px 10px", borderRadius: 4,
                              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                              fontSize: 12, color: "#ef4444",
                            }}>
                              ⚠ {tx.error}
                            </div>
                          )}
                        </div>

                        {/* Timestamp footer */}
                        <div style={{ fontSize: 11, color: "var(--text-muted)", paddingTop: 4, borderTop: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)" }}>
                          {tx.timestamp}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ─── Consent Modal ────────────────────────────────────── */}
      {consentEndpoint && (
        <div className="consent-overlay" onClick={() => setConsentEndpoint(null)}>
          <div className="consent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="consent-header">
              <div className="consent-icon">{consentEndpoint.icon}</div>
              <h2 className="consent-title">Payment Required</h2>
              <p className="consent-subtitle">This resource is protected by the x402 protocol</p>
            </div>

            <div className="consent-details">
              <div className="consent-detail-row">
                <span className="consent-detail-label">Endpoint</span>
                <span className="consent-detail-value">
                  <span className="endpoint-method" style={{ fontSize: 11 }}>{consentEndpoint.method}</span>
                  {consentEndpoint.path}
                </span>
              </div>
              <div className="consent-detail-row">
                <span className="consent-detail-label">Description</span>
                <span className="consent-detail-value">{consentEndpoint.description}</span>
              </div>
              <div className="consent-detail-row">
                <span className="consent-detail-label">Price</span>
                <span className="consent-detail-value consent-price">{consentEndpoint.price} {consentEndpoint.currency}</span>
              </div>
              <div className="consent-detail-row">
                <span className="consent-detail-label">Network</span>
                <span className="consent-detail-value">Base Sepolia</span>
              </div>
              <div className="consent-detail-row">
                <span className="consent-detail-label">Scheme</span>
                <span className="consent-detail-value">{consentEndpoint.scheme}</span>
              </div>
              <div className="consent-detail-row">
                <span className="consent-detail-label">Wallet</span>
                <span className="consent-detail-value" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : "Not connected"}
                </span>
              </div>
            </div>

            <div className="consent-warning">
              ⚠️ This will sign and submit a payment transaction on Base Sepolia testnet
            </div>

            <div className="consent-actions">
              <button className="btn-secondary" onClick={() => setConsentEndpoint(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const ep = consentEndpoint;
                  setConsentEndpoint(null);
                  callEndpoint(ep);
                }}
              >
                ⚡ Confirm & Pay {consentEndpoint.price}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
