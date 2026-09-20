# Linee Guida per i Contributi

Grazie per l'interesse a contribuire a **WASM-Sandbox**!

## Linee Guida di Sviluppo
- **Architettura Modulare**: Mantieni la separazione netta tra il core agnostico e gli engine/runtime specifici.
- **Sicurezza Prima di Tutto**: Ogni nuova funzionalità deve essere valutata rispetto al [Threat Model](docs/THREAT_MODEL.md).
- **Test Obbligatori**: Ogni modifica o aggiunta deve includere test unitari e test di regressione (inclusi casi limite con loop infiniti ed esaurimento memoria).
- **TypeScript Strict**: Codice TypeScript tipizzato rigorosamente (`strict: true`).

## Flusso di Lavoro Git
1. Crea un branch feature/fix dal branch `main`: `git checkout -b feature/nome-feature`.
2. Esegui i test e verifica che il codice compili senza errori.
3. Apri una Pull Request descrivendo chiaramente modifiche, test effettuati e motivazioni.
