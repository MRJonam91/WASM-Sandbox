# Performance Benchmarks: WASM-Sandbox (v0.3.0-beta)

[English](BENCHMARKS.md) | [Italiano](BENCHMARKS.it.md)

---

## ⚡ Verified Benchmark Results

*Environment: x86_64, Node.js v24.14.0.*

| Metric | Docker Container | Firecracker micro-VM | **WASM-Sandbox (v0.3.0-beta)** | Advantage / Speedup |
| :--- | :--- | :--- | :--- | :--- |
| **JS Cold Start (QuickJS WASM)** | ~650ms – 2,000ms | ~120ms – 250ms | **0.64ms (Min) / 1.69ms (Avg)** | **300x – 1,000x Faster** |
| **Lua Cold Start (Lua 5.4 WASM)**| ~650ms – 2,000ms | ~120ms – 250ms | **1.49ms (Avg)** | **400x – 1,000x Faster** |
| **Warm Execution (Persistent)** | ~25ms – 50ms | ~5ms – 10ms | **0.187ms (~5,336 ops/sec)** | **130x – 270x Faster** |
| **Pre-Warmed Pool Throughput** | ~50ms | ~10ms | **0.557ms per request** | **90x Faster** |
| **Base Memory Footprint** | ~150MB – 450MB | ~35MB – 100MB | **~3.4MB RAM** | **40x – 130x Lighter** |
| **CPU Starvation (DoS)** | OS CPU Quotas (soft) | cgroups throttling | **Deterministic Fuel + Watchdog** | **Instruction-level Halt** |
| **Filesystem Isolation** | Root overlay / Chroot | Block device | **Ephemeral In-Memory VFS (RAM)** | **Zero Host FS Contamination** |
| **SSRF / Network Defense** | iptables | TAP firewalls | **Capability Broker (Octal/Hex/Int filter)** | **Application-layer Zero-Trust** |

---

## 🔬 Reproducing Benchmarks

```bash
npm run bench
```
