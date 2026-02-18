import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../data");
const TRANSACTION_FILE = path.join(DATA_DIR, "transactions.json");
const SERVER_LOG_FILE = path.join(DATA_DIR, "server.log");

// ─── Transaction Types ──────────────────────────────────────────────
export interface Transaction {
  id: string;
  endpoint: string;
  method: string;
  price: string;
  status: "success" | "failed";
  statusCode: number;
  timestamp: string;
  durationMs: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}

// ─── Ensure data directory exists ───────────────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TRANSACTION_FILE)) {
  fs.writeFileSync(TRANSACTION_FILE, JSON.stringify([], null, 2));
}

// ─── Strip ANSI color codes for clean file logging ──────────────────
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ─── Append to server log file ──────────────────────────────────────
export const appendToServerLog = (message: string) => {
  try {
    const clean = stripAnsi(message);
    fs.appendFileSync(SERVER_LOG_FILE, clean + "\n");
  } catch (error) {
    // Silently fail — don't break the server if logging fails
  }
};

// ─── Log transaction to JSON file ───────────────────────────────────
export const logTransaction = (transaction: Transaction) => {
  try {
    const data = fs.readFileSync(TRANSACTION_FILE, "utf-8");
    const transactions: Transaction[] = JSON.parse(data);
    transactions.unshift(transaction);
    // Keep only last 200 transactions
    if (transactions.length > 200) {
      transactions.length = 200;
    }
    fs.writeFileSync(TRANSACTION_FILE, JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error("Failed to log transaction:", error);
  }
};

// ─── Read transactions from JSON file ───────────────────────────────
export const getTransactions = (): Transaction[] => {
  try {
    if (!fs.existsSync(TRANSACTION_FILE)) return [];
    const data = fs.readFileSync(TRANSACTION_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read transactions:", error);
    return [];
  }
};

// ─── Read raw server log file ───────────────────────────────────────
export const getServerLog = (): string => {
  try {
    if (!fs.existsSync(SERVER_LOG_FILE)) return "";
    return fs.readFileSync(SERVER_LOG_FILE, "utf-8");
  } catch (error) {
    return "";
  }
};
