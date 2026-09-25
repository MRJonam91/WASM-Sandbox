import { getQuickJS, QuickJSWASMModule, QuickJSRuntime, QuickJSContext } from 'quickjs-emscripten';
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

  // Persistent session support
  private persistentRuntime: QuickJSRuntime | null = null;
  private persistentVm: QuickJSContext | null = null;
  private stdoutBuffer: string[] = [];
  private stderrBuffer: string[] = [];

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

    if (sandbox.policy.sessionMode === 'persistent') {
      sandbox.initPersistentSession();
    }

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
   * Configure host-injected security, VFS, and standard library bindings
   */
  private setupContextBindings(vm: QuickJSContext, stdoutArr: string[], stderrArr: string[]): void {
    // 1. Console Interceptors
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

    // 2. Safe In-Memory VFS
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

    const listDirFn = vm.newFunction('listDir', (pathHandle) => {
      const dirPath = pathHandle ? String(vm.dump(pathHandle)) : '/';
      const items = this.vfs.listDir(dirPath);
      const arr = vm.newArray();
      items.forEach((item, idx) => {
        const str = vm.newString(item);
        vm.setProp(arr, idx, str);
        str.dispose();
      });
      return arr;
    });
    vm.setProp(fsObj, 'listDir', listDirFn);
    listDirFn.dispose();

    const removeFileFn = vm.newFunction('removeFile', (pathHandle) => {
      if (this.policy.capabilities.filesystem.readOnly) {
        throw new Error(`SECURITY_VIOLATION: Filesystem is read-only${INTERNAL_SECURITY_CANARY}`);
      }
      const filePath = String(vm.dump(pathHandle));
      return this.vfs.removeFile(filePath) ? vm.true : vm.false;
    });
    vm.setProp(fsObj, 'removeFile', removeFileFn);
    removeFileFn.dispose();

    const statFn = vm.newFunction('stat', (pathHandle) => {
      const filePath = String(vm.dump(pathHandle));
      const s = this.vfs.stat(filePath);
      if (!s) return vm.null;
      const res = vm.newObject();
      const typeStr = vm.newString(s.type);
      vm.setProp(res, 'type', typeStr);
      typeStr.dispose();
      vm.setProp(res, 'size', vm.newNumber(s.size));
      vm.setProp(res, 'updatedAt', vm.newNumber(s.updatedAt));
      return res;
    });
    vm.setProp(fsObj, 'stat', statFn);
    statFn.dispose();

    vm.setProp(vm.global, 'fs', fsObj);
    fsObj.dispose();

    // 3. Network Capability Broker
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

    // 4. Deterministic Randomness (Linear Congruential Generator / Mulberry32)
    if (this.policy.capabilities.randomness.deterministic) {
      const seed = this.policy.capabilities.randomness.seed;
      vm.evalCode(`
        (function() {
          let s = ${seed};
          Math.random = function() {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        })();
      `);
    }

    // 5. Deterministic Time / Coarse Clock
    if (this.policy.capabilities.clock.deterministic) {
      const epoch = this.policy.capabilities.clock.epochMs;
      vm.evalCode(`
        (function() {
          let tick = ${epoch};
          Date.now = function() {
            tick += 5;
            return tick;
          };
        })();
      `);
    }
  }

  private initPersistentSession(): void {
    if (this.persistentVm) {
      this.persistentVm.dispose();
      this.persistentRuntime?.dispose();
    }
    this.persistentRuntime = this.qjs.newRuntime();
    this.persistentRuntime.setMemoryLimit(this.policy.maxMemoryBytes);
    this.persistentVm = this.persistentRuntime.newContext();
    this.stdoutBuffer = [];
    this.stderrBuffer = [];
    this.setupContextBindings(this.persistentVm, this.stdoutBuffer, this.stderrBuffer);
  }

  /**
   * Execute untrusted code inside the isolated WebAssembly boundary
   */
  public async execute(code: string, input?: TInput): Promise<ExecutionResult<TOutput>> {
    const isPersistent = this.policy.sessionMode === 'persistent';
    const startTime = Date.now();
    const stdoutArr: string[] = isPersistent ? [] : [];
    const stderrArr: string[] = isPersistent ? [] : [];

    const runtime = isPersistent && this.persistentRuntime ? this.persistentRuntime : this.qjs.newRuntime();
    const vm = isPersistent && this.persistentVm ? this.persistentVm : runtime.newContext();

    if (!isPersistent) {
      runtime.setMemoryLimit(this.policy.maxMemoryBytes);
      this.setupContextBindings(vm, stdoutArr, stderrArr);
    } else {
      // Re-route stdout/stderr for this specific run
      this.setupContextBindings(vm, stdoutArr, stderrArr);
    }

    // Deterministic fuel metering + wall clock watchdog
    const initialFuel = this.policy.fuelLimit;
    const timeoutMs = this.policy.timeoutMs;
    let remainingFuel = initialFuel;
    let outOfFuelTriggered = false;
    let timeoutTriggered = false;

    runtime.setInterruptHandler(() => {
      if (Date.now() - startTime >= timeoutMs) {
        timeoutTriggered = true;
        return true;
      }
      remainingFuel--;
      if (remainingFuel <= 0) {
        outOfFuelTriggered = true;
        return true;
      }
      return false;
    });

    try {
      // Inject input if provided
      if (input !== undefined) {
        const parsedInput = vm.evalCode(`JSON.parse(${JSON.stringify(JSON.stringify(input))})`);
        if ('value' in parsedInput) {
          vm.setProp(vm.global, '__input', parsedInput.value);
          parsedInput.value.dispose();
        } else {
          parsedInput.error.dispose();
        }
      }

      // Execute code inside WebAssembly sandbox
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

        if (timeoutTriggered) {
          errorType = 'TIMEOUT';
        } else if (outOfFuelTriggered || errMsg.includes('interrupted')) {
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
      if (!isPersistent) {
        vm.dispose();
        runtime.dispose();
      }
    }
  }

  public async reset(): Promise<void> {
    this.vfs = new InMemoryVFS(this.policy.capabilities.filesystem.initialFiles);
    if (this.policy.sessionMode === 'persistent') {
      this.initPersistentSession();
    }
  }

  public async dispose(): Promise<void> {
    if (this.persistentVm) {
      this.persistentVm.dispose();
      this.persistentVm = null;
    }
    if (this.persistentRuntime) {
      this.persistentRuntime.dispose();
      this.persistentRuntime = null;
    }
  }
}
