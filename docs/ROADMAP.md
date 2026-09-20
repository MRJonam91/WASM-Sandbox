# Roadmap di Sviluppo: WASM-Sandbox

## 🗺️ Fasi e Milestone

### Fase 0: Fondazioni e Specifiche (Corrente)
- [x] Inizializzazione repository, licenza Apache-2.0 e configurazione monorepo.
- [x] Definizione architettura generale ([ARCHITECTURE.md](ARCHITECTURE.md)) e Threat Model ([THREAT_MODEL.md](THREAT_MODEL.md)).
- [ ] Specifica dettagliata del protocollo Host-Guest FFI (Buffer encoding, error codes, traps).
- [ ] Creazione pipeline CI/CD di base (Linting, TypeScript compilation, Type checking).

### Fase 1: Core Library & Host Abstraction (`@wasm-sandbox/core`)
- [ ] Interfaccia comune `Sandbox<TInput, TOutput>`.
- [ ] Policy definitions: `SandboxOptions` (`memoryLimitBytes`, `fuelLimit`, `timeoutMs`, `capabilities`).
- [ ] Implementazione Virtual In-Memory Filesystem (VFS) POSIX-compatible minimale.
- [ ] Capability Broker (Network allowlist & URL validation con prevenzione SSRF).

### Fase 2: Engine Guest Compilati in WASM
- [ ] **Engine JavaScript**: Compilazione ed integrazione di **QuickJS** in WASM con supporto a fuel/interrupt handler.
- [ ] **Engine Lua**: Compilazione di **Lua 5.4** con custom memory allocator e debug instruction hook per metering.
- [ ] **Engine Python**: Integrazione di **MicroPython** o build minimale WASI di CPython con memoria vincolata.

### Fase 3: Runtime Adapters
- [ ] **Node.js Runtime (`@wasm-sandbox/runtime-node`)**:
  - Implementazione basata sul motore nativo V8 WASM e supporto a worker threads per isolamento termico.
  - Test di compatibilità con versioni Node.js LTS (v20, v22, v24).
- [ ] **Go Runtime (`wasm-sandbox-go`)**:
  - Implementazione basata su **Wazero** (pure Go WebAssembly runtime, zero CGO).
  - Binding API idiomartico Go (`sandbox.New()`, `sandbox.Execute()`).
- [ ] **Browser Runtime (`@wasm-sandbox/runtime-browser`)**:
  - Adapter per esecuzione WebWorker pura senza dipendenze Node.

### Fase 4: Hardening, Benchmarking & Bug Bounty Readiness
- [ ] Suite di test contro vettori DoS noti (loop infiniti, allocazioni esagerate, regex catastrofiche, ricorsione profonda).
- [ ] Fuzzing del layer FFI e del deserializzatore dati.
- [ ] Benchmark comparativi: cold start vs warm start vs Docker vs isolate V8 puro.
- [ ] Pubblicazione npm e Go package index.
