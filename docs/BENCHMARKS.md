# Performance Benchmarks: WASM-Sandbox (v0.2.0-alpha)

[English](BENCHMARKS.md) | [Italiano](BENCHMARKS.it.md)

---

## ⚡ Verified Benchmark Results

*Hardware Environment: AMD/Intel x86_64, Windows/Linux, Node.js v24.14.0.*

| Metric | Docker Container | micro-VM (Firecracker) | **WASM-Sandbox (v0.2.0-alpha)** | Speedup / Advantage |
| :--- | :--- | :--- | :--- | :--- |
| **Cold Start Latency** | ~650ms – 2,000ms | ~120ms – 250ms | **0.66ms (Min) / 1.74ms (Avg)** | **300x – 1,000x Faster** |
| **Warm Execution Latency** | ~25ms – 50ms | ~5ms – 10ms | **0.185ms** (~5,395 ops/sec) | **130x – 270x Faster** |
| **Baseline Memory Footprint** | ~150MB – 450MB | ~35MB – 100MB | **~3.4MB RAM** | **40x – 130x Lighter** |
| **CPU Starvation Defense** | OS CPU Quotas (soft) | cgroups / vCPU throttling | **Deterministic Fuel Metering** | **Instruction-level Halt** |
| **Filesystem Isolation** | Root overlay / Chroot | Virtual block device | **Ephemeral In-Memory VFS (RAM)** | **Zero Host FS Contamination** |
| **SSRF / Network Defense** | iptables / Network namespaces | TAP devices / firewalls | **Capability Broker with Octal/Hex/Int filter** | **Application-layer Zero-Trust** |

---

## 🔬 Reproducing Benchmarks

Run the benchmark suite locally:
```bash
node benchmarks/run-benchmarks.mjs
```
