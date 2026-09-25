#!/usr/bin/env node
/**
 * WASM-Sandbox CLI Runner
 * Micro-Isolated WebAssembly Environments for Safe Untrusted Code Execution
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WasmSandbox, printDiscreetSponsorNotice } from '../packages/core/dist/index.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
🛡️  WASM-Sandbox CLI (v0.1.0-mvp)
Execute untrusted code in lightweight WebAssembly micro-isolates.

Usage:
  wasm-sandbox eval "<javascript-code>" [options]
  wasm-sandbox run <file-path> [options]

Options:
  --fuel <number>     Instruction / fuel limit (default: 10,000,000)
  --mem <mb>          Linear memory limit in MB (default: 64)
  --allow <domain>    Add domain to network allowlist (repeatable)
  --readonly          Enforce read-only virtual filesystem
  --help              Display this help menu

Examples:
  wasm-sandbox eval "console.log('Hello from WASM'); 2 + 2;"
  wasm-sandbox eval "let x = 0; while(true) x++;" --fuel 50000
  wasm-sandbox run script.js --mem 16
`);
  printDiscreetSponsorNotice();
}

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

let codeToRun = '';
let fuelLimit = 10_000_000;
let maxMemoryBytes = 64 * 1024 * 1024;
const allowlist = [];
let readOnlyFs = false;

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--fuel' && args[i + 1]) {
    fuelLimit = parseInt(args[++i], 10);
  } else if (arg === '--mem' && args[i + 1]) {
    maxMemoryBytes = parseInt(args[++i], 10) * 1024 * 1024;
  } else if (arg === '--allow' && args[i + 1]) {
    allowlist.push(args[++i]);
  } else if (arg === '--readonly') {
    readOnlyFs = true;
  }
}

if (command === 'eval') {
  codeToRun = args[1];
  if (!codeToRun || codeToRun.startsWith('--')) {
    console.error('Error: Please provide a valid code string to evaluate.');
    process.exit(1);
  }
} else if (command === 'run') {
  const filePath = args[1];
  if (!filePath || filePath.startsWith('--') || !existsSync(filePath)) {
    console.error(`Error: File not found at path: ${filePath}`);
    process.exit(1);
  }
  codeToRun = readFileSync(resolve(filePath), 'utf8');
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

async function main() {
  const sandbox = await WasmSandbox.create({
    fuelLimit,
    maxMemoryBytes,
    capabilities: {
      network: { allowlist },
      filesystem: { readOnly: readOnlyFs }
    }
  });

  const res = await sandbox.execute(codeToRun);

  if (res.stdout) {
    process.stdout.write(res.stdout + '\n');
  }
  if (res.stderr) {
    process.stderr.write(res.stderr + '\n');
  }

  if (res.success) {
    console.log(`\x1b[32m✔ Result:\x1b[0m`, res.value);
    console.log(`\x1b[90m(Time: ${res.metrics.executionTimeMs}ms | Fuel consumed: ${res.metrics.fuelConsumed})\x1b[0m`);
    printDiscreetSponsorNotice();
    process.exit(0);
  } else {
    console.error(`\x1b[31m✖ Sandbox ${res.error?.type}:\x1b[0m ${res.error?.message}`);
    console.log(`\x1b[90m(Execution halted after ${res.metrics.executionTimeMs}ms)\x1b[0m`);
    printDiscreetSponsorNotice();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
