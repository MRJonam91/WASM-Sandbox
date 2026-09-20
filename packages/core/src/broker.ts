/**
 * Capability Security Broker
 * Enforces zero-trust boundary rules for I/O and network requests
 */
export class CapabilityBroker {
  private networkAllowlist: Set<string>;

  constructor(allowlist: string[] = []) {
    this.networkAllowlist = new Set(allowlist.map((host) => host.toLowerCase()));
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
   * Private IPv4/IPv6 & localhost filter to prevent SSRF vulnerabilities
   */
  private isPrivateOrLocalAddress(host: string): boolean {
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local')
    ) {
      return true;
    }

    // Check IPv4 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 cloud metadata)
    const ipv4Parts = host.split('.').map(Number);
    if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      const [b0, b1] = ipv4Parts;
      if (b0 === 10) return true;
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
      if (b0 === 192 && b1 === 168) return true;
      if (b0 === 169 && b1 === 254) return true; // AWS/GCP/Azure link-local metadata
    }

    return false;
  }
}
