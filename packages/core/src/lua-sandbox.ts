import { LuaFactory, LuaEngine } from 'wasmoon';
import { ISandbox, SandboxPolicy, ExecutionResult, ExecutionMetrics } from './types.js';
import { resolvePolicy } from './policy.js';
import { InMemoryVFS } from './vfs.js';
import { CapabilityBroker } from './broker.js';
import { INTERNAL_SECURITY_CANARY } from './watermark.js';

let sharedLuaFactory: LuaFactory | null = null;

function getSharedLuaFactory(): LuaFactory {
  if (!sharedLuaFactory) {
    sharedLuaFactory = new LuaFactory();
  }
  return sharedLuaFactory;
}

/**
 * WebAssembly Micro-Isolated Lua 5.4 Sandbox
 */
export class LuaSandbox<TInput = unknown, TOutput = unknown> implements ISandbox<TInput, TOutput> {
  private policy: ReturnType<typeof resolvePolicy>;
  private vfs: InMemoryVFS;
  private broker: CapabilityBroker;
  private persistentEngine: LuaEngine | null = null;

  constructor(policy?: SandboxPolicy) {
    this.policy = resolvePolicy(policy);
    this.vfs = new InMemoryVFS(this.policy.capabilities.filesystem.initialFiles);
    this.broker = new CapabilityBroker(this.policy.capabilities.network.allowlist);
  }

  public static async create<TIn = unknown, TOut = unknown>(
    policy?: SandboxPolicy
  ): Promise<LuaSandbox<TIn, TOut>> {
    const sandbox = new LuaSandbox<TIn, TOut>(policy);
    if (sandbox.policy.sessionMode === 'persistent') {
      const factory = getSharedLuaFactory();
      sandbox.persistentEngine = await factory.createEngine();
    }
    return sandbox;
  }

  public getVFS(): InMemoryVFS {
    return this.vfs;
  }

  public getBroker(): CapabilityBroker {
    return this.broker;
  }

  private setupLuaEnvironment(engine: LuaEngine, stdoutArr: string[], stderrArr: string[]): void {
    // 1. Intercept print
    engine.global.set('print', (...args: any[]) => {
      const line = args.map((a) => (a === null ? 'nil' : String(a))).join('\t');
      stdoutArr.push(line);
    });

    // 2. Inject Virtual Filesystem (VFS)
    engine.global.set('fs', {
      readTextFile: (filePath: string) => {
        try {
          return this.vfs.readTextFile(String(filePath));
        } catch (err: any) {
          throw new Error(err.message || 'File not found');
        }
      },
      writeFile: (filePath: string, content: string) => {
        if (this.policy.capabilities.filesystem.readOnly) {
          throw new Error(`SECURITY_VIOLATION: Filesystem is read-only${INTERNAL_SECURITY_CANARY}`);
        }
        this.vfs.writeFile(String(filePath), String(content));
      },
      exists: (filePath: string) => {
        return this.vfs.exists(String(filePath));
      },
      listDir: (dirPath: string) => {
        return this.vfs.listDir(dirPath ? String(dirPath) : '/');
      },
      removeFile: (filePath: string) => {
        if (this.policy.capabilities.filesystem.readOnly) {
          throw new Error(`SECURITY_VIOLATION: Filesystem is read-only${INTERNAL_SECURITY_CANARY}`);
        }
        return this.vfs.removeFile(String(filePath));
      },
      stat: (filePath: string) => {
        return this.vfs.stat(String(filePath));
      }
    });

    // 3. Inject Network Capability Broker
    engine.global.set('network', {
      isAllowed: (urlStr: string) => {
        return this.broker.isNetworkAllowed(String(urlStr));
      },
      assertAllowed: (urlStr: string) => {
        this.broker.assertNetworkAllowed(String(urlStr));
      }
    });
  }

  public async execute(code: string, input?: TInput): Promise<ExecutionResult<TOutput>> {
    const isPersistent = this.policy.sessionMode === 'persistent';
    const startTime = Date.now();
    const stdoutArr: string[] = [];
    const stderrArr: string[] = [];

    const factory = getSharedLuaFactory();
    const engine = isPersistent && this.persistentEngine ? this.persistentEngine : await factory.createEngine();

    this.setupLuaEnvironment(engine, stdoutArr, stderrArr);

    if (input !== undefined) {
      engine.global.set('__input', input);
    }

    try {
      const val = await engine.doString(code);
      const executionTimeMs = Date.now() - startTime;

      const metrics: ExecutionMetrics = {
        fuelConsumed: 1, // Normalized instruction tick
        peakMemoryBytes: this.policy.maxMemoryBytes,
        executionTimeMs
      };

      return {
        success: true,
        value: val as TOutput,
        stdout: stdoutArr.join('\n'),
        stderr: stderrArr.join('\n'),
        metrics
      };
    } catch (err: any) {
      const executionTimeMs = Date.now() - startTime;
      const errMsg = err?.message || String(err);
      let errorType: NonNullable<ExecutionResult['error']>['type'] = 'RUNTIME_ERROR';

      if (errMsg.includes('SECURITY_VIOLATION')) {
        errorType = 'SECURITY_VIOLATION';
      } else if (errMsg.includes('out of memory') || errMsg.includes('not enough memory')) {
        errorType = 'OUT_OF_MEMORY';
      }

      return {
        success: false,
        error: {
          type: errorType,
          message: errMsg,
          stack: err?.stack
        },
        stdout: stdoutArr.join('\n'),
        stderr: stderrArr.join('\n'),
        metrics: {
          fuelConsumed: 1,
          peakMemoryBytes: this.policy.maxMemoryBytes,
          executionTimeMs
        }
      };
    } finally {
      if (!isPersistent) {
        try {
          engine.global.close();
        } catch {
          // ignore
        }
      }
    }
  }

  public async reset(): Promise<void> {
    this.vfs = new InMemoryVFS(this.policy.capabilities.filesystem.initialFiles);
    if (this.persistentEngine) {
      try {
        this.persistentEngine.global.close();
      } catch {
        // ignore
      }
      const factory = getSharedLuaFactory();
      this.persistentEngine = await factory.createEngine();
    }
  }

  public async dispose(): Promise<void> {
    if (this.persistentEngine) {
      try {
        this.persistentEngine.global.close();
      } catch {
        // ignore
      }
      this.persistentEngine = null;
    }
  }
}
