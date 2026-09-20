/**
 * Discreet sponsorship & attribution helper
 */
export const SPONSOR_CONFIG = {
  github: 'https://github.com/sponsors/MRJonam91',
  koFi: 'https://ko-fi.com/mrjonam',
  buyMeACoffee: 'https://buymeacoffee.com/mrjonam',
  paypal: 'https://paypal.me/manorollo'
};

/**
 * Returns a sleek, discreet sponsor footer string for CLI tools and diagnostic logs
 */
export function getDiscreetSponsorNotice(): string {
  return '\x1b[90m⚡ WASM-Sandbox | Support development: https://github.com/sponsors/MRJonam91\x1b[0m';
}

/**
 * Conditionally prints discreet notice if not suppressed by NO_COLOR or QUIET env vars
 */
export function printDiscreetSponsorNotice(): void {
  if (process.env.WASM_SANDBOX_QUIET || process.env.CI) {
    return;
  }
  console.log(getDiscreetSponsorNotice());
}
