# Benchmark Prestazionali: WASM-Sandbox (v0.2.0-alpha)

[English](BENCHMARKS.md) | [Italiano](BENCHMARKS.it.md)

---

## ⚡ Risultati dei Test Validati

*Ambiente di Test: x86_64, Windows/Linux, Node.js v24.14.0.*

| Metrica | Container Docker | micro-VM (Firecracker) | **WASM-Sandbox (v0.2.0-alpha)** | Vantaggio / Velocità |
| :--- | :--- | :--- | :--- | :--- |
| **Latenza Cold Start** | ~650ms – 2.000ms | ~120ms – 250ms | **0.66ms (Min) / 1.74ms (Media)** | **Da 300x a 1.000x più veloce** |
| **Latenza Warm Execution** | ~25ms – 50ms | ~5ms – 10ms | **0.185ms** (~5.395 ops/sec) | **Da 130x a 270x più veloce** |
| **Footprint Memoria RAM Base** | ~150MB – 450MB | ~35MB – 100MB | **~3.4MB RAM** | **Da 40x a 130x più leggero** |
| **Difesa da Loop Infinito (DoS)** | Quote CPU OS (soft) | cgroups / throttling vCPU | **Fuel Metering Deterministico** | **Arresto al singolo opcode** |
| **Isolamento Filesystem** | Overlay root / Chroot | Dispositivo a blocchi virt. | **VFS Effimero in RAM** | **Zero contaminazione disco host** |
| **Difesa da SSRF e Rete** | iptables / Network namespace | TAP device / firewall | **Capability Broker (filtro ottale/hex/int)** | **Zero-Trust a livello applicativo** |

---

## 🔬 Come Riprodurre i Benchmark

Esegui la suite di test prestazionali in locale:
```bash
node benchmarks/run-benchmarks.mjs
```
