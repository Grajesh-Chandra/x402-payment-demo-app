"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";

function JokeContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data");

  if (!dataParam) {
    return (
      <div className="resource-empty">
        <div className="resource-empty-icon">🔒</div>
        <h2>Payment Required</h2>
        <p>This resource requires an x402 payment to access.</p>
        <Link href="/demo" className="btn-primary">Go to Demo →</Link>
      </div>
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(atob(dataParam));
  } catch {
    return (
      <div className="resource-empty">
        <div className="resource-empty-icon">⚠️</div>
        <h2>Invalid Data</h2>
        <p>Could not decode the resource data.</p>
        <Link href="/demo" className="btn-primary">Go to Demo →</Link>
      </div>
    );
  }

  const joke = data.data as Record<string, unknown> || {};

  return (
    <div className="resource-card joke-card">
      <div className="resource-paid-badge">
        <span className="paid-dot" />
        ✅ Paid via x402 Protocol
      </div>

      <div className="joke-hero">
        <div className="joke-icon">😂</div>
        <div className="joke-category">{joke.category as string}</div>
      </div>

      <div className="joke-content">
        <div className="joke-setup">{joke.setup as string}</div>
        <div className="joke-divider">
          <span>🥁</span>
        </div>
        <div className="joke-punchline">{joke.punchline as string}</div>
      </div>

      <div className="payment-receipt">
        <div className="receipt-title">Payment Receipt</div>
        <div className="receipt-row">
          <span>Protocol</span><span>x402 (HTTP 402)</span>
        </div>
        <div className="receipt-row">
          <span>Amount</span><span>$0.0005 USDC</span>
        </div>
        <div className="receipt-row">
          <span>Network</span><span>Base Sepolia</span>
        </div>
        <div className="receipt-row">
          <span>Scheme</span><span>Exact</span>
        </div>
      </div>

      <div className="resource-actions">
        <Link href="/demo" className="btn-secondary">← Back to Demo</Link>
      </div>
    </div>
  );
}

export default function JokePage() {
  return (
    <>
      <Header />
      <main className="resource-page container">
        <Suspense fallback={<div className="resource-loading">Loading...</div>}>
          <JokeContent />
        </Suspense>
      </main>
    </>
  );
}
