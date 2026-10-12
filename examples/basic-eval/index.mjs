/**
 * WASM-Sandbox MVP Demonstration
 * 
 * Demonstrates:
 * 1. Safe computation & console capture
 * 2. In-Memory VFS file read/write
 * 3. Deterministic fuel metering stopping an infinite loop
 * 4. Capability broker blocking SSRF attempts
 */

import { WasmSandbox, printDiscreetSponsorNotice } from '@wasm-sandbox/core';

async function runDemo() {
  console.log('=====================================================');
  console.log('🛡️  WASM-Sandbox v1.0.0 Live Demonstration');
  console.log('=====================================================\n');

  // --- 1. Basic Safe Execution ---
  console.log('1️⃣ Running safe computation in WebAssembly...');
  const sandbox = await WasmSandbox.create();
  const safeRes = await sandbox.execute(`
    console.log("Hello from inside isolated WebAssembly!");
    const items = [10, 20, 30, 40];
    items.reduce((acc, n) => acc + n, 0);
  `);

  console.log('   Result:', safeRes.value);
  console.log('   Captured stdout:', safeRes.stdout);
  console.log(`   Metrics: ${safeRes.metrics.executionTimeMs}ms execution time\n`);

  // --- 2. In-Memory VFS ---
  console.log('2️⃣ Writing & reading files in Ephemeral VFS...');
  const vfsRes = await sandbox.execute(`
    fs.writeFile('/tmp/demo.json', JSON.stringify({ status: 'isolated', secure: true }));
    const saved = fs.readTextFile('/tmp/demo.json');
    JSON.parse(saved);
  `);
  console.log('   File parsed from VFS:', vfsRes.value);
  console.log(`   Host filesystem touched: NONE (100% ephemeral in RAM)\n`);

  // --- 3. Deterministic Fuel Metering (Anti-DoS) ---
  console.log('3️⃣ Halting an infinite loop deterministically (Fuel Metering)...');
  const fuelSandbox = await WasmSandbox.create({ fuelLimit: 5000 });
  const loopRes = await fuelSandbox.execute(`
    let counter = 0;
    while (true) {
      counter++;
    }
  `);
  console.log(`   Success: ${loopRes.success}`);
  console.log(`   Halted Error: ${loopRes.error?.type} (${loopRes.error?.message})`);
  console.log(`   Host responsiveness: 100% unharmed\n`);

  // --- 4. Capability Broker & SSRF Defense ---
  console.log('4️⃣ Blocking SSRF to AWS/GCP/Azure Cloud Metadata (169.254.169.254)...');
  const netRes = await sandbox.execute(`
    network.assertAllowed('http://169.254.169.254/latest/meta-data/');
  `);
  console.log(`   Success: ${netRes.success}`);
  console.log(`   Blocked with: ${netRes.error?.type} (${netRes.error?.message})\n`);

  console.log('=====================================================');
  printDiscreetSponsorNotice();
  console.log('=====================================================\n');
}

runDemo().catch(console.error);
