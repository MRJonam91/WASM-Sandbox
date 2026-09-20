import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryVFS, CapabilityBroker, resolvePolicy } from '../dist/index.js';

test('InMemoryVFS: write, read and nested path handling', () => {
  const vfs = new InMemoryVFS();
  vfs.writeFile('/app/main.js', 'console.log("hello world");');

  assert.equal(vfs.exists('/app/main.js'), true);
  assert.equal(vfs.readTextFile('/app/main.js'), 'console.log("hello world");');
  assert.equal(vfs.exists('/app/non-existent.js'), false);
});

test('CapabilityBroker: network allowlist & SSRF prevention', () => {
  const broker = new CapabilityBroker(['api.github.com']);

  assert.equal(broker.isNetworkAllowed('https://api.github.com/repos'), true);
  assert.equal(broker.isNetworkAllowed('https://evil-site.com'), false);

  // SSRF blocked
  assert.equal(broker.isNetworkAllowed('http://localhost:8080'), false);
  assert.equal(broker.isNetworkAllowed('http://127.0.0.1:3000'), false);
  assert.equal(broker.isNetworkAllowed('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(broker.isNetworkAllowed('http://10.0.0.1'), false);
});

test('resolvePolicy: merges defaults securely', () => {
  const policy = resolvePolicy({ maxMemoryBytes: 32 * 1024 * 1024 });

  assert.equal(policy.maxMemoryBytes, 32 * 1024 * 1024);
  assert.equal(policy.fuelLimit, 10_000_000);
  assert.equal(policy.capabilities.network.allowlist.length, 0);
});
