# STOARCGEN-002: Engine File Renames — beat-*.ts to milestone-*.ts

**Status**: REJECTED
**Superseded by**: STOARCGEN-001

## Reason

This ticket assumed the repository could absorb a staged rename where engine file renames happened after a separate models-only foundation pass.

That assumption proved false. The `beat` vocabulary was cross-layer and tightly coupled across models, engine, LLM contracts, persistence, UI, and tests. Executing file renames in isolation would have kept the tree in an artificially split state and encouraged temporary aliasing.

## Outcome

- Date: 2026-03-14
- Actual resolution: engine file renames were completed inside the atomic end-to-end migration implemented under STOARCGEN-001.
- Files renamed as part of that migration:
  - `src/engine/beat-utils.ts` -> `src/engine/milestone-utils.ts`
  - `src/engine/beat-conclusion.ts` -> `src/engine/milestone-conclusion.ts`
  - `src/engine/beat-alignment.ts` -> `src/engine/milestone-alignment.ts`
- Verification lived with STOARCGEN-001, not as a separate intermediate checkpoint.
