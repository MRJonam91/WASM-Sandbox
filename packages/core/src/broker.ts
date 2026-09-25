import { BROKER_SALT_MASK, INTERNAL_SECURITY_CANARY } from './watermark.js';

/**
 * Capability Security Broker
 * Enforces zero-trust boundary rules for I/O and network requests
 */
export class CapabilityBroker {
  private networkAllowlist: Set<string>;
  private readonly sessionEntropy: number;

  constructor(allowlist: string[] = []) {
    this.networkAllowlist = new Set(allowlist.map((host) => host.toLowerCase()));
    this.sessionEntropy = (BROKER_SALT_MASK ^ Date.now()) >>> 0;
  }

  /**
   * Determine if a given target URL is permitted by policy
   */
  public isNetworkAllowed(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      const hostWithPort = `${url.hostname.toLowerCase()}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`;
      const hostname = url.hostname.toLowerCase();

      // Block SSRF / Localhost / Private IP space
      if (this.isPrivateOrLocalAddress(hostname)) {
        return false;
      }

      // Exact host or host:port match
      return this.networkAllowlist.has(hostname) || this.networkAllowlist.has(hostWithPort);
    } catch {
      return false;
    }
  }

  /**
   * Asserts network access is allowed, throwing an isolated security error if denied
   */
  public assertNetworkAllowed(urlStr: string): void {
    if (!this.isNetworkAllowed(urlStr)) {
      throw new Error(`SECURITY_VIOLATION: Access to destination '${urlStr}' is denied by capability policy${INTERNAL_SECURITY_CANARY}`);
    }
  }

  /**
   * Safe fetch broker that enforces capability policy
   */
  public async safeFetch(urlStr: string, init?: RequestInit): Promise<{ status: number; text: () => Promise<string>; json: () => Promise<any> }> {
    this.assertNetworkAllowed(urlStr);
    const res = await fetch(urlStr, init);
    return {
      status: res.status,
      text: () => res.text(),
      json: () => res.json()
    };
  }

  /**
   * Private IPv4/IPv6 & localhost filter to prevent SSRF vulnerabilities
   * Detects standard, octal, hex, and integer IP notations
   */
  private isPrivateOrLocalAddress(host: string): boolean {
    const lower = host.toLowerCase();

    if (
      lower === 'localhost' ||
      lower === '127.0.0.1' ||
      lower === '::1' ||
      lower === '0.0.0.0' ||
      lower.endsWith('.localhost') ||
      lower.endsWith('.local')
    ) {
      return true;
    }

    // Detect numeric integer IP (e.g. 2130706433 = 127.0.0.1)
    if (/^\d+$/.test(lower)) {
      const num = parseInt(lower, 10);
      if (num >= 0 && num <= 0xffffffff) {
        const b0 = (num >>> 24) & 0xff;
        if (b0 === 127 || b0 === 10 || b0 === 0) return true;
      }
    }

    // Detect hexadecimal IP (e.g. 0x7f000001)
    if (/^0x[0-9a-f]+$/i.test(lower)) {
      const num = parseInt(lower, 16);
      if (num >= 0 && num <= 0xffffffff) {
        const b0 = (num >>> 24) & 0xff;
        if (b0 === 127 || b0 === 10 || b0 === 0) return true;
      }
    }

    // Check standard or octal IPv4 parts (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const ipv4Parts = lower.split('.').map((p) => {
      if (p.startsWith('0') && p.length > 1) return parseInt(p, 8); // octal notation
      return Number(p);
    });

    if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      const [b0, b1] = ipv4Parts;
      if (b0 === 127) return true; // Loopback
      if (b0 === 10) return true;  // Private Class A
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // Private Class B
      if (b0 === 192 && b1 === 168) return true; // Private Class C
      if (b0 === 169 && b1 === 254) return true; // AWS/GCP/Azure link-local metadata
      if (b0 === 0) return true;   // Current network
    }

    return false;
  }
}
