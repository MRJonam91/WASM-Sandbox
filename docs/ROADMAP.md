# Development Roadmap: WASM-Sandbox

[English](ROADMAP.md) | [Italiano](ROADMAP.it.md)

---

## 🗺️ Phases & Milestones

### Phase 0: Foundations & Specifications (Current)
- [x] Monorepo initialization, AGPL-3.0 / Dual-License setup, and FUNDING.yml.
- [x] Architecture ([ARCHITECTURE.md](ARCHITECTURE.md)) and Threat Model ([THREAT_MODEL.md](THREAT_MODEL.md)).
- [x] Animated interactive visual demo ([assets/demo.svg](../assets/demo.svg)).
- [x] Bilingual documentation in English and Italian.
- [x] Core abstraction layer under 500 lines of code (`@wasm-sandbox/core`).
- [x] Stealth mathematical & steganographic canary watermarking for IP verification.

### Phase 1: Core Library & Host Abstraction (`@wasm-sandbox/core`)
- [x] Common `ISandbox` interface & `ExecutionResult` types.
- [x] `SandboxPolicy` resolver with secure zero-trust defaults.
- [x] Ephemeral In-Memory Virtual Filesystem (VFS) with path hashing.
- [x] Capability Broker (anti-SSRF and network allowlist enforcement).
- [x] Unit test suite passing on Node.js test runner.

### Phase 2: Guest Engines in WASM
- [ ] **JavaScript Engine**: QuickJS compilation to WASM with interrupt metering hook.
- [ ] **Lua Engine**: Lua 5.4 compilation with custom memory allocator and debug instruction hook.
- [ ] **Python Engine**: MicroPython WASM / minimal WASI build with rigid memory caps.

### Phase 3: Multi-Host Adapters
- [ ] **Node.js (`@wasm-sandbox/runtime-node`)**: V8 WASM runtime with optional Worker Thread affinity.
- [ ] **Go (`wasm-sandbox-go`)**: Pure Go Wazero adapter (zero CGO).
- [ ] **Browser (`@wasm-sandbox/runtime-browser`)**: Web Worker client runtime.

### Phase 4: Hardening, Benchmarks & Commercial Readiness
- [ ] Fuzzing and DoS test matrix (infinite loops, memory bombs, recursion).
- [ ] Performance benchmarks: Cold vs Warm start, Docker vs WASM-Sandbox.
- [ ] Commercial enterprise distribution & acquisition packaging.
