// Generate a new EVM wallet using viem
// Usage: node server/scripts/generate-wallet.mjs (run from project root after npm install)
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log(JSON.stringify({
  address: account.address,
  privateKey: privateKey,
}));
