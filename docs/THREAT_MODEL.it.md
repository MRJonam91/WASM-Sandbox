# Threat Model & Sicurezza di WASM-Sandbox

[English](THREAT_MODEL.md) | [Italiano](THREAT_MODEL.it.md)

---

## 1. Obiettivi di Sicurezza
- **Confidenzialità Host**: Il guest non deve in alcun modo poter leggere variabili d'ambiente, memoria di processo, chiavi crittografiche o file dell'host.
- **Integrità Host**: Il guest non può modificare file di sistema, eseguire comandi della shell (fork/exec) o alterare lo stato del runtime host.
- **Disponibilità (DoS Prevention)**: Loop infiniti (`while(true){}`), fork bomb logiche o allocazioni compulsive di memoria non devono bloccare né consumare la CPU/RAM dell'host oltre la quota impostata.
- **Isolamento Multi-Tenant**: Esecuzioni di utenti diversi non devono condividere memoria o residui di stato tra esecuzioni distinte.

---

## 2. Vettori di Rischio e Mitigazioni

| Vettore di Attacco | Rischio | Mitigazione WASM-Sandbox |
| :--- | :--- | :--- |
| **CPU Starvation (Infinite Loop)** | L'host satura un core della CPU bloccando il thread. | **Fuel Metering** decrementale + hard timeout di fallback. Al raggiungimento di zero carburante il guest trap-interrompe. |
| **Memory Exhaustion (OOM Bomb)** | Il guest tenta di allocare gigabyte di memoria fino al crash del processo host. | **Rigid Linear Memory Bound**: `maximum` limit sulle pagine WASM (es. max 64MB). Allocazioni oltre il limite falliscono con OOM isolato. |
| **Filesystem Traversal (`../../etc/passwd`)** | Il guest cerca di navigare l'albero delle directory dell'host. | **No Host FS Access**: Nessuna syscall WASI reale esposta. VFS puramente in RAM con mapping virtuale esplicito. |
| **Network Exfiltration / SSRF** | Il codice invia richieste verso `localhost`, metadati cloud (`169.254.169.254`) o server C2. | **Deny-by-default**: I socket TCP/UDP sono disabilitati. Eventuale fetch HTTP è mediato da un broker host con allowlist rigida di domini e blocco CIDR privati. |
| **Side-Channel Timing Attacks (Spectre/Meltdown)** | Misurazione precisa del tempo per dedurre dati da cache. | Orologio ad alta risoluzione (`performance.now()`) mascherato con jitter e arrotondamento (coarse-grained clock). |
| **State Pollution tra chiamate** | Una variabile globale o prototype injection persiste tra esecuzioni successive. | **Ephemeral Instances**: Ogni esecuzione riparte da uno snapshot pulito della memoria o da un'istanza WASM deallocata al termine. |
