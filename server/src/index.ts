import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { paymentMiddleware } from "@x402/express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { logTransaction, getTransactions, appendToServerLog, getServerLog } from "./logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4021;

// ─── Configuration ─────────────────────────────────────────────────
const payTo = process.env.PAY_TO_ADDRESS || "0x209693Bc6EfC3BEDC16a31990A4B163C56Db0434";
const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const network = (process.env.NETWORK || "eip155:84532") as `${string}:${string}`; // Base Sepolia

// ─── CORS ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    exposedHeaders: [
      "X-PAYMENT-RESPONSE",
      "PAYMENT-RESPONSE",
      "X-PAYMENT-REQUIRED",
      "PAYMENT-REQUIRED",
    ],
  })
);

app.use(express.json());

// ─── Helper: log to both console and file ──────────────────────────
function log(message: string) {
  console.log(message);
  appendToServerLog(message);
}

// ─── Request/Response Logger ───────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

function statusColor(status: number) {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  return colors.green;
}

function methodColor(method: string) {
  switch (method) {
    case "GET": return colors.green;
    case "POST": return colors.blue;
    case "PUT": return colors.yellow;
    case "DELETE": return colors.red;
    default: return colors.white;
  }
}

// ─── Endpoint pricing lookup ───────────────────────────────────────
const ENDPOINT_PRICES: Record<string, string> = {
  "/api/weather": "$0.001",
  "/api/joke": "$0.0005",
  "/api/premium-report": "$0.01",
};

// ─── Unique transaction ID counter ─────────────────────────────────
let txCounter = 0;

app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // ── Capture payment-related request headers ──
  const paymentHeaders = [
    "x-payment", "x-payment-response", "payment-response",
    "x-payment-required", "payment-required",
  ];
  const capturedReqHeaders: Record<string, string> = {};

  // ── Log incoming request ──
  log("");
  log(`${colors.dim}──────────────────────────────────────────────────────${colors.reset}`);
  log(
    `${colors.magenta}▶ REQUEST${colors.reset}  ` +
    `${methodColor(req.method)}${req.method}${colors.reset} ` +
    `${colors.white}${req.originalUrl}${colors.reset}  ` +
    `${colors.dim}${timestamp}${colors.reset}`
  );

  // Log query params
  if (Object.keys(req.query).length > 0) {
    log(`  ${colors.dim}Query:${colors.reset} ${JSON.stringify(req.query)}`);
  }

  // Log request body (for POST/PUT)
  if (req.body && Object.keys(req.body).length > 0) {
    log(`  ${colors.dim}Body:${colors.reset} ${JSON.stringify(req.body, null, 2)}`);
  }

  // Log x402 payment headers
  for (const header of paymentHeaders) {
    const value = req.headers[header];
    if (value) {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      capturedReqHeaders[header] = strValue;
      const truncated = strValue.length > 120 ? strValue.slice(0, 120) + "..." : strValue;
      log(`  ${colors.yellow}⚡ ${header}:${colors.reset} ${truncated}`);
    }
  }

  // Log other notable headers
  const origin = req.headers["origin"];
  const ua = req.headers["user-agent"];
  if (origin) {
    log(`  ${colors.dim}Origin:${colors.reset} ${origin}`);
    capturedReqHeaders["origin"] = String(origin);
  }
  if (ua) {
    log(`  ${colors.dim}User-Agent:${colors.reset} ${ua?.toString().slice(0, 80)}`);
  }

  // ── Intercept response to log it ──
  let txLogged = false;
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    log(
      `${colors.magenta}◀ RESPONSE${colors.reset} ` +
      `${statusColor(status)}${status}${colors.reset} ` +
      `${methodColor(req.method)}${req.method}${colors.reset} ` +
      `${colors.white}${req.originalUrl}${colors.reset}  ` +
      `${colors.dim}${duration}ms${colors.reset}`
    );

    // Log response payment headers
    const capturedResHeaders: Record<string, string> = {};
    for (const header of paymentHeaders) {
      const value = res.getHeader(header);
      if (value) {
        const str = typeof value === "string" ? value : JSON.stringify(value);
        capturedResHeaders[header] = str;
        const truncated = str.length > 200 ? str.slice(0, 200) + "..." : str;
        log(`  ${colors.yellow}⚡ ${header}:${colors.reset} ${truncated}`);
      }
    }

    // Log response body
    if (body) {
      const bodyStr = JSON.stringify(body, null, 2);
      if (bodyStr.length > 1500) {
        log(`  ${colors.dim}Response Body (truncated):${colors.reset}`);
        log(`  ${bodyStr.slice(0, 1500)}...`);
      } else {
        log(`  ${colors.dim}Response Body:${colors.reset}`);
        log(`  ${bodyStr}`);
      }
    }

    log(`${colors.dim}──────────────────────────────────────────────────────${colors.reset}`);

    // ── Log transaction for protected endpoints ──
    const endpointPath = req.path;
    if (ENDPOINT_PRICES[endpointPath]) {
      txLogged = true;
      logTransaction({
        id: `tx-${Date.now()}-${++txCounter}`,
        endpoint: endpointPath,
        method: req.method,
        price: ENDPOINT_PRICES[endpointPath],
        status: status >= 200 && status < 300 ? "success" : "failed",
        statusCode: status,
        timestamp: new Date().toISOString(),
        durationMs: duration,
        requestHeaders: Object.keys(capturedReqHeaders).length > 0 ? capturedReqHeaders : undefined,
        responseHeaders: Object.keys(capturedResHeaders).length > 0 ? capturedResHeaders : undefined,
        responseBody: body,
        error: status >= 400 ? `HTTP ${status}` : undefined,
      });
    }

    return originalJson(body);
  };

  // Also log non-JSON responses (like 402s that might use .send())
  const originalSend = res.send.bind(res);
  res.send = (body: unknown) => {
    // Only log if res.json didn't already handle it
    if (!res.headersSent && !txLogged) {
      const duration = Date.now() - start;
      const status = res.statusCode;

      log(
        `${colors.magenta}◀ RESPONSE${colors.reset} ` +
        `${statusColor(status)}${status}${colors.reset} ` +
        `${methodColor(req.method)}${req.method}${colors.reset} ` +
        `${colors.white}${req.originalUrl}${colors.reset}  ` +
        `${colors.dim}${duration}ms${colors.reset}`
      );

      // Log all response headers for non-200 responses (e.g. 402)
      const capturedResHeaders: Record<string, string> = {};
      if (status !== 200) {
        const headers = res.getHeaders();
        const interestingHeaders = Object.entries(headers).filter(
          ([key]) => !["connection", "keep-alive", "transfer-encoding"].includes(key)
        );
        if (interestingHeaders.length > 0) {
          log(`  ${colors.dim}Response Headers:${colors.reset}`);
          for (const [key, value] of interestingHeaders) {
            const str = typeof value === "string" ? value : JSON.stringify(value);
            capturedResHeaders[key] = str;
            const truncated = str.length > 200 ? str.slice(0, 200) + "..." : str;
            log(`    ${colors.cyan}${key}:${colors.reset} ${truncated}`);
          }
        }
      }

      if (body && typeof body === "string" && body.length > 0) {
        const truncated = body.length > 1500 ? body.slice(0, 1500) + "..." : body;
        log(`  ${colors.dim}Response Body:${colors.reset}`);
        log(`  ${truncated}`);
      }

      log(`${colors.dim}──────────────────────────────────────────────────────${colors.reset}`);

      // ── Log transaction for protected endpoints (non-JSON 402 responses) ──
      const endpointPath = req.path;
      if (ENDPOINT_PRICES[endpointPath]) {
        let parsedBody: unknown = undefined;
        if (body && typeof body === "string") {
          try { parsedBody = JSON.parse(body); } catch { parsedBody = body; }
        }
        txLogged = true;
        logTransaction({
          id: `tx-${Date.now()}-${++txCounter}`,
          endpoint: endpointPath,
          method: req.method,
          price: ENDPOINT_PRICES[endpointPath],
          status: "failed",
          statusCode: status,
          timestamp: new Date().toISOString(),
          durationMs: duration,
          requestHeaders: Object.keys(capturedReqHeaders).length > 0 ? capturedReqHeaders : undefined,
          responseHeaders: Object.keys(capturedResHeaders).length > 0 ? capturedResHeaders : undefined,
          responseBody: parsedBody,
          error: `HTTP ${status}`,
        });
      }
    }
    return originalSend(body);
  };

  next();
});

// ─── x402 Setup ────────────────────────────────────────────────────
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(server);

// ─── Payment Middleware (protects routes) ──────────────────────────
app.use(
  paymentMiddleware(
    {
      "GET /api/weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network,
            payTo,
          },
        ],
        description: "Get current weather data for any city worldwide",
        mimeType: "application/json",
      },
      "GET /api/joke": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.0005",
            network,
            payTo,
          },
        ],
        description: "Get a random premium developer joke",
        mimeType: "application/json",
      },
      "GET /api/premium-report": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network,
            payTo,
          },
        ],
        description: "Access a premium crypto market analysis report",
        mimeType: "application/json",
      },
    },
    server
  )
);

// ─── Protected Endpoints ───────────────────────────────────────────

app.get("/api/weather", (_req, res) => {
  const cities = [
    { city: "San Francisco", temp: 62, condition: "Foggy", humidity: 78, wind: "12 mph NW" },
    { city: "New York", temp: 45, condition: "Partly Cloudy", humidity: 55, wind: "8 mph NE" },
    { city: "Tokyo", temp: 68, condition: "Sunny", humidity: 40, wind: "5 mph SE" },
    { city: "London", temp: 50, condition: "Rainy", humidity: 85, wind: "15 mph W" },
    { city: "Mumbai", temp: 88, condition: "Hot & Humid", humidity: 90, wind: "6 mph SW" },
  ];
  const weather = cities[Math.floor(Math.random() * cities.length)];
  res.json({
    success: true,
    data: {
      ...weather,
      timestamp: new Date().toISOString(),
      source: "x402 Weather API",
    },
    payment: { protocol: "x402", status: "paid" },
  });
});

app.get("/api/joke", (_req, res) => {
  const jokes = [
    { setup: "Why do programmers prefer dark mode?", punchline: "Because light attracts bugs." },
    { setup: "What's a blockchain developer's favorite dance?", punchline: "The hash shuffle." },
    { setup: "Why did the smart contract break up?", punchline: "Too many trust issues." },
    { setup: "What do you call a crypto investor who's always calm?", punchline: "A stable coin." },
    { setup: "Why did the developer go broke?", punchline: "Because he used up all his cache." },
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  res.json({
    success: true,
    data: {
      ...joke,
      category: "Developer Humor",
      timestamp: new Date().toISOString(),
    },
    payment: { protocol: "x402", status: "paid" },
  });
});

app.get("/api/premium-report", (_req, res) => {
  res.json({
    success: true,
    data: {
      title: "Crypto Market Analysis — Q1 2026",
      summary:
        "The crypto market continues its bullish trajectory with stablecoin adoption reaching new ATH. Base chain leads L2 TVL growth at $18.2B. x402 protocol transaction volume surpassed 2M daily requests across 15,000+ endpoints.",
      highlights: [
        "Bitcoin consolidating above $125K, next target $140K",
        "Ethereum L2 ecosystem TVL: $85B combined",
        "Base chain daily transactions: 45M (up 320% YoY)",
        "Stablecoin market cap: $420B",
        "x402-enabled endpoints: 15,000+ across 40 networks",
      ],
      sentiment: "Bullish",
      riskLevel: "Moderate",
      timestamp: new Date().toISOString(),
      analyst: "x402 Research Desk",
    },
    payment: { protocol: "x402", status: "paid" },
  });
});

// ─── Log Endpoints ─────────────────────────────────────────────────

app.get("/api/transactions", (_req, res) => {
  const transactions = getTransactions();
  res.json({ success: true, transactions });
});

app.get("/api/server-log", (_req, res) => {
  const logContent = getServerLog();
  res.json({ success: true, log: logContent });
});

// ─── Free Endpoints ────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    server: "x402 Demo Resource Server",
    version: "1.0.0",
    uptime: process.uptime(),
    facilitator: facilitatorUrl,
    network,
    payTo,
  });
});

app.get("/api/endpoints", (_req, res) => {
  res.json({
    endpoints: [
      {
        method: "GET",
        path: "/api/weather",
        description: "Get current weather data for any city worldwide",
        price: "$0.001",
        currency: "USDC",
        network,
        scheme: "exact",
        icon: "🌤️",
      },
      {
        method: "GET",
        path: "/api/joke",
        description: "Get a random premium developer joke",
        price: "$0.0005",
        currency: "USDC",
        network,
        scheme: "exact",
        icon: "😂",
      },
      {
        method: "GET",
        path: "/api/premium-report",
        description: "Access a premium crypto market analysis report",
        price: "$0.01",
        currency: "USDC",
        network,
        scheme: "exact",
        icon: "📊",
      },
    ],
    facilitator: facilitatorUrl,
    payTo,
    network,
    protocol: "x402",
  });
});

// ─── Start Server ──────────────────────────────────────────────────

app.listen(PORT, () => {
  const banner = `
  ╔══════════════════════════════════════════════════╗
  ║         x402 Demo Resource Server               ║
  ╠══════════════════════════════════════════════════╣
  ║  🌐  Server:      http://localhost:${PORT}        ║
  ║  ⚡  Facilitator: ${facilitatorUrl.slice(0, 30)}...  ║
  ║  ⛓️   Network:     ${network.padEnd(25)}   ║
  ║  💰  Pay To:      ${payTo.slice(0, 10)}...${payTo.slice(-6)}          ║
  ╠══════════════════════════════════════════════════╣
  ║  Protected Endpoints:                           ║
  ║    GET /api/weather         $0.001  USDC        ║
  ║    GET /api/joke            $0.0005 USDC        ║
  ║    GET /api/premium-report  $0.01   USDC        ║
  ║  Free Endpoints:                                ║
  ║    GET /api/health                              ║
  ║    GET /api/endpoints                           ║
  ║    GET /api/transactions    (log viewer)        ║
  ║    GET /api/server-log      (raw server log)    ║
  ╚══════════════════════════════════════════════════╝
`;
  log(banner);
});
