# Development Roadmap: WASM-Sandbox

[English](ROADMAP.md) | [Italiano](ROADMAP.it.md)

---

## 🗺️ Phases & Milestones

### Phase 0: Foundations & Specifications (Completed)
- [x] Monorepo initialization, AGPL-3.0 / Dual-License setup, and FUNDING.yml.
- [x] Architecture ([ARCHITECTURE.md](ARCHITECTURE.md)) and Threat Model ([THREAT_MODEL.md](THREAT_MODEL.md)).
- [x] Animated interactive visual demo ([assets/demo.svg](../assets/demo.svg)).
- [x] Bilingual documentation in English and Italian.
- [x] Core abstraction layer strictly under 1,500 lines of code (`@wasm-sandbox/core`).
- [x] Stealth mathematical & steganographic canary watermarking for IP verification.

### Phase 1: Core Library & Alpha Release v0.2.0-alpha (Completed)
- [x] Concrete `WasmSandbox` runner with QuickJS WebAssembly engine.
- [x] Deterministic Fuel / Gas Metering (halts infinite loops at instruction level).
- [x] Linear memory quotas (intercepts memory bombs safely).
- [x] Ephemeral In-Memory Virtual Filesystem (VFS) with `readTextFile`, `writeFile`, `listDir`, `removeFile`, `stat`.
- [x] Capability Broker with Anti-SSRF (detects and neutralizes standard, octal, hex, and integer loopback & cloud metadata IP notations).
- [x] Stateful Persistent Session Mode (`sessionMode: 'persistent'` for REPL / conversational code execution).
- [x] Deterministic PRNG and coarse clock controls (mitigates entropy exhaustion & side-channel timing attacks).
- [x] Full automated test suite (14/14 tests passing).
- [x] Benchmark suite demonstrating **0.185ms warm execution** (~5,395 ops/sec) and **0.66ms cold start** ([BENCHMARKS.md](BENCHMARKS.md)).
- [x] CLI Tool executable (`bin/wasm-sandbox.mjs`).


### Phase 2: Guest Engines in WASM & Beta Release v0.3.0-beta (Current)
- [x] **JavaScript Engine**: QuickJS WebAssembly integration with interrupt instruction metering.
- [x] **Lua 5.4 VM Engine**: WebAssembly Lua 5.4 integration with full In-Memory VFS, print capture, and anti-SSRF broker.
- [x] **High-Throughput SandboxPool**: Automatic recycling, zero cold-start pre-warming (< 0.55ms throughput).
- [x] **ReDoS Mitigation**: Catastrophic regex backtracking protection.
- [ ] **Python Engine**: MicroPython WASM / minimal WASI build with rigid memory caps.


### Phase 3: Multi-Host Adapters
- [ ] **Node.js (`@wasm-sandbox/runtime-node`)**: V8 WASM runtime with optional Worker Thread affinity.
- [ ] **Go (`wasm-sandbox-go`)**: Pure Go Wazero adapter (zero CGO).
- [ ] **Browser (`@wasm-sandbox/runtime-browser`)**: Web Worker client runtime.

### Phase 4: Hardening, Benchmarks & Commercial Readiness
- [ ] Fuzzing and DoS test matrix (infinite loops, memory bombs, recursion).
- [ ] Performance benchmarks: Cold vs Warm start, Docker vs WASM-Sandbox.
- [ ] Commercial enterprise distribution & acquisition packaging.
