# Roadmap di Sviluppo: WASM-Sandbox

[English](ROADMAP.md) | [Italiano](ROADMAP.it.md)

---

## 🗺️ Fasi e Milestone

### Fase 0: Fondazioni e Specifiche (Completata)
- [x] Inizializzazione repository, licenza AGPL-3.0 / Dual-License e configurazione FUNDING.yml.
- [x] Definizione architettura generale ([ARCHITECTURE.it.md](ARCHITECTURE.it.md)) e Threat Model ([THREAT_MODEL.it.md](THREAT_MODEL.it.md)).
- [x] Demo visuale animata ([assets/demo.svg](../assets/demo.svg)).
- [x] Documentazione bilingue completa in Italiano e Inglese.
- [x] Core layer mantenuto sotto 500 righe di codice (`@wasm-sandbox/core`).
- [x] Watermarking steganografico e matematico (canary token per prova di proprietà intellettuale).

### Fase 1: Core Library & Host Abstraction (`@wasm-sandbox/core`)
- [x] Interfaccia comune `ISandbox` e tipi `ExecutionResult`.
- [x] Risolutore `SandboxPolicy` con impostazioni predefinite sicure zero-trust.
- [x] Filesystem virtuale effimero in memoria (VFS) con path fingerprinting.
- [x] Capability Broker (anti-SSRF e allowlist di rete).
- [x] Suite di unit test nativa superata con successo (`node --test`).

### Fase 2: Engine Guest Compilati in WASM
- [ ] **Engine JavaScript**: Integrazione di QuickJS compilato in WASM con hook di interruzione per conteggio istruzioni.
- [ ] **Engine Lua**: Compilazione di Lua 5.4 con allocator di memoria limitato e debug hook.
- [ ] **Engine Python**: Integrazione di MicroPython WASM / WASI minimale con quota memoria rigida.

### Fase 3: Runtime Adapters
- [ ] **Node.js (`@wasm-sandbox/runtime-node`)**: Runtime V8 WASM con isolamento opzionale su Worker Thread.
- [ ] **Go (`wasm-sandbox-go`)**: Adapter per Go basato su Wazero (100% puro Go, zero CGO).
- [ ] **Browser (`@wasm-sandbox/runtime-browser`)**: Adapter client Web Worker.

### Fase 4: Hardening, Benchmarking & Pronto per Vendita Commerciale
- [ ] Suite di test contro DoS (loop infiniti, memory bombs, ricorsione).
- [ ] Benchmark prestazionali: cold start vs warm start vs Docker vs isolati V8.
- [ ] Packaging e canali per licenze commerciali e acquisizione d'impresa.
