import Header from "@/components/Header";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Header />

      {/* ─── Hero Section ─────────────────────────────────────── */}
      <section className="hero container">
        <div className="hero-badge">
          ⚡ Powered by Coinbase x402 Protocol
        </div>

        <h1 className="hero-title">
          Internet-Native
          <br />
          <span className="gradient-text">Payments Protocol</span>
        </h1>

        <p className="hero-subtitle">
          Pay for any API, resource, or service with a single HTTP request.
          No accounts. No API keys. Just{" "}
          <strong style={{ color: "#00d4ff" }}>HTTP 402</strong>.
        </p>

        <div className="hero-actions">
          <Link href="/demo" className="btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
            🚀 Launch Live Demo
          </Link>
          <a
            href="https://docs.x402.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            📖 Read Docs
          </a>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-value">$0</div>
            <div className="stat-label">Protocol Fees</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">&lt;1s</div>
            <div className="stat-label">Settlement Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">1 line</div>
            <div className="stat-label">Server Integration</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">40+</div>
            <div className="stat-label">Networks Supported</div>
          </div>
        </div>
      </section>

      {/* ─── x402 Flow Diagram ────────────────────────────────── */}
      <section className="flow-section container">
        <div className="section-header">
          <div className="section-tag">How It Works</div>
          <h2 className="section-title">The x402 Payment Flow</h2>
          <p className="section-subtitle">
            A seamless HTTP-native payment in 5 steps — no accounts, no API keys, no friction
          </p>
        </div>

        <div className="flow-steps">
          <div className="flow-step">
            <div className="flow-step-number">1</div>
            <div className="flow-step-icon">🌐</div>
            <div className="flow-step-title">Client Request</div>
            <div className="flow-step-desc">
              Client sends a standard HTTP request to the resource server
            </div>
            <div className="flow-step-code">GET /api/weather HTTP/1.1</div>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">2</div>
            <div className="flow-step-icon">💳</div>
            <div className="flow-step-title">402 Payment Required</div>
            <div className="flow-step-desc">
              Server responds with HTTP 402 and payment requirements in headers
            </div>
            <div className="flow-step-code">HTTP/1.1 402 Payment Required<br />PAYMENT-REQUIRED: {"{ base64... }"}</div>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">3</div>
            <div className="flow-step-icon">🔐</div>
            <div className="flow-step-title">Sign Payment</div>
            <div className="flow-step-desc">
              Client signs the payment payload using their wallet private key
            </div>
            <div className="flow-step-code">PAYMENT-SIGNATURE: {"{ signed... }"}</div>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">4</div>
            <div className="flow-step-icon">⚡</div>
            <div className="flow-step-title">Verify & Settle</div>
            <div className="flow-step-desc">
              Facilitator verifies the payment and settles on-chain
            </div>
            <div className="flow-step-code">POST /verify → POST /settle</div>
          </div>

          <div className="flow-step">
            <div className="flow-step-number">5</div>
            <div className="flow-step-icon">✅</div>
            <div className="flow-step-title">Resource Delivered</div>
            <div className="flow-step-desc">
              Server returns 200 OK with data and payment receipt
            </div>
            <div className="flow-step-code">HTTP/1.1 200 OK<br />{"{ \"weather\": \"sunny\" }"}</div>
          </div>
        </div>
      </section>

      {/* ─── Server Code Snippet ──────────────────────────────── */}
      <section className="section container">
        <div className="section-header">
          <div className="section-tag">Integration</div>
          <h2 className="section-title">Add Payments in One Line</h2>
          <p className="section-subtitle">
            Protect any Express.js route with x402 payment middleware
          </p>
        </div>

        <div className="code-block" style={{ maxWidth: 800, margin: "0 auto" }}>
          <div className="code-header">
            <div className="code-dots">
              <div className="code-dot red" />
              <div className="code-dot yellow" />
              <div className="code-dot green" />
            </div>
            <span className="code-lang">server.ts</span>
          </div>
          <pre className="code-body">
{`import express from "express";
import { paymentMiddleware } from "@x402/express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

const app = express();
const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const server = new x402ResourceServer(facilitator);
registerExactEvmScheme(server);

app.use(paymentMiddleware({
  "GET /api/weather": {
    accepts: [{
      scheme: "exact",
      price: "$0.001",
      network: "eip155:84532",  // Base Sepolia
      payTo: "0xYourAddress",
    }],
    description: "Weather data",
  },
}, server));

app.get("/api/weather", (req, res) => {
  res.json({ weather: "sunny", temp: 72 });
});`}</pre>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section className="section container">
        <div className="section-header">
          <div className="section-tag">Why x402</div>
          <h2 className="section-title">Built for the Agentic Future</h2>
          <p className="section-subtitle">
            Zero friction, zero fees, zero centralization
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon cyan">🌐</div>
            <div className="feature-title">HTTP-Native</div>
            <div className="feature-desc">
              Built into existing HTTP requests. No additional communication or protocols needed.
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon purple">🤖</div>
            <div className="feature-title">Agent-Ready</div>
            <div className="feature-desc">
              AI agents can autonomously discover, pay for, and consume API services.
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon pink">💰</div>
            <div className="feature-title">Micropayments</div>
            <div className="feature-desc">
              Pay fractions of a cent per request. No minimums, no subscriptions, no accounts.
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon green">🔒</div>
            <div className="feature-title">Trust Minimizing</div>
            <div className="feature-desc">
              Payment schemes ensure funds only move according to client intentions.
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon orange">⚡</div>
            <div className="feature-title">Instant Settlement</div>
            <div className="feature-desc">
              Payments settle on-chain in seconds on Base and other L2 networks.
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon cyan">🔓</div>
            <div className="feature-title">Open Standard</div>
            <div className="feature-desc">
              Freely accessible, extensible, and not tied to any single party or network.
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="section container" style={{ textAlign: "center", paddingBottom: 40 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Ready to Try It?</h2>
        <p className="section-subtitle" style={{ marginBottom: 32, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
          Experience the x402 payment flow live. Connect a testnet wallet and call paid API endpoints.
        </p>
        <Link href="/demo" className="btn-primary" style={{ fontSize: 18, padding: "16px 40px" }}>
          🚀 Launch Live Demo
        </Link>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="footer container">
        <p className="footer-text">
          Built with 💜 using{" "}
          <a href="https://github.com/coinbase/x402" target="_blank" rel="noopener noreferrer">
            x402
          </a>{" "}
          by Coinbase · Running on{" "}
          <a href="https://base.org" target="_blank" rel="noopener noreferrer">
            Base Sepolia
          </a>{" "}
          Testnet
        </p>
      </footer>
    </>
  );
}
