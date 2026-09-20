# Architettura Tecnica di WASM-Sandbox

## 1. Principi di Progettazione

1. **Zero-Trust Guest**: Tutto il codice eseguito nella sandbox è considerato ostile, non fidato o suscettibile di crash/memory leak.
2. **Deterministic Metering (Fuel/Gas)**: La terminazione di un'esecuzione infinita non deve dipendere da thread watcher asincroni o timer della CPU dell'host, bensì dal conteggio deterministico delle istruzioni bytecode eseguite.
3. **Capability-Based I/O**: Il guest parte con permessi zero. Qualsiasi risorsa esterna (orologio, storage, canali di comunicazione, fetch HTTP) viene fornita esplicitamente tramite proxy controllati dall'host.
4. **Multi-Host Portability**: Il protocollo di comunicazione sandbox <-> host deve essere indipendente dalla tecnologia del runtime host (Node.js, Go o Browser).

---

## 2. Strati del Sistema

```
+-------------------------------------------------------------+
|                     Applicazione Host                       |
|         (API Server, AI Agent Runner, SaaS Platform)        |
+-------------------------------------------------------------+
                              |
                     [ Sandbox Client API ]
                              |
+-------------------------------------------------------------+
|                   Core Isolation Engine                     |
|  - Policy Manager (Memoria, CPU/Fuel, Timeout, Permessi)    |
|  - Virtual Filesystem (In-Memory Ephemeral VFS)             |
|  - Capability Security Broker (IO & RPC interceptor)        |
+-------------------------------------------------------------+
                              |
                  [ WASM Host Runtime Binding ]
        (Node: Node WASM/Wasmtime | Go: Wazero | Web: Browser)
                              |
+-------------------------------------------------------------+
|                 Guest Engine (Compilato in WASM)            |
|       +---------------------------------------------+       |
|       |  QuickJS (JS)  | MicroPython |  Lua 5.4 VM  |       |
|       +---------------------------------------------+       |
|       |       Guest Shim & Memory Serialization     |       |
|       +---------------------------------------------+       |
|       |           WASI Virtual Layer (Stub)         |       |
+-------------------------------------------------------------+
```

---

## 3. Componenti Dettagliati

### 3.1 Policy Manager
Il `PolicyManager` definisce i vincoli di esecuzione prima dell'istanziazione del modulo WASM:
- **`maxMemoryBytes`**: Limite di pagine di memoria lineare WASM allocabili (`WebAssembly.Memory` con `maximum` prefissato).
- **`fuelLimit`**: Quantità massima di ticks/istruzioni WASM consumabili prima di sollevare `OutOfFuelException`.
- **`wallClockTimeoutMs`**: Limite di tempo assoluto a salvaguardia di stalli non legati a computazione pura (es. chiamate host bloccanti).
- **`capabilities`**: Mappa dei permessi (es. `net: { allow: ["api.example.com:443"] }`, `fs: { readOnly: ["/libs"] }`).

### 3.2 Fuel Metering (Controllo CPU Deterministic)
Due approcci supportati:
1. **Host-level Fuel (es. Wasmtime / Wazero)**: Supporto nativo al decremento di un contatore carburante per ogni blocco base di istruzioni.
2. **Bytecode Instrumentation / Loop Injections (es. V8 / Browser)**: Iniezione all'interno del guest engine di check periodici del contatore istruzioni/interruzioni cooperative (`JS_SetInterruptHandler` per QuickJS, hook in Lua, `mp_handle_pending` per MicroPython).

### 3.3 Virtual Filesystem (VFS)
- Il guest non vede alcun path reale del sistema operativo host.
- I path virtuali (es. `/tmp`, `/app`, `/data`) sono mappati in una struttura dati in memoria effimera creata per-sessione o per-chiamata.
- Possibilità di snapshot: ripristino istantaneo dello stato di partenza al termine dell'esecuzione.

### 3.4 Serializzazione Dati e FFI Host-Guest
Il passaggio di argomenti e il recupero del risultato dell'esecuzione avvengono attraverso:
1. Allocazione di un buffer condiviso nella memoria lineare del guest.
2. Scrittura del payload codificato (JSON / MessagePack / CBOR).
3. Invocazione della funzione esportata `run_script(ptr, len) -> ptr_res`.
4. Lettura del risultato dalla memoria e liberazione del buffer guest.
5. In caso di errore o OOM/OOF, la memoria lineare viene invalidata e ricreata per garantire assenza di residui di stato.
