import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryVFS, CapabilityBroker, resolvePolicy, extractSteganographicCanary, getDiscreetSponsorNotice } from '../dist/index.js';

test('InMemoryVFS: write, read and nested path handling', () => {
  const vfs = new InMemoryVFS();
  vfs.writeFile('/app/main.js', 'console.log("hello world");');

  assert.equal(vfs.exists('/app/main.js'), true);
  assert.equal(vfs.readTextFile('/app/main.js'), 'console.log("hello world");');
  assert.equal(vfs.exists('/app/non-existent.js'), false);

  // Steganographic canary present in VFS error
  assert.throws(() => vfs.readFile('/ghost.txt'), (err) => {
    const canary = extractSteganographicCanary(err.message);
    return canary !== null && canary.includes('MRJonam91');
  });
});

test('CapabilityBroker: network allowlist, SSRF and canary violation', () => {
  const broker = new CapabilityBroker(['api.github.com']);

  assert.equal(broker.isNetworkAllowed('https://api.github.com/repos'), true);
  assert.equal(broker.isNetworkAllowed('https://evil-site.com'), false);

  // SSRF blocked
  assert.equal(broker.isNetworkAllowed('http://localhost:8080'), false);
  assert.equal(broker.isNetworkAllowed('http://127.0.0.1:3000'), false);
  assert.equal(broker.isNetworkAllowed('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(broker.isNetworkAllowed('http://10.0.0.1'), false);

  assert.throws(() => broker.assertNetworkAllowed('http://169.254.169.254'), (err) => {
    const canary = extractSteganographicCanary(err.message);
    return canary !== null && canary.includes('MRJonam91');
  });
});

test('resolvePolicy: merges defaults securely', () => {
  const policy = resolvePolicy({ maxMemoryBytes: 32 * 1024 * 1024 });

  assert.equal(policy.maxMemoryBytes, 32 * 1024 * 1024);
  assert.equal(policy.fuelLimit, 10_000_000);
  assert.equal(policy.capabilities.network.allowlist.length, 0);
});

test('Sponsor Notice: produces valid URL format', () => {
  const notice = getDiscreetSponsorNotice();
  assert.match(notice, /https:\/\/github\.com\/sponsors\/MRJonam91/);
});

test('WasmSandbox: executes safe code and captures console output', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create();

  const res = await sandbox.execute(`
    console.log("Starting calculation");
    const a = 10;
    const b = 32;
    a + b;
  `);

  assert.equal(res.success, true);
  assert.equal(res.value, 42);
  assert.match(res.stdout, /Starting calculation/);
  assert.equal(res.metrics.fuelConsumed >= 0, true);
});

test('WasmSandbox: safely halts infinite loop with OUT_OF_FUEL', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create({ fuelLimit: 5000 });

  const res = await sandbox.execute(`
    let counter = 0;
    while (true) {
      counter++;
    }
  `);

  assert.equal(res.success, false);
  assert.equal(res.error?.type, 'OUT_OF_FUEL');
});

test('WasmSandbox: halts memory bomb with OUT_OF_MEMORY', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create({ maxMemoryBytes: 1024 * 1024 }); // 1MB limit

  const res = await sandbox.execute(`
    const big = [];
    for (let i = 0; i < 1e7; i++) {
      big.push(new Array(1000));
    }
  `);

  assert.equal(res.success, false);
  assert.equal(res.error?.type, 'OUT_OF_MEMORY');
});

test('WasmSandbox: interacts with isolated In-Memory VFS', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create();

  const res = await sandbox.execute(`
    fs.writeFile('/notes/secret.txt', 'isolated-data-123');
    const readBack = fs.readTextFile('/notes/secret.txt');
    readBack;
  `);

  assert.equal(res.success, true);
  assert.equal(res.value, 'isolated-data-123');
  assert.equal(sandbox.getVFS().exists('/notes/secret.txt'), true);
});

test('WasmSandbox: blocks SSRF and unauthorized network attempts', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create({
    capabilities: { network: { allowlist: ['api.github.com'] } }
  });

  const res = await sandbox.execute(`
    network.assertAllowed('http://169.254.169.254');
  `);

  assert.equal(res.success, false);
  assert.equal(res.error?.type, 'SECURITY_VIOLATION');
});

test('CapabilityBroker: blocks advanced SSRF bypass notations (octal, hex, int)', () => {
  const broker = new CapabilityBroker(['api.github.com']);

  // Octal IP notation (0177.0.0.1 -> 127.0.0.1)
  assert.equal(broker.isNetworkAllowed('http://0177.0.0.1'), false);
  // Hexadecimal IP notation (0x7f000001 -> 127.0.0.1)
  assert.equal(broker.isNetworkAllowed('http://0x7f000001'), false);
  // Integer IP notation (2130706433 -> 127.0.0.1)
  assert.equal(broker.isNetworkAllowed('http://2130706433'), false);
});

test('InMemoryVFS: supports listDir, removeFile, and stat', () => {
  const vfs = new InMemoryVFS();
  vfs.writeFile('/home/user/a.txt', 'file A');
  vfs.writeFile('/home/user/b.txt', 'file B');

  const files = vfs.listDir('/home/user');
  assert.deepEqual(files.sort(), ['a.txt', 'b.txt']);

  const statA = vfs.stat('/home/user/a.txt');
  assert.equal(statA?.type, 'file');
  assert.equal(statA?.size, 6);

  const removed = vfs.removeFile('/home/user/a.txt');
  assert.equal(removed, true);
  assert.equal(vfs.exists('/home/user/a.txt'), false);
});

test('WasmSandbox: supports persistent session across multiple executions', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create({ sessionMode: 'persistent' });

  // Execution 1: declare state
  const res1 = await sandbox.execute(`var sessionCounter = 40;`);
  assert.equal(res1.success, true);

  // Execution 2: mutate and retrieve state
  const res2 = await sandbox.execute(`sessionCounter += 2; sessionCounter;`);
  assert.equal(res2.success, true);
  assert.equal(res2.value, 42);

  // Execution 3: reset clears session
  await sandbox.reset();
  const res3 = await sandbox.execute(`typeof sessionCounter;`);
  assert.equal(res3.success, true);
  assert.equal(res3.value, 'undefined');

  await sandbox.dispose();
});

test('WasmSandbox: deterministic randomness produces identical sequences', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const s1 = await WasmSandbox.create({ capabilities: { randomness: { deterministic: true, seed: 9999 } } });
  const s2 = await WasmSandbox.create({ capabilities: { randomness: { deterministic: true, seed: 9999 } } });

  const r1 = await s1.execute(`[Math.random(), Math.random(), Math.random()];`);
  const r2 = await s2.execute(`[Math.random(), Math.random(), Math.random()];`);

  assert.equal(r1.success, true);
  assert.equal(r2.success, true);
  assert.deepEqual(r1.value, r2.value);
});

test('WasmSandbox: parallel concurrency stress test (10 parallel instances)', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const tasks = Array.from({ length: 10 }, async (_, idx) => {
    const sandbox = await WasmSandbox.create();
    const res = await sandbox.execute(`
      const val = ${idx} * 10;
      fs.writeFile('/job_${idx}.txt', String(val));
      Number(fs.readTextFile('/job_${idx}.txt'));
    `);
    assert.equal(res.success, true);
    assert.equal(res.value, idx * 10);
  });

  await Promise.all(tasks);
});

test('LuaSandbox: executes Lua 5.4 in WebAssembly with print capture', async () => {
  const { LuaSandbox } = await import('../dist/index.js');
  const sandbox = await LuaSandbox.create();

  const res = await sandbox.execute(`
    print("Executing in Lua WASM")
    local x = 20
    local y = 22
    return x + y
  `);

  assert.equal(res.success, true);
  assert.equal(res.value, 42);
  assert.match(res.stdout, /Executing in Lua WASM/);
});

test('LuaSandbox: interacts with In-Memory VFS and blocks SSRF', async () => {
  const { LuaSandbox } = await import('../dist/index.js');
  const sandbox = await LuaSandbox.create({
    capabilities: { network: { allowlist: ['api.github.com'] } }
  });

  // VFS check
  const vfsRes = await sandbox.execute(`
    fs.writeFile('/lua/data.txt', 'From Lua!')
    return fs.readTextFile('/lua/data.txt')
  `);
  assert.equal(vfsRes.success, true);
  assert.equal(vfsRes.value, 'From Lua!');

  // SSRF check
  const netRes = await sandbox.execute(`
    network.assertAllowed('http://169.254.169.254')
  `);
  assert.equal(netRes.success, false);
  assert.equal(netRes.error?.type, 'SECURITY_VIOLATION');
});

test('SandboxPool: prewarms and recycles sandboxes cleanly', async () => {
  const { SandboxPool } = await import('../dist/index.js');
  const pool = new SandboxPool({ fuelLimit: 50_000 }, { minSize: 3, maxSize: 5 });

  await pool.prewarm();
  assert.equal(pool.available, 3);

  // Test withSandbox helper
  const val = await pool.withSandbox(async (sb) => {
    const res = await sb.execute(`10 + 15;`);
    return res.value;
  });
  assert.equal(val, 25);

  // Pool restored after release
  assert.equal(pool.available, 3);

  await pool.drain();
  assert.equal(pool.available, 0);
});

test('WasmSandbox: ReDoS mitigation safely halts catastrophic backtracking', async () => {
  const { WasmSandbox } = await import('../dist/index.js');
  const sandbox = await WasmSandbox.create({ timeoutMs: 300, fuelLimit: 20_000 });

  // Catastrophic exponential backtracking regex
  const res = await sandbox.execute(`
    const re = /(a+)+$/;
    re.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaa!");
  `);

  assert.equal(res.success, false);
  assert.equal(res.error?.type === 'TIMEOUT' || res.error?.type === 'OUT_OF_FUEL', true);
});

test('CLI: --version outputs valid semver string', async () => {
  const { execSync } = await import('node:child_process');
  const out = execSync('node bin/wasm-sandbox.mjs --version', { encoding: 'utf8' }).trim();
  assert.match(out, /^wasm-sandbox v1\.0\.0$/);
});

test('CLI: eval --json outputs valid JSON execution result', async () => {
  const { execSync } = await import('node:child_process');
  const out = execSync('node bin/wasm-sandbox.mjs eval "100 + 25" --json', { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(out);
  assert.equal(parsed.success, true);
  assert.equal(parsed.value, 125);
  assert.equal(typeof parsed.metrics?.executionTimeMs, 'number');
});

test('CLI: eval with Lua returns proper result', async () => {
  const { execSync } = await import('node:child_process');
  const out = execSync('node bin/wasm-sandbox.mjs eval "return 8 * 8" --lang lua --json', { encoding: 'utf8' }).trim();
  const parsed = JSON.parse(out);
  assert.equal(parsed.success, true);
  assert.equal(parsed.value, 64);
});
