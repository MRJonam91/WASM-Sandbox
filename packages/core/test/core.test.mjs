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

