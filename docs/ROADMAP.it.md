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

### Fase 1: Core Library & Versione Alpha v0.2.0-alpha (Completata)
- [x] Runner concreto `WasmSandbox` basato su motore WebAssembly QuickJS.
- [x] Fuel / Gas Metering Deterministico (interrompe loop infiniti al singolo opcode).
- [x] Quote rigide di memoria lineare (intercetta memory bomb e crash in sicurezza).
- [x] Filesystem virtuale effimero in memoria (VFS) con `readTextFile`, `writeFile`, `listDir`, `removeFile`, `stat`.
- [x] Capability Broker anti-SSRF avanzato (neutralizza notazioni ottali, esadecimali, intere e IP di metadati cloud).
- [x] Modalità Sessione Persistente (`sessionMode: 'persistent'` per REPL ed esecuzioni sequenziali agentiche).
- [x] Random deterministico e clock a grana grossa (mitigazione side-channel timing attack).
- [x] Test suite automatizzata completa (14/14 test superati al 100%).
- [x] Suite di benchmark che dimostra **0.185ms warm execution** (~5.395 ops/sec) e **0.66ms cold start** ([BENCHMARKS.it.md](BENCHMARKS.it.md)).
- [x] Strumento CLI eseguibile (`bin/wasm-sandbox.mjs`).

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
