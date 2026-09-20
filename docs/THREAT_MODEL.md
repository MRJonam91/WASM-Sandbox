# Threat Model & Security Posture of WASM-Sandbox

[English](THREAT_MODEL.md) | [Italiano](THREAT_MODEL.it.md)

---

## 1. Security Objectives
- **Host Confidentiality**: The guest environment cannot inspect host environment variables, process memory, cryptographic keys, or host filesystem resources.
- **Host Integrity**: The guest cannot invoke OS shell commands, fork processes, or mutate host application state.
- **Availability (DoS Prevention)**: Infinite loops (`while(true){}`), recursive bombs, or malicious regexes must not exhaust host CPU or linear memory beyond prescribed quotas.
- **Multi-Tenant Isolation**: Independent sessions never share linear memory pages or mutable state.

---

## 2. Attack Vectors & Mitigations

| Attack Vector | Risk | WASM-Sandbox Mitigation |
| :--- | :--- | :--- |
| **CPU Starvation (Infinite Loop)** | Satures host CPU core, blocking the thread. | **Deterministic Fuel Metering**: Decrementing instruction counter. When fuel reaches 0, execution traps immediately. |
| **Memory Exhaustion (OOM Bomb)** | Attempts to allocate gigabytes until host crashes. | **Rigid Linear Memory Bound**: WebAssembly page boundary (`maximum` limit). Allocations beyond the limit fail with isolated OOM. |
| **Filesystem Traversal (`../../etc/passwd`)** | Attempts to traverse host directories. | **No Host FS Access**: No direct WASI syscalls exposed. Ephemeral in-memory VFS with strict path normalization. |
| **Network Exfiltration / SSRF** | Guest attempts contacting localhost, cloud metadata (`169.254.169.254`), or C2 servers. | **Deny-by-default**: Sockets disabled. Proxy broker with domain allowlist and private IP filtering. |
| **Cross-Tenant State Pollution** | Globals or prototype modifications persist across runs. | **Ephemeral Instances**: Each run operates on fresh or reset WASM instances. |
