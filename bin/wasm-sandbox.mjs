#!/usr/bin/env node
/**
 * WASM-Sandbox CLI Runner
 * Micro-Isolated WebAssembly Environments for Safe Untrusted Code Execution
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WasmSandbox, LuaSandbox, printDiscreetSponsorNotice } from '../packages/core/dist/index.js';

const VERSION = '1.0.0';
const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
🛡️  WASM-Sandbox CLI (v${VERSION})
Execute untrusted code in lightweight WebAssembly micro-isolates.

Usage:
  wasm-sandbox eval "<code>" [options]
  wasm-sandbox run <file-path> [options]
  wasm-sandbox repl [options]

Commands:
  eval "<code>"       Evaluate a snippet of code directly
  run <file-path>     Execute a source code file (.js, .lua)
  repl                Start an interactive persistent REPL session

Options:
  --lang <js|lua>     Execution language: 'javascript' (default) or 'lua'
  --fuel <number>     Instruction / fuel limit (default: 10,000,000)
  --mem <mb>          Linear memory limit in MB (default: 64)
  --allow <domain>    Add domain to network allowlist (repeatable)
  --readonly          Enforce read-only virtual filesystem
  --json              Format output as raw JSON object
  -v, --version       Display CLI version
  -h, --help          Display this help menu

Examples:
  wasm-sandbox eval "console.log('Hello from JS WASM'); 2 + 2;"
  wasm-sandbox eval "print('Hello from Lua WASM!'); return 10 * 3;" --lang lua
  wasm-sandbox eval "2 + 2" --json
  wasm-sandbox eval "let x = 0; while(true) x++;" --fuel 50000
  wasm-sandbox run script.lua --lang lua
  wasm-sandbox repl --lang js
`);
  printDiscreetSponsorNotice();
}

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  console.log(`wasm-sandbox v${VERSION}`);
  process.exit(0);
}

let codeToRun = '';
let language = 'javascript';
let fuelLimit = 10_000_000;
let maxMemoryBytes = 64 * 1024 * 1024;
const allowlist = [];
let readOnlyFs = false;
let jsonOutput = false;

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if ((arg === '--lang' || arg === '-l') && args[i + 1]) {
    const val = args[++i].toLowerCase();
    language = val.includes('lua') ? 'lua' : 'javascript';
  } else if (arg === '--fuel' && args[i + 1]) {
    fuelLimit = parseInt(args[++i], 10);
  } else if (arg === '--mem' && args[i + 1]) {
    maxMemoryBytes = parseInt(args[++i], 10) * 1024 * 1024;
  } else if (arg === '--allow' && args[i + 1]) {
    allowlist.push(args[++i]);
  } else if (arg === '--readonly') {
    readOnlyFs = true;
  } else if (arg === '--json') {
    jsonOutput = true;
  }
}

async function startRepl(policy) {
  const rl = readline.createInterface({ input, output });
  console.log(`🛡️  WASM-Sandbox v${VERSION} Interactive REPL (${language})`);
  console.log(`Type code to evaluate, '.reset' to clear session, or '.exit' to quit.\n`);

  const sandbox = language === 'lua'
    ? await LuaSandbox.create(policy)
    : await WasmSandbox.create(policy);

  try {
    while (true) {
      let line;
      try {
        line = await rl.question(`wasm-${language}> `);
      } catch {
        break; // Stream ended
      }

      if (line === null || line === undefined) break;
      const trimmed = line.trim();

      if (trimmed === '.exit') {
        break;
      } else if (trimmed === '.reset') {
        await sandbox.reset();
        console.log('\x1b[33m✔ Sandbox state reset.\x1b[0m');
        continue;
      } else if (trimmed === '.help') {
        console.log("Commands: .exit, .reset, .help");
        continue;
      } else if (!trimmed) {
        continue;
      }

      const res = await sandbox.execute(line);
      if (res.stdout) {
        process.stdout.write(res.stdout + '\n');
      }
      if (res.stderr) {
        process.stderr.write(res.stderr + '\n');
      }

      if (res.success) {
        console.log(`\x1b[32m✔\x1b[0m`, res.value);
      } else {
        console.error(`\x1b[31m✖ ${res.error?.type}:\x1b[0m ${res.error?.message}`);
      }
    }
  } finally {
    rl.close();
    await sandbox.dispose();
    printDiscreetSponsorNotice();
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
  if (filePath.endsWith('.lua') && !args.includes('--lang')) {
    language = 'lua';
  }
} else if (command === 'repl') {
  // Handled in main
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

async function main() {
  const policy = {
    language,
    fuelLimit,
    maxMemoryBytes,
    sessionMode: command === 'repl' ? 'persistent' : 'ephemeral',
    capabilities: {
      network: { allowlist },
      filesystem: { readOnly: readOnlyFs }
    }
  };

  if (command === 'repl') {
    await startRepl(policy);
    process.exit(0);
  }

  const sandbox = language === 'lua' 
    ? await LuaSandbox.create(policy) 
    : await WasmSandbox.create(policy);

  const res = await sandbox.execute(codeToRun);
  await sandbox.dispose();

  if (jsonOutput) {
    console.log(JSON.stringify(res, null, 2));
    process.exitCode = res.success ? 0 : 1;
    return;
  }

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
    process.exitCode = 0;
  } else {
    console.error(`\x1b[31m✖ Sandbox ${res.error?.type}:\x1b[0m ${res.error?.message}`);
    console.log(`\x1b[90m(Execution halted after ${res.metrics.executionTimeMs}ms)\x1b[0m`);
    printDiscreetSponsorNotice();
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
