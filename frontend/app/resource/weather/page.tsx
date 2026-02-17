"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";

function WeatherContent() {
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

  const weather = data.data as Record<string, unknown> || {};
  const conditionIcons: Record<string, string> = {
    "Sunny": "☀️",
    "Foggy": "🌫️",
    "Partly Cloudy": "⛅",
    "Rainy": "🌧️",
    "Hot & Humid": "🔥",
    "Cloudy": "☁️",
    "Snowy": "❄️",
  };
  const icon = conditionIcons[weather.condition as string] || "🌤️";

  return (
    <div className="resource-card weather-card">
      <div className="resource-paid-badge">
        <span className="paid-dot" />
        ✅ Paid via x402 Protocol
      </div>

      <div className="weather-hero">
        <div className="weather-icon-big">{icon}</div>
        <div className="weather-temp">{weather.temp as number}°F</div>
        <div className="weather-condition">{weather.condition as string}</div>
        <div className="weather-city">📍 {weather.city as string}</div>
      </div>

      <div className="weather-details">
        <div className="weather-detail-item">
          <div className="weather-detail-icon">💧</div>
          <div className="weather-detail-label">Humidity</div>
          <div className="weather-detail-value">{weather.humidity as number}%</div>
        </div>
        <div className="weather-detail-item">
          <div className="weather-detail-icon">💨</div>
          <div className="weather-detail-label">Wind</div>
          <div className="weather-detail-value">{weather.wind as string}</div>
        </div>
        <div className="weather-detail-item">
          <div className="weather-detail-icon">🕐</div>
          <div className="weather-detail-label">Updated</div>
          <div className="weather-detail-value">{new Date(weather.timestamp as string).toLocaleTimeString()}</div>
        </div>
        <div className="weather-detail-item">
          <div className="weather-detail-icon">📡</div>
          <div className="weather-detail-label">Source</div>
          <div className="weather-detail-value">{weather.source as string}</div>
        </div>
      </div>

      <div className="payment-receipt">
        <div className="receipt-title">Payment Receipt</div>
        <div className="receipt-row">
          <span>Protocol</span><span>x402 (HTTP 402)</span>
        </div>
        <div className="receipt-row">
          <span>Amount</span><span>$0.001 USDC</span>
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

export default function WeatherPage() {
  return (
    <>
      <Header />
      <main className="resource-page container">
        <Suspense fallback={<div className="resource-loading">Loading...</div>}>
          <WeatherContent />
        </Suspense>
      </main>
    </>
  );
}
