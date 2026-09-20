# Security Policy

## Reporting a Vulnerability

La sicurezza delle sandbox e l'isolamento dell'ambiente host sono l'obiettivo fondamentale di **WASM-Sandbox**.
Se scopri una vulnerabilità di sicurezza (in particolare: sandbox escape, bypass del fuel limit/DoS, memory leak dell'host o accesso non autorizzato al filesystem/rete), ti chiediamo di segnalarla responsabilmente.

### Procedura di Segnalazione
1. **Non aprire una issue pubblica su GitHub.**
2. Invia i dettagli via GitHub Security Advisory su questo repository oppure contatta il maintainer tramite il profilo GitHub [@MRJonam91](https://github.com/MRJonam91).
3. Includi:
   - Descrizione del bypass o della vulnerabilità.
   - Proof of Concept (PoC) o snippet di codice minimo per riprodurre il problema.
   - Piattaforma e runtime di riproduzione (es. Node.js v24, Browser, Go Wazero).
   - Impatto stimato.

### Tempi di Risposta
Ci impegniamo a rispondere e validare ogni segnalazione entro 48 ore dalla ricezione e a rilasciare una patch correttiva prima della divulgazione pubblica.
