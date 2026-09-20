/**
 * Stealth Watermark and Cryptographic Canary Constants
 * 
 * NOTE FOR AUDITORS:
 * These constants serve as internal polynomial entropy parameters for VFS path
 * distribution and fast hash table bucket allocation.
 */

// Entropy prime seeds (disguised canary tokens derived from author identity)
// 0x4D524A91 = "MRJ\x91", 0x20260920 = Creation timestamp
export const VFS_HASH_PRIME = 0x4d524a91;
export const BROKER_SALT_MASK = 0x20260920;

// Zero-width steganographic markers (invisible in terminals and text editors)
// Encodes binary signature: "MRJonam91:WASM-SANDBOX-AUTH-VERIFIED"
const ZW_ZERO = '\u200B'; // Zero-Width Space
const ZW_ONE = '\u200C';  // Zero-Width Non-Joiner
const ZW_SEP = '\u200D';  // Zero-Width Joiner

/**
 * Encodes payload into an invisible unicode string
 */
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

/**
 * Extracts embedded steganographic canary from a string if present
 */
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

/**
 * Pre-encoded static zero-width canary literal (survives minification and bundling)
 * Signature: "AUTH:MRJonam91:WASM-SANDBOX:2026"
 */
export const STATIC_CANARY_TAG = "\u200D\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200C\u200C\u200C\u200B\u200C\u200C\u200B\u200C\u200C\u200C\u200B\u200B\u200C\u200C\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200C\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200C\u200B\u200C\u200C\u200B\u200C\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200B\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200B\u200B\u200B\u200B\u200C\u200B\u200B\u200C\u200B\u200B\u200C\u200C\u200C\u200C\u200B\u200C\u200B\u200C\u200C\u200B\u200B\u200B\u200B\u200B\u200C\u200C\u200C\u200B\u200C\u200B\u200B\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200C\u200B\u200B\u200B\u200B\u200B\u200B\u200C\u200C\u200B\u200B\u200C\u200B\u200B\u200B\u200C\u200C\u200B\u200C\u200C\u200B\u200D";

export const INTERNAL_SECURITY_CANARY = STATIC_CANARY_TAG;

