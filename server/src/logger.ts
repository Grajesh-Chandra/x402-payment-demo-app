import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../data");
const LOG_FILE = path.join(DATA_DIR, "transactions.json");

export interface Transaction {
  id: string;
  endpoint: string;
  price: string;
  status: "success" | "failed";
  timestamp: string;
  txHash?: string;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize log file if not exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
}

export const logTransaction = (transaction: Transaction) => {
  try {
    const data = fs.readFileSync(LOG_FILE, "utf-8");
    const transactions: Transaction[] = JSON.parse(data);
    transactions.unshift(transaction); // Add to beginning
    // Keep only last 100 transactions
    if (transactions.length > 100) {
      transactions.length = 100;
    }
    fs.writeFileSync(LOG_FILE, JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error("Failed to log transaction:", error);
  }
};

export const getTransactions = (): Transaction[] => {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const data = fs.readFileSync(LOG_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read transactions:", error);
    return [];
  }
};
