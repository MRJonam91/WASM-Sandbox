/**
 * Capabilities security configuration
 */
export interface SandboxCapabilities {
  /** Network access control: by default, all network calls are denied */
  network?: {
    allowlist?: string[]; // e.g. ["api.github.com:443"]
  };
  /** Virtual filesystem configuration */
  filesystem?: {
    readOnly?: boolean;
    initialFiles?: Record<string, string | Uint8Array>;
  };
  /** System time access control */
  clock?: {
    deterministic?: boolean; // If true, clock returns fixed or incrementing ticks rather than real time
    epochMs?: number;
  };
  /** Pseudo-random generator control (mitigates entropy exhaustion & timing attacks) */
  randomness?: {
    deterministic?: boolean;
    seed?: number;
  };
}

/**
 * Resource limits and execution constraints for the sandbox
 */
export interface SandboxPolicy {
  /** Target execution language: 'javascript' (QuickJS WASM) or 'lua' (Lua 5.4 WASM) (default: 'javascript') */
  language?: 'javascript' | 'lua';
  /** Session mode: 'ephemeral' (clean isolated environment per call) or 'persistent' (state preserved between calls) */
  sessionMode?: 'ephemeral' | 'persistent';
  /** Maximum linear memory allowed in bytes (default: 64MB) */
  maxMemoryBytes?: number;
  /** Maximum execution fuel / instructions before trapping (default: 10_000_000) */
  fuelLimit?: number;
  /** Wall clock timeout in milliseconds as a safety fallback (default: 5000ms) */
  timeoutMs?: number;
  /** Fine-grained capabilities */
  capabilities?: SandboxCapabilities;
}

/**
 * Execution metrics collected during a sandbox run
 */
export interface ExecutionMetrics {
  /** Instructions / fuel consumed */
  fuelConsumed: number;
  /** Peak memory used in bytes */
  peakMemoryBytes: number;
  /** Execution wall clock time in milliseconds */
  executionTimeMs: number;
}

/**
 * Result of a sandbox execution
 */
export interface ExecutionResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: {
    type: 'OUT_OF_FUEL' | 'OUT_OF_MEMORY' | 'TIMEOUT' | 'SECURITY_VIOLATION' | 'RUNTIME_ERROR';
    message: string;
    stack?: string;
  };
  stdout?: string;
  stderr?: string;
  metrics: ExecutionMetrics;
}

/**
 * Generic sandbox runner interface
 */
export interface ISandbox<TInput = unknown, TOutput = unknown> {
  /**
   * Execute code or precompiled module in the sandbox
   */
  execute(code: string, input?: TInput): Promise<ExecutionResult<TOutput>>;

  /**
   * Reset sandbox memory and state
   */
  reset(): Promise<void>;

  /**
   * Dispose and release all allocated WASM resources
   */
  dispose(): Promise<void>;
}
