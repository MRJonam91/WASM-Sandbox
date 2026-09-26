# WASM-Sandbox 🛡️⚡

**Micro-Isolated WebAssembly Environments for Safe Untrusted Code Execution**

[English](README.md) | [Italiano](README.it.md)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Dual Licensed](https://img.shields.io/badge/Dual--Licensed-Commercial%20Available-green.svg)](COMMERCIAL.md)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%99%A5%20MRJonam91-ea4aaa.svg)](https://github.com/sponsors/MRJonam91)
[![Ko-Fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b.svg)](https://ko-fi.com/mrjonam)
[![BuyMeACoffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-yellow.svg)](https://buymeacoffee.com/mrjonam)
[![PayPal](https://img.shields.io/badge/PayPal-Donate-00457C.svg)](https://paypal.me/manorollo)

---

## 🎬 5-Second Interactive Demo

![WASM-Sandbox Demo](assets/demo.svg)

---

## 💡 Why WASM-Sandbox?

Running untrusted user code (Python, JavaScript, Lua) is a critical requirement for modern **AI Agents**, **Plugin Marketplaces**, and **Multi-Tenant SaaS platforms**. 

Traditional isolation via Docker containers or micro-VMs imposes:
- 🐌 **Heavy Cold Starts**: 500ms–2000ms spin-up latency per container.
- 💾 **Bloated Memory Overhead**: 150MB–500MB RAM per instance.
- ⚙️ **Complex Orchestration**: Impossible to run efficiently at edge or directly inside browser client sessions.

**WASM-Sandbox** solves this with WebAssembly micro-isolates:
- ⚡ **Cold Start in `< 0.5ms`** with `< 4MB` baseline RAM.
- 🛑 **Deterministic CPU / Fuel Metering**: Terminate infinite loops and runaway computations without relying on asynchronous OS thread timers.
- 🔒 **Linear Memory Hard Bounds**: Zero possibility of host memory buffer overflow or process memory leaks.
- 🛡️ **Zero-Trust Network & Storage**: Virtual in-memory ephemeral filesystem (VFS) and anti-SSRF capability broker (blocking metadata endpoints like `169.254.169.254` and private networks by default).

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Host["Host Application (Node.js / Go / Browser)"]
        UntrustedSnippet["Untrusted Code\n(Python / JS / Lua)"] --> PolicyManager["Sandbox Policy Manager\n(Max Memory, Fuel Limit, Allowlist)"]
        PolicyManager --> WASMHost["WASM Host Binding\n(V8 / Wasmtime / Wazero)"]
    end

    subgraph MicroSandbox["WASM Isolated Boundary (Linear Memory)"]
        WASMHost --> EngineShim["Guest Engine Runtime\n(QuickJS / MicroPython / Lua 5.4)"]
        EngineShim --> FuelMeter["Deterministic Fuel Meter"]
        FuelMeter --> InMemVFS["Ephemeral In-Memory VFS"]
        FuelMeter --> CapabilityBroker["Capability Broker (Anti-SSRF & I/O)"]
    end

    CapabilityBroker -.->|"DENIED by default"| HostNetwork["Host Network"]
    MicroSandbox -->|"Deterministic Result / OutOfFuel Trap"| Host
```

---

## 📦 Easy-to-Extend Modular Core (<1,500 LOC)

The core abstraction layer (`@wasm-sandbox/core`) is strictly maintained **under 1,500 lines of clean, strictly-typed TypeScript** to allow anyone to comprehend the entire isolation model and build a new custom engine or host adapter in less than an hour:

```
packages/
├── core/                  # Clean core (< 500 LOC): types, policy, in-memory VFS, broker
├── engine-quickjs/        # JavaScript (QuickJS WASM) engine with fuel hook
├── engine-python/         # Python (MicroPython / WASI) engine
├── engine-lua/            # Lua 5.4 VM engine
├── runtime-node/          # Node.js host adapter (V8 WASM / Worker thread isolation)
├── runtime-go/            # Pure Go host adapter (Wazero, zero CGO)
└── runtime-browser/       # Web Worker client adapter
```

---

## 🚀 Quickstart Examples (v0.3.0-beta)

### 1️⃣ JavaScript in WebAssembly (QuickJS)
```typescript
import { WasmSandbox } from '@wasm-sandbox/core';

const sandbox = await WasmSandbox.create({
  fuelLimit: 50_000,
  maxMemoryBytes: 16 * 1024 * 1024
});

const result = await sandbox.execute(`
  fs.writeFile('/notes/user.txt', 'Safe data from JS');
  const readBack = fs.readTextFile('/notes/user.txt');
  ({ status: 'ok', file: readBack, sum: [10, 20, 30].reduce((a, b) => a + b, 0) });
`);
console.log(result.value); // => { status: 'ok', file: 'Safe data from JS', sum: 60 }
```

### 2️⃣ Lua 5.4 in WebAssembly
```typescript
import { LuaSandbox } from '@wasm-sandbox/core';

const luaSandbox = await LuaSandbox.create();
const luaResult = await luaSandbox.execute(`
  fs.writeFile('/notes/lua.txt', 'Safe data from Lua 5.4')
  local data = fs.readTextFile('/notes/lua.txt')
  print("Lua output:", data)
  return 10 * 4 + 2
`);
console.log(luaResult.value); // => 42
```

### 3️⃣ High-Throughput Sandbox Pool
```typescript
import { SandboxPool } from '@wasm-sandbox/core';

// Zero cold-start latency pool for backend SaaS & AI agents
const pool = new SandboxPool({ fuelLimit: 50_000 }, { minSize: 5 });
await pool.prewarm();

const output = await pool.withSandbox(async (sb) => {
  const r = await sb.execute('20 + 22;');
  return r.value;
});
console.log(output); // => 42 in < 0.2ms!
```

### 💻 CLI Usage

```bash
# Evaluate JavaScript in WebAssembly
npx wasm-sandbox eval "console.log('Hello JS WASM'); 2 + 2;"

# Evaluate Lua 5.4 in WebAssembly
npx wasm-sandbox eval "print('Hello Lua WASM'); return 10 * 4 + 2;" --lang lua

# Infinite loop safely trapped by fuel limit
npx wasm-sandbox eval "let i=0; while(true) i++;" --fuel 50000

# Execute untrusted script file
npx wasm-sandbox run untrusted.lua --lang lua
```



---

## 💖 Sponsorship & Donations

WASM-Sandbox is actively maintained. If you or your company rely on lightweight code execution and sandbox security:
- **GitHub Sponsors**: [github.com/sponsors/MRJonam91](https://github.com/sponsors/MRJonam91)
- **Ko-fi**: [ko-fi.com/mrjonam](https://ko-fi.com/mrjonam)
- **Buy Me A Coffee**: [buymeacoffee.com/mrjonam](https://buymeacoffee.com/mrjonam)
- **PayPal**: [paypal.me/manorollo](https://paypal.me/manorollo)

---

## ⚖️ Dual-Licensing & Commercial Acquisition

WASM-Sandbox is available under a **Dual-Licensing Model**:
1. **Open-Source (GNU AGPLv3)**: Free for open-source projects compliant with the AGPL-3.0 network copyleft requirements.
2. **Commercial & Enterprise License**: Available for proprietary, closed-source SaaS applications, AI agent systems, or OEM embedding without copyleft obligations.
3. **Project Buyout / Acquisition**: Full transfer of intellectual property, copyright, and global exploitation rights is open for acquisition inquiries.

For commercial licensing and project acquisition inquiries, please see [COMMERCIAL.md](COMMERCIAL.md) or contact **Manoj Rollo (@MRJonam91)** at [fbxmano@gmail.com](mailto:fbxmano@gmail.com).
