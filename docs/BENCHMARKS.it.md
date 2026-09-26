# Benchmark Prestazionali: WASM-Sandbox (v0.3.0-beta)

[English](BENCHMARKS.md) | [Italiano](BENCHMARKS.it.md)

---

## ⚡ Risultati dei Test Validati

*Ambiente di Test: x86_64, Node.js v24.14.0.*

| Metrica | Container Docker | micro-VM (Firecracker) | **WASM-Sandbox (v0.3.0-beta)** | Vantaggio / Velocità |
| :--- | :--- | :--- | :--- | :--- |
| **Cold Start JS (QuickJS WASM)** | ~650ms – 2.000ms | ~120ms – 250ms | **0.64ms (Min) / 1.69ms (Media)** | **Da 300x a 1.000x più veloce** |
| **Cold Start Lua (Lua 5.4 WASM)**| ~650ms – 2.000ms | ~120ms – 250ms | **1.49ms (Media)** | **Da 400x a 1.000x più veloce** |
| **Warm Execution (Persistente)** | ~25ms – 50ms | ~5ms – 10ms | **0.187ms (~5.336 ops/sec)** | **Da 130x a 270x più veloce** |
| **Throughput Pool Pre-Warmed** | ~50ms | ~10ms | **0.557ms per richiesta** | **90x più veloce** |
| **Footprint Memoria RAM Base** | ~150MB – 450MB | ~35MB – 100MB | **~3.4MB RAM** | **Da 40x a 130x più leggero** |
| **Difesa da Loop Infinito (DoS)**| Quote CPU OS (soft) | Throttling cgroups | **Fuel Deterministico + Watchdog** | **Arresto al singolo opcode** |
| **Isolamento Filesystem** | Overlay root / Chroot | Dispositivo a blocchi | **VFS Effimero in RAM** | **Zero contaminazione disco host** |
| **Difesa da SSRF e Rete** | iptables | TAP firewalls | **Capability Broker (filtro ottale/hex/int)** | **Zero-Trust a livello applicativo** |

---

## 🔬 Come Riprodurre i Benchmark

```bash
npm run bench
```
