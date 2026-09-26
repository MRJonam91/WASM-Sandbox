import { WasmSandbox } from './sandbox.js';
import { SandboxPolicy } from './types.js';

export interface PoolOptions {
  minSize?: number;
  maxSize?: number;
}

/**
 * Pre-Warmed Sandbox Recycling Pool
 * Eliminates cold-start latency for high-concurrency SaaS workloads
 */
export class SandboxPool {
  private pool: WasmSandbox[] = [];
  private policy?: SandboxPolicy;
  private minSize: number;
  private maxSize: number;

  constructor(policy?: SandboxPolicy, options: PoolOptions = {}) {
    this.policy = policy;
    this.minSize = options.minSize ?? 2;
    this.maxSize = options.maxSize ?? 10;
  }

  /**
   * Initialize pool with pre-warmed sandboxes
   */
  public async prewarm(): Promise<void> {
    while (this.pool.length < this.minSize) {
      const sandbox = await WasmSandbox.create(this.policy);
      this.pool.push(sandbox);
    }
  }

  /**
   * Acquire a pre-warmed sandbox from the pool or create a fresh one
   */
  public async acquire(): Promise<WasmSandbox> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return await WasmSandbox.create(this.policy);
  }

  /**
   * Return a used sandbox to the pool after state reset
   */
  public async release(sandbox: WasmSandbox): Promise<void> {
    if (this.pool.length < this.maxSize) {
      await sandbox.reset();
      this.pool.push(sandbox);
    } else {
      await sandbox.dispose();
    }
  }

  /**
   * Run a task within an automatically recycled sandbox
   */
  public async withSandbox<T>(fn: (sandbox: WasmSandbox) => Promise<T>): Promise<T> {
    const sandbox = await this.acquire();
    try {
      return await fn(sandbox);
    } finally {
      await this.release(sandbox);
    }
  }

  /**
   * Drain and dispose all sandboxes in pool
   */
  public async drain(): Promise<void> {
    while (this.pool.length > 0) {
      const sandbox = this.pool.pop()!;
      await sandbox.dispose();
    }
  }

  public get available(): number {
    return this.pool.length;
  }
}
