"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";

function ReportContent() {
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

  const report = data.data as Record<string, unknown> || {};
  const highlights = (report.highlights as string[]) || [];

  const sentimentColor: Record<string, string> = {
    "Bullish": "var(--accent-green)",
    "Bearish": "var(--accent-red)",
    "Neutral": "var(--accent-orange)",
  };
  const riskColor: Record<string, string> = {
    "Low": "var(--accent-green)",
    "Moderate": "var(--accent-orange)",
    "High": "var(--accent-red)",
  };

  return (
    <div className="resource-card report-card">
      <div className="resource-paid-badge">
        <span className="paid-dot" />
        ✅ Paid via x402 Protocol
      </div>

      <div className="report-hero">
        <div className="report-icon">📊</div>
        <h1 className="report-title">{report.title as string}</h1>
        <div className="report-meta">
          <span className="report-analyst">By {report.analyst as string}</span>
          <span className="report-date">{new Date(report.timestamp as string).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="report-badges">
        <div className="report-badge" style={{ borderColor: sentimentColor[report.sentiment as string] || "var(--accent-cyan)", color: sentimentColor[report.sentiment as string] || "var(--accent-cyan)" }}>
          📈 Sentiment: {report.sentiment as string}
        </div>
        <div className="report-badge" style={{ borderColor: riskColor[report.riskLevel as string] || "var(--accent-orange)", color: riskColor[report.riskLevel as string] || "var(--accent-orange)" }}>
          ⚠️ Risk: {report.riskLevel as string}
        </div>
      </div>

      <div className="report-summary">
        <h3>Executive Summary</h3>
        <p>{report.summary as string}</p>
      </div>

      <div className="report-highlights">
        <h3>Key Highlights</h3>
        <ul>
          {highlights.map((h, i) => (
            <li key={i}>
              <span className="highlight-bullet">▸</span>
              {h}
            </li>
          ))}
        </ul>
      </div>

      <div className="payment-receipt">
        <div className="receipt-title">Payment Receipt</div>
        <div className="receipt-row">
          <span>Protocol</span><span>x402 (HTTP 402)</span>
        </div>
        <div className="receipt-row">
          <span>Amount</span><span>$0.01 USDC</span>
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

export default function ReportPage() {
  return (
    <>
      <Header />
      <main className="resource-page container">
        <Suspense fallback={<div className="resource-loading">Loading...</div>}>
          <ReportContent />
        </Suspense>
      </main>
    </>
  );
}
