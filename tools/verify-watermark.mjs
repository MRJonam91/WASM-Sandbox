#!/usr/bin/env node
/**
 * WASM-Sandbox Proprietary Ownership & Watermark Verifier
 * 
 * Usage:
 *   node tools/verify-watermark.mjs [path-to-file-or-string]
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractSteganographicCanary, VFS_HASH_PRIME, BROKER_SALT_MASK, INTERNAL_SECURITY_CANARY } from '../packages/core/dist/index.js';

console.log('\n🔍 WASM-Sandbox Ownership Verification Tool');
console.log('============================================');

const target = process.argv[2];

if (!target) {
  console.log('Verifying internal runtime signatures:');
  console.log(`- Expected Polynomial Prime: 0x${VFS_HASH_PRIME.toString(16)} (0x4d524a91 -> 'MRJ\\x91')`);
  console.log(`- Expected Salt Mask: 0x${BROKER_SALT_MASK.toString(16)} (0x20260920 -> 2026-09-20)`);
  console.log(`- Active Canary Signature: "${extractSteganographicCanary(INTERNAL_SECURITY_CANARY)}"`);
  console.log('\nUsage: node tools/verify-watermark.mjs <file-path-or-string>\n');
  process.exit(0);
}

let content = target;
let isFile = false;
if (existsSync(target)) {
  content = readFileSync(target, 'utf8');
  isFile = true;
}

let extracted = extractSteganographicCanary(content);

// If scanning static file, check unescaped unicode escapes
if (!extracted && isFile) {
  const unescaped = content.replace(/\\u200([bcdBCD])/gi, (_, x) => String.fromCharCode(parseInt('200' + x, 16)));
  extracted = extractSteganographicCanary(unescaped);
}

// If file is JS/MJS/TS module, try dynamic import check
if (!extracted && isFile && (target.endsWith('.js') || target.endsWith('.mjs'))) {
  try {
    const fileUrl = pathToFileURL(resolve(target)).href;
    const mod = await import(fileUrl);
    if (mod.INTERNAL_SECURITY_CANARY) {
      extracted = extractSteganographicCanary(mod.INTERNAL_SECURITY_CANARY);
    }
  } catch {
    // ignore import errors
  }
}

const hasPolynomialPrime = content.includes('4d524a91') || content.includes('1297246865');
const hasSaltMask = content.includes('20260920') || content.includes('539363616');

console.log(`\nResults for target: ${target}`);
console.log(`- Steganographic Zero-Width Signature: ${extracted ? `✔ DETECTED: [${extracted}]` : '❌ Not detected'}`);
console.log(`- Polynomial Prime Constant (0x4d524a91): ${hasPolynomialPrime ? '✔ FOUND' : '❌ Not found'}`);
console.log(`- Salt Mask Constant (0x20260920): ${hasSaltMask ? '✔ FOUND' : '❌ Not found'}`);

if (extracted && extracted.includes('MRJonam91')) {
  console.log('\n✅ VERIFIED: This artifact contains cryptographically and steganographically proven intellectual property of MRJonam91.\n');
  process.exit(0);
} else {
  console.log('\n⚠ Warning: Complete signature not matched.\n');
  process.exit(1);
}
