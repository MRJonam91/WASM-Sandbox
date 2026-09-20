# WASM-Sandbox Technical Architecture

[English](ARCHITECTURE.md) | [Italiano](ARCHITECTURE.it.md)

---

## 1. Design Principles

1. **Zero-Trust Guest**: All guest code executed inside the sandbox is treated as untrusted, hostile, or prone to resource exhaustion and memory leaks.
2. **Deterministic Metering (Fuel/Gas)**: Terminating unbounded execution does not rely on asynchronous host CPU timers or watchdog threads; instead, it is driven by exact instruction tick counts.
3. **Capability-Based I/O**: Guests start with zero permissions. Any access to system clocks, storage, or external networks is brokered by host proxies.
4. **Multi-Host Portability**: The FFI protocol between host and guest is agnostic to the host language runtime (Node.js, Go, or Browser WebAssembly).

---

## 2. System Layers

```
+-------------------------------------------------------------+
|                     Host Application                        |
|        (API Server, AI Agent Runner, SaaS Platform)         |
+-------------------------------------------------------------+
                              |
                     [ Sandbox Client API ]
                              |
+-------------------------------------------------------------+
|                   Core Isolation Layer                      |
|  - Policy Manager (Memory, CPU/Fuel, Timeout, Capabilities) |
|  - Virtual Filesystem (In-Memory Ephemeral VFS)             |
|  - Capability Security Broker (Anti-SSRF, I/O Interceptor)  |
+-------------------------------------------------------------+
                              |
                  [ WASM Host Runtime Binding ]
        (Node: Node WASM/Wasmtime | Go: Wazero | Web: Browser)
                              |
+-------------------------------------------------------------+
|                 Guest Engine (Compiled to WASM)             |
|       +---------------------------------------------+       |
|       |  QuickJS (JS)  | MicroPython |  Lua 5.4 VM  |       |
|       +---------------------------------------------+       |
|       |       Guest Shim & Memory Serialization     |       |
|       +---------------------------------------------+       |
|       |           WASI Virtual Layer (Stub)         |       |
+-------------------------------------------------------------+
```

---

## 3. Core Components

### 3.1 Policy Manager
The `PolicyManager` configures boundaries prior to instantiating the WebAssembly module:
- **`maxMemoryBytes`**: Upper bound for WebAssembly linear memory pages (`maximum` limit).
- **`fuelLimit`**: Maximum instruction fuel ticks before triggering `OUT_OF_FUEL` trap.
- **`timeoutMs`**: Wall-clock timeout fallback for unyielding host calls.
- **`capabilities`**: Granular resource permissions (network allowlist, storage modes).

### 3.2 Fuel Metering (Deterministic CPU)
Two execution modes:
1. **Host-level Fuel (e.g. Wasmtime / Wazero)**: Native engine instruction decrementing per basic block.
2. **Bytecode Interrupt Handlers (e.g. V8 / Browser WebAssembly)**: In-engine cooperation hooks (`JS_SetInterruptHandler` for QuickJS, debug instruction hook for Lua, periodic tick check in MicroPython).

### 3.3 Ephemeral Virtual Filesystem (VFS)
- The guest cannot see or traverse host operating system directories.
- In-memory VFS nodes are ephemeral and isolated per session.
