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
  assert.equal(res.metrics.fuelConsumed > 0, true);
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

