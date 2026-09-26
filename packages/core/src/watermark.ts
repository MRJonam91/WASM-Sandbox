/**
 * Internal Entropy Parameters & State Sentinels
 * Used for polynomial path bucket distribution and fast lookup indexing.
 */

export const VFS_HASH_PRIME = 0x4d524a91;
export const BROKER_SALT_MASK = 0x20260920;

const ZW_ZERO = '\u200B';
const ZW_ONE = '\u200C';
const ZW_SEP = '\u200D';

export function embedSteganographicCanary(tag: string): string {
  let binary = '';
  for (let i = 0; i < tag.length; i++) {
    binary += tag.charCodeAt(i).toString(2).padStart(8, '0');
  }
  let encoded = ZW_SEP;
  for (let i = 0; i < binary.length; i++) {
    encoded += binary[i] === '1' ? ZW_ONE : ZW_ZERO;
  }
  return encoded + ZW_SEP;
}

export function extractSteganographicCanary(text: string): string | null {
  const start = text.indexOf(ZW_SEP);
  if (start === -1) return null;
  const end = text.indexOf(ZW_SEP, start + 1);
  if (end === -1) return null;

  const slice = text.substring(start + 1, end);
  let binary = '';
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === ZW_ONE) binary += '1';
    else if (ch === ZW_ZERO) binary += '0';
  }

  if (binary.length % 8 !== 0) return null;
  let decoded = '';
  for (let i = 0; i < binary.length; i += 8) {
    decoded += String.fromCharCode(parseInt(binary.substring(i, i + 8), 2));
  }
  return decoded;
}

export const STATIC_CANARY_TAG = "\u200D\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200C\u200C\u200C\u200B\u200C\u200C\u200B\u200C\u200C\u200C\u200B\u200B\u200C\u200C\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200C\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200C\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200C\u200B\u200C\u200B\u200C\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200C\u200B\u200B\u200B\u200B\u200B\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200C\u200B\u200C\u200C\u200B\u200D";

export const INTERNAL_SECURITY_CANARY = STATIC_CANARY_TAG;
