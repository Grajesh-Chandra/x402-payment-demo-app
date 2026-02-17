"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import Header from "@/components/Header";

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
  price: string;
  status: "success" | "failed" | "pending";
  time: string;
  response?: unknown;
}

const SERVER_URL = "http://localhost:4021";

// ─── Demo Page Component ─────────────────────────────────────────
export default function DemoPage() {
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
  const flowRef = useRef<HTMLDivElement>(null);

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
  }, []);

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

  // ─── Derive Wallet Address ──────────────────────────────────
  const connectWallet = useCallback(async () => {
    setWalletError(null);
    if (!privateKey || !privateKey.startsWith("0x") || privateKey.length < 64) {
      setWalletError("Please enter a valid hex private key (0x...)");
      return;
    }
    try {
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      setWalletAddress(account.address);
      fetchBalance(account.address);
    } catch (err: unknown) {
      setWalletError(`Invalid private key: ${err instanceof Error ? err.message : "unknown error"}`);
      setWalletAddress(null);
      setUsdcBalance(null);
    }
  }, [privateKey, fetchBalance]);

  // ─── Scroll flow into view ─────────────────────────────────
  useEffect(() => {
    if (flowSteps.length > 0 && flowRef.current) {
      flowRef.current.scrollTop = flowRef.current.scrollHeight;
    }
  }, [flowSteps]);

  // ─── Payment Flow ──────────────────────────────────────────
  const callEndpoint = useCallback(
    async (endpoint: Endpoint) => {
      if (!walletAddress || !privateKey) return;

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
            const { privateKeyToAccount } = await import("viem/accounts");

            const signer = privateKeyToAccount(privateKey as `0x${string}`);
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
                detail: `Payment of ${endpoint.price} ${endpoint.currency} settled. Data received successfully.`,
                status: "success",
                data: JSON.stringify(paidData, null, 2),
              });

              // Refresh balance after payment
              if (walletAddress) fetchBalance(walletAddress);

              // Add to transaction log
              setTxLog((prev) => [
                {
                  id: txId,
                  endpoint: endpoint.path,
                  price: endpoint.price,
                  status: "success",
                  time: new Date().toLocaleTimeString(),
                  response: paidData,
                },
                ...prev,
              ]);
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

            setTxLog((prev) => [
              {
                id: txId,
                endpoint: endpoint.path,
                price: endpoint.price,
                status: "failed",
                time: new Date().toLocaleTimeString(),
              },
              ...prev,
            ]);
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

        setTxLog((prev) => [
          {
            id: txId,
            endpoint: activeEndpoint || "unknown",
            price: endpoint.price,
            status: "failed",
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
      }

      setActiveEndpoint(null);
    },
    [walletAddress, privateKey, activeEndpoint, fetchBalance]
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
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Enter your Base Sepolia testnet private key (never use mainnet keys!)</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="wallet-label">EVM Private Key (Testnet Only)</label>
                <input
                  type="password"
                  className="wallet-input"
                  placeholder="0x..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connectWallet()}
                />
              </div>
              <button className="btn-primary" onClick={connectWallet} style={{ height: 44, whiteSpace: "nowrap" }}>
                Connect Wallet
              </button>
            </div>

            {walletError && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                ⚠️ {walletError}
              </div>
            )}

            {walletAddress && (
              <div className="wallet-status connected" style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span>✅ Connected: <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{walletAddress}</span></span>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 100,
                  background: "rgba(0, 212, 255, 0.08)",
                  border: "1px solid rgba(0, 212, 255, 0.2)",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-cyan)",
                  letterSpacing: "0.02em",
                }}>
                  💰 {balanceLoading ? "Loading..." : usdcBalance !== null ? `${usdcBalance} USDC` : "—"}
                </span>
              </div>
            )}

            {!walletAddress && !walletError && (
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
                          onClick={() => callEndpoint(ep)}
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
                <div key={tx.id} className="tx-log-item">
                  <span className={`tx-status-dot ${tx.status}`} />
                  <span className="tx-log-endpoint">{tx.endpoint}</span>
                  <span className="tx-log-price">{tx.price}</span>
                  <span className="tx-log-time">{tx.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
