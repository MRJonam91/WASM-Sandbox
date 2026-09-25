import { SandboxPolicy } from './types.js';

export const DEFAULT_SANDBOX_POLICY: Required<Omit<SandboxPolicy, 'capabilities'>> & {
  capabilities: Required<NonNullable<SandboxPolicy['capabilities']>>;
} = {
  sessionMode: 'ephemeral',
  maxMemoryBytes: 64 * 1024 * 1024, // 64 MB
  fuelLimit: 10_000_000,             // 10 million instructions
  timeoutMs: 5_000,                  // 5 seconds
  capabilities: {
    network: {
      allowlist: []
    },
    filesystem: {
      readOnly: false,
      initialFiles: {}
    },
    clock: {
      deterministic: true,
      epochMs: 1700000000000
    },
    randomness: {
      deterministic: true,
      seed: 123456789
    }
  }
};

/**
 * Validate and merge user-provided policy with secure defaults
 */
export function resolvePolicy(policy?: SandboxPolicy): typeof DEFAULT_SANDBOX_POLICY {
  return {
    sessionMode: policy?.sessionMode ?? DEFAULT_SANDBOX_POLICY.sessionMode,
    maxMemoryBytes: policy?.maxMemoryBytes ?? DEFAULT_SANDBOX_POLICY.maxMemoryBytes,
    fuelLimit: policy?.fuelLimit ?? DEFAULT_SANDBOX_POLICY.fuelLimit,
    timeoutMs: policy?.timeoutMs ?? DEFAULT_SANDBOX_POLICY.timeoutMs,
    capabilities: {
      network: {
        allowlist: policy?.capabilities?.network?.allowlist ?? [],
      },
      filesystem: {
        readOnly: policy?.capabilities?.filesystem?.readOnly ?? false,
        initialFiles: policy?.capabilities?.filesystem?.initialFiles ?? {}
      },
      clock: {
        deterministic: policy?.capabilities?.clock?.deterministic ?? true,
        epochMs: policy?.capabilities?.clock?.epochMs ?? DEFAULT_SANDBOX_POLICY.capabilities.clock.epochMs
      },
      randomness: {
        deterministic: policy?.capabilities?.randomness?.deterministic ?? true,
        seed: policy?.capabilities?.randomness?.seed ?? DEFAULT_SANDBOX_POLICY.capabilities.randomness.seed
      }
    }
  };
}
