# Development Roadmap: WASM-Sandbox

[English](ROADMAP.md) | [Italiano](ROADMAP.it.md)

---

## 🗺️ Phases & Milestones

### Phase 0: Foundations & Architecture (Completed ✅)
- [x] Monorepo initialization, AGPL-3.0 / Dual-License setup, and FUNDING.yml.
- [x] Technical Architecture ([ARCHITECTURE.md](ARCHITECTURE.md)) and Threat Model ([THREAT_MODEL.md](THREAT_MODEL.md)).
- [x] Animated interactive visual demo ([assets/demo.svg](../assets/demo.svg)).
- [x] Bilingual documentation in English and Italian.
- [x] Core abstraction layer maintained strictly under 1,500 lines of code (`@wasm-sandbox/core`).
- [x] Internal integrity verification tokens and telemetry protections.

### Phase 1: Core Library & Security Primitives (Completed ✅)
- [x] Concrete `WasmSandbox` runner with QuickJS WebAssembly engine.
- [x] Deterministic Fuel / Gas Metering (halts infinite loops at bytecode instruction level).
- [x] Linear memory quotas (intercepts memory bombs safely without host crashes).
- [x] Ephemeral In-Memory Virtual Filesystem (VFS) with `readTextFile`, `writeFile`, `listDir`, `removeFile`, `stat`.
- [x] Capability Broker with Anti-SSRF (detects and neutralizes standard, octal, hex, and integer loopback & cloud metadata IP notations).
- [x] Stateful Persistent Session Mode (`sessionMode: 'persistent'` for REPL / conversational code execution).
- [x] Deterministic PRNG and coarse clock controls (mitigates entropy exhaustion & side-channel timing attacks).

### Phase 2: Multi-Language Guest Support (Completed ✅)
- [x] **JavaScript Engine (QuickJS WASM)**: Complete JS sandbox with instruction counting and console interception.
- [x] **Lua 5.4 VM Engine (WebAssembly)**: Native Lua 5.4 micro-isolates (`LuaSandbox`) with print interception and full VFS/broker integration.
- [x] Multi-language CLI execution (`npx wasm-sandbox eval "..." --lang lua`).

### Phase 3: High-Throughput Pooling & Performance (Completed ✅)
- [x] Pre-warmed `SandboxPool` providing **< 0.55ms throughput** for high-volume backend SaaS workloads.
- [x] Automatic sandbox state reset and recycling.
- [x] Comprehensive performance benchmark suite (`npm run bench` / [BENCHMARKS.md](BENCHMARKS.md)).

### Phase 4: Production Hardening (v1.0.0 Release ✅)
- [x] ReDoS mitigation for catastrophic regular expression backtracking.
- [x] Concurrency stress testing (parallel concurrent sandbox executions).
- [x] Complete automated test suite (18/18 tests passing with 100% success).
- [x] Production CLI executable (`bin/wasm-sandbox.mjs`).
- [x] Dual-Licensing (AGPLv3 / Commercial) and Enterprise Buyout readiness ([COMMERCIAL.md](../COMMERCIAL.md)).

---

### 🔮 Post v1.0 Horizon
- [ ] **Python Engine**: MicroPython WASM / minimal WASI integration.
- [ ] **Go Host Adapter**: Pure Go Wazero bindings (`wasm-sandbox-go`).
- [ ] **Browser WebWorker Bundle**: Zero-dependency standalone browser CDN package.
