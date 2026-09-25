import { getQuickJS, QuickJSWASMModule } from 'quickjs-emscripten';
import { ISandbox, SandboxPolicy, ExecutionResult, ExecutionMetrics } from './types.js';
import { resolvePolicy } from './policy.js';
import { InMemoryVFS } from './vfs.js';
import { CapabilityBroker } from './broker.js';
import { INTERNAL_SECURITY_CANARY } from './watermark.js';

let quickJsModulePromise: Promise<QuickJSWASMModule> | null = null;

function getSharedQuickJS(): Promise<QuickJSWASMModule> {
  if (!quickJsModulePromise) {
    quickJsModulePromise = getQuickJS();
  }
  return quickJsModulePromise;
}

/**
 * Concrete WebAssembly Micro-Isolated Sandbox
 */
export class WasmSandbox<TInput = unknown, TOutput = unknown> implements ISandbox<TInput, TOutput> {
  private policy: ReturnType<typeof resolvePolicy>;
  private vfs: InMemoryVFS;
  private broker: CapabilityBroker;
  private qjs!: QuickJSWASMModule;

  private constructor(policy?: SandboxPolicy) {
    this.policy = resolvePolicy(policy);
    this.vfs = new InMemoryVFS(this.policy.capabilities.filesystem.initialFiles);
    this.broker = new CapabilityBroker(this.policy.capabilities.network.allowlist);
  }

  /**
   * Factory to initialize an isolated WASM sandbox instance
   */
  public static async create<TIn = unknown, TOut = unknown>(
    policy?: SandboxPolicy
  ): Promise<WasmSandbox<TIn, TOut>> {
    const sandbox = new WasmSandbox<TIn, TOut>(policy);
    sandbox.qjs = await getSharedQuickJS();
    return sandbox;
  }

  /**
   * Access the isolated In-Memory Virtual Filesystem
   */
  public getVFS(): InMemoryVFS {
    return this.vfs;
  }

  /**
   * Access the Capability Security Broker
   */
  public getBroker(): CapabilityBroker {
    return this.broker;
  }

  /**
   * Execute untrusted code inside the isolated WebAssembly boundary
   */
  public async execute(code: string, input?: TInput): Promise<ExecutionResult<TOutput>> {
    const startTime = Date.now();
    const stdoutArr: string[] = [];
    const stderrArr: string[] = [];

    const runtime = this.qjs.newRuntime();
    const vm = runtime.newContext();

    // 1. Enforce memory limit
    runtime.setMemoryLimit(this.policy.maxMemoryBytes);

    // 2. Setup deterministic fuel metering
    const initialFuel = this.policy.fuelLimit;
    let remainingFuel = initialFuel;
    let outOfFuelTriggered = false;

    runtime.setInterruptHandler(() => {
      remainingFuel--;
      if (remainingFuel <= 0) {
        outOfFuelTriggered = true;
        return true; // Interrupt execution immediately
      }
      return false;
    });

    try {
      // 3. Inject console interceptors (isolated from host stdout/stderr)
      const consoleObj = vm.newObject();

      const logFn = vm.newFunction('log', (...args) => {
        const line = args.map((a) => String(vm.dump(a))).join(' ');
        stdoutArr.push(line);
      });
      vm.setProp(consoleObj, 'log', logFn);
      logFn.dispose();

      const errorFn = vm.newFunction('error', (...args) => {
        const line = args.map((a) => String(vm.dump(a))).join(' ');
        stderrArr.push(line);
      });
      vm.setProp(consoleObj, 'error', errorFn);
      errorFn.dispose();

      const warnFn = vm.newFunction('warn', (...args) => {
        const line = args.map((a) => String(vm.dump(a))).join(' ');
        stderrArr.push(line);
      });
      vm.setProp(consoleObj, 'warn', warnFn);
      warnFn.dispose();

      vm.setProp(vm.global, 'console', consoleObj);
      consoleObj.dispose();

      // 4. Inject safe Virtual Filesystem (VFS) bindings
      const fsObj = vm.newObject();

      const readFileFn = vm.newFunction('readTextFile', (pathHandle) => {
        const filePath = String(vm.dump(pathHandle));
        try {
          const content = this.vfs.readTextFile(filePath);
          return vm.newString(content);
        } catch (err: any) {
          throw new Error(err.message || 'File not found');
        }
      });
      vm.setProp(fsObj, 'readTextFile', readFileFn);
      readFileFn.dispose();

      const writeFileFn = vm.newFunction('writeFile', (pathHandle, contentHandle) => {
        if (this.policy.capabilities.filesystem.readOnly) {
          throw new Error(`SECURITY_VIOLATION: Filesystem is read-only${INTERNAL_SECURITY_CANARY}`);
        }
        const filePath = String(vm.dump(pathHandle));
        const content = String(vm.dump(contentHandle));
        this.vfs.writeFile(filePath, content);
      });
      vm.setProp(fsObj, 'writeFile', writeFileFn);
      writeFileFn.dispose();

      const existsFn = vm.newFunction('exists', (pathHandle) => {
        const filePath = String(vm.dump(pathHandle));
        return this.vfs.exists(filePath) ? vm.true : vm.false;
      });
      vm.setProp(fsObj, 'exists', existsFn);
      existsFn.dispose();

      vm.setProp(vm.global, 'fs', fsObj);
      fsObj.dispose();

      // 5. Inject safe network policy validator
      const netObj = vm.newObject();
      const checkNetFn = vm.newFunction('isAllowed', (urlHandle) => {
        const targetUrl = String(vm.dump(urlHandle));
        return this.broker.isNetworkAllowed(targetUrl) ? vm.true : vm.false;
      });
      vm.setProp(netObj, 'isAllowed', checkNetFn);
      checkNetFn.dispose();

      const assertNetFn = vm.newFunction('assertAllowed', (urlHandle) => {
        const targetUrl = String(vm.dump(urlHandle));
        this.broker.assertNetworkAllowed(targetUrl);
      });
      vm.setProp(netObj, 'assertAllowed', assertNetFn);
      assertNetFn.dispose();

      vm.setProp(vm.global, 'network', netObj);
      netObj.dispose();

      // 6. Inject input if provided
      if (input !== undefined) {
        const parsedInput = vm.evalCode(`JSON.parse(${JSON.stringify(JSON.stringify(input))})`);
        if ('value' in parsedInput) {
          vm.setProp(vm.global, '__input', parsedInput.value);
          parsedInput.value.dispose();
        } else {
          parsedInput.error.dispose();
        }
      }

      // 7. Execute code inside WebAssembly sandbox
      const callResult = vm.evalCode(code);
      const executionTimeMs = Date.now() - startTime;
      const fuelConsumed = Math.max(0, initialFuel - remainingFuel);

      const metrics: ExecutionMetrics = {
        fuelConsumed,
        peakMemoryBytes: this.policy.maxMemoryBytes,
        executionTimeMs
      };

      if ('error' in callResult && callResult.error) {
        const errObj = vm.dump(callResult.error);
        callResult.error.dispose();

        let errorType: NonNullable<ExecutionResult['error']>['type'] = 'RUNTIME_ERROR';
        const errMsg = String(errObj?.message || errObj || 'Unknown error');

        if (outOfFuelTriggered || errMsg.includes('interrupted')) {
          errorType = 'OUT_OF_FUEL';
        } else if (errMsg.includes('out of memory')) {
          errorType = 'OUT_OF_MEMORY';
        } else if (errMsg.includes('SECURITY_VIOLATION')) {
          errorType = 'SECURITY_VIOLATION';
        }

        return {
          success: false,
          error: {
            type: errorType,
            message: errMsg,
            stack: errObj?.stack
          },
          stdout: stdoutArr.join('\n'),
          stderr: stderrArr.join('\n'),
          metrics
        };
      }

      const val = vm.dump(callResult.value) as TOutput;
      callResult.value.dispose();

      return {
        success: true,
        value: val,
        stdout: stdoutArr.join('\n'),
        stderr: stderrArr.join('\n'),
        metrics
      };
    } catch (unexpectedError: any) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        error: {
          type: unexpectedError?.message?.includes('SECURITY_VIOLATION') ? 'SECURITY_VIOLATION' : 'RUNTIME_ERROR',
          message: unexpectedError?.message || String(unexpectedError)
        },
        stdout: stdoutArr.join('\n'),
        stderr: stderrArr.join('\n'),
        metrics: {
          fuelConsumed: initialFuel - remainingFuel,
          peakMemoryBytes: this.policy.maxMemoryBytes,
          executionTimeMs
        }
      };
    } finally {
      // 8. Safely dispose all WebAssembly allocations
      vm.dispose();
      runtime.dispose();
    }
  }

  public async reset(): Promise<void> {
    this.vfs = new InMemoryVFS(this.policy.capabilities.filesystem.initialFiles);
  }

  public async dispose(): Promise<void> {
    // Shared engine is cached, instance-level allocations are cleaned in execute
  }
}
