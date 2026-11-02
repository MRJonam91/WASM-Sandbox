# CI verification / Verifica CI

EN: On 2026-11-02 the current default branch passed `npm ci --ignore-scripts` followed by `npm test` on Windows / Node 24.14.0: 21 tests passed. The root `pretest` already builds `packages/core/dist` before the test imports it. The historical September 26 CI failure ran before that output was available; it is not evidence that the current tree still fails locally.

The workflow now supports manual dispatch and requires its install/test scripts without `--if-present`. `npm test` retains the existing build through `pretest`. Remote Node 22 execution is separate evidence and must be read from the run for the published commit. These tests are not an independent security audit or a guarantee for arbitrary untrusted code.

IT: Il 2 novembre 2026 il branch corrente ha superato `npm ci --ignore-scripts` e `npm test` su Windows / Node 24.14.0: 21 test passati. Il `pretest` alla radice compilava già `packages/core/dist` prima dell'import nei test. L'errore CI storico del 26 settembre riguarda l'assenza di quell'output, non prova che il codice attuale fallisca ancora localmente.

La CI permette ora il dispatch manuale e richiede installazione/test senza `--if-present`. `npm test` conserva la compilazione tramite `pretest`. La prova remota su Node 22 va letta nel run relativo al commit pubblicato. I test non costituiscono un audit indipendente né una garanzia per codice arbitrario non fidato.
