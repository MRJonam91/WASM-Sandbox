# Roadmap di Sviluppo: WASM-Sandbox

[English](ROADMAP.md) | [Italiano](ROADMAP.it.md)

---

## 🗺️ Fasi e Milestone

### Fase 0: Fondazioni e Architettura (Completata ✅)
- [x] Inizializzazione monorepo, impostazione licenza AGPL-3.0 / Dual-License e FUNDING.yml.
- [x] Architettura Tecnica ([ARCHITECTURE.it.md](ARCHITECTURE.it.md)) e Threat Model ([THREAT_MODEL.it.md](THREAT_MODEL.it.md)).
- [x] Demo visuale animata interattiva ([assets/demo.svg](../assets/demo.svg)).
- [x] Documentazione bilingue completa in Italiano e Inglese.
- [x] Codice del layer core mantenuto sotto 1.500 righe di codice (`@wasm-sandbox/core`).
- [x] Token interni di integrità e protezione da alterazioni del codice.

### Fase 1: Libreria Core & Primitive di Sicurezza (Completata ✅)
- [x] Runner concreto `WasmSandbox` con motore WebAssembly QuickJS.
- [x] Fuel / Gas Metering deterministico (arresto dei loop infiniti a livello di bytecode).
- [x] Quote rigide di memoria lineare (intercetta memory bomb senza crash dell'host).
- [x] Filesystem virtuale effimero in memoria (VFS) con `readTextFile`, `writeFile`, `listDir`, `removeFile`, `stat`.
- [x] Capability Broker anti-SSRF avanzato (neutralizza notazioni ottali, esadecimali, intere e IP di metadati cloud).
- [x] Modalità Sessione Persistente (`sessionMode: 'persistent'` per REPL ed esecuzioni sequenziali agentiche).
- [x] Random deterministico e clock a grana grossa (mitigazione side-channel timing attack).

### Fase 2: Supporto Multi-Linguaggio (Completata ✅)
- [x] **Engine JavaScript (QuickJS WASM)**: Sandbox JS completa con misurazione istruzioni e cattura console.
- [x] **Engine Lua 5.4 VM (WebAssembly)**: Micro-ambienti Lua 5.4 nativi (`LuaSandbox`) con cattura print e integrazione VFS/broker.
- [x] Esecuzione CLI multi-linguaggio (`npx wasm-sandbox eval "..." --lang lua`).

### Fase 3: Pooling ad Alto Throughput & Performance (Completata ✅)
- [x] `SandboxPool` pre-riscaldato con throughput inferiore a **0.55ms** per workload SaaS ad alto volume.
- [x] Riciclo e reset automatico dello stato tra le esecuzioni.
- [x] Suite di benchmark prestazionali completa (`npm run bench` / [BENCHMARKS.it.md](BENCHMARKS.it.md)).

### Fase 4: Hardening di Produzione (Versione v1.0.0 ✅)
- [x] Mitigazione ReDoS contro backtracking catastrofico delle regex.
- [x] Stress test di concorrenza (istanze sandbox parallele).
- [x] Suite di test automatizzati completa (18/18 test superati al 100%).
- [x] Strumento CLI pronto per la produzione (`bin/wasm-sandbox.mjs`).
- [x] Modello di Doppia Licenza (AGPLv3 / Commerciale) e predisposizione al Buyout ([COMMERCIAL.md](../COMMERCIAL.md)).

---

### 🔮 Obiettivi Post v1.0
- [ ] **Engine Python**: Integrazione MicroPython WASM / minimal WASI.
- [ ] **Adapter Host per Go**: Binding Wazero in puro Go (`wasm-sandbox-go`).
- [ ] **Bundle Browser Standalone**: Pacchetto WebWorker pronto per CDN.
