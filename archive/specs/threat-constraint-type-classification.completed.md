# Spec: ThreatType and ConstraintType Classification Enums

**Status**: COMPLETED
**Created**: 2026-02-13
**Last Updated**: 2026-02-13
**Scope**: Models, planner schema/types, reconciler, prompts, persistence, server/client rendering, tests

---

## Reassessed Assumptions (Corrected)

### What was correct

1. Active threats/constraints are currently untyped (`KeyedEntry` only), while threads are typed (`ThreadEntry` + enum metadata).
2. Planner schema currently emits `threats.add` / `constraints.add` as `string[]`, so the reconciler cannot enforce semantic class boundaries.
3. Prompt guidance already contains strong textual classification criteria for threats/constraints, but this is not represented in runtime types.

### What was incorrect or incomplete

1. **Backward compatibility assumption was incorrect for this ticket**.
   - Prior draft proposed deserialization fallback (`ENVIRONMENTAL`) for old files.
   - This conflicts with project direction for this ticket: **no backwards compatibility layer, no aliasing**.
   - Correct approach: strict typed data shape at read/write boundaries; broken historical data is fixed via explicit migration/update, not hidden fallback.

2. **String fallback for new additions was incorrect for target architecture**.
   - Prior draft allowed bare string additions and defaulted type.
   - Correct approach: `threatsAdded` and `constraintsAdded` become typed object arrays end-to-end (`{ text, threatType }`, `{ text, constraintType }`) with no string union at domain boundaries.

3. **Ownership boundaries were too blurry**.
   - Prior draft mixed normalization, ID assignment, and fallback policy across model and apply layers.
   - Correct approach:
     - `models/state/*`: domain contracts + enum guards
     - `engine/reconciler-*`: normalization and validation
     - `models/state/active-state-apply.ts`: deterministic ID assignment/application only

4. **Verification scope was too broad**.
   - “Run full npm test” is not the right hard-test target for this change set.
   - Correct approach: run targeted hard suites for touched modules + one broader integration pass.

---

## Architecture Assessment

### Why this change is better than the current architecture

1. Enforces semantic correctness at compile-time and schema-time, not only prompt-time.
2. Eliminates a known “prompt says classify, runtime stores plain text” contract gap.
3. Reduces misclassification drift by making threat/constraint class explicit and reviewable in reconciler, prompts, and UI.
4. Keeps the thread model pattern consistent across active-state domains (typed entry + enum + deterministic server IDs).

### Architecture caveat to track

`TextIntentMutations` is currently reused for semantically different state families. This was acceptable for plain text flows, but with typed adds it becomes a leaky abstraction. Threat/constraint intents should use dedicated typed mutations (not `TextIntentMutations`) to preserve clear contracts and extensibility.

---

## Final Scope (Updated)

1. Add `ThreatType` and `ConstraintType` enums, typed entry interfaces, and guards in `src/models/state/keyed-entry.ts`.
2. Update `ActiveState` and `ActiveStateChanges` to use typed threats/constraints and typed add payloads in `src/models/state/active-state.ts`.
3. Replace threat/constraint application path in `src/models/state/active-state-apply.ts` with typed application (no string add fallback).
4. Update planner contracts:
   - `src/llm/planner-types.ts`
   - `src/llm/schemas/page-planner-schema.ts`
5. Update reconciler contracts and normalization:
   - `src/engine/state-reconciler-types.ts`
   - `src/engine/state-reconciler.ts`
   - `src/engine/reconciler-text-utils.ts` (typed normalize helpers)
6. Update prompt surfaces to display and require types:
   - `src/llm/prompts/sections/planner/state-intent-rules.ts`
   - `src/llm/prompts/sections/continuation/continuation-quality-criteria.ts`
   - `src/llm/prompts/continuation/active-state-sections.ts`
   - `src/llm/prompts/sections/planner/continuation-context.ts`
   - `prompts/page-planner-prompt.md`
7. Update persistence shape strictly (no deserialization defaults):
   - `src/persistence/page-serializer-types.ts`
   - `src/persistence/converters/active-state-converter.ts`
8. Update server/client/UI rendering to show explicit threat/constraint type badges/icons:
   - `src/server/utils/view-helpers.ts`
   - `src/server/routes/play.ts`
   - `src/server/views/pages/play.ejs`
   - `public/js/src/*.js` (and regenerate `public/js/app.js`)
9. Update/strengthen tests covering typed shape, strict validation, and rendering semantics.

---

## Non-Goals

1. No urgency/severity dimension for threats/constraints in this ticket.
2. No additional state categories beyond the two enums.
3. No compatibility shim for old persisted page shapes.

---

## Implementation Notes

### Enum definitions

- `ThreatType`: `HOSTILE_AGENT | ENVIRONMENTAL | CREATURE`
- `ConstraintType`: `PHYSICAL | ENVIRONMENTAL | TEMPORAL`

### Data contracts after cutover

- Threat entries: `{ id, text, threatType }`
- Constraint entries: `{ id, text, constraintType }`
- Planner adds are typed objects, not strings.
- Reconciler result returns typed threat/constraint additions.

### Strictness policy

- Invalid enum values are rejected/normalized at reconciler boundary based on explicit rule implemented in code.
- Persistence converter requires typed fields; no silent fallback on missing type fields.

---

## Hard Test Plan (Updated)

Run at minimum:

1. `npm run typecheck`
2. `npm run test:unit -- test/unit/models/state`
3. `npm run test:unit -- test/unit/engine/state-reconciler.test.ts`
4. `npm run test:unit -- test/unit/llm/schemas/page-planner-schema.test.ts`
5. `npm run test:unit -- test/unit/llm/prompts`
6. `npm run test:unit -- test/unit/persistence/page-serializer.test.ts`
7. `npm run test:unit -- test/unit/server/routes/play.test.ts test/unit/server/views/play.test.ts test/unit/client/play-page/active-threats.test.ts test/unit/client/play-page/active-constraints.test.ts`
8. `npm run test:integration -- test/integration/engine/page-service.test.ts test/integration/server/play-flow.test.ts`

If any changed area is not covered by existing tests, add targeted tests before finalizing.

---

## Success Criteria

1. Planner schema and TS types require typed threat/constraint additions.
2. Reconciler outputs typed threat/constraint additions.
3. Active-state application and persistence store typed threats/constraints.
4. Prompt context and UI render threat/constraint class metadata.
5. Tests verify strict type behavior and rendering output for typed entries.

---

## Outcome

- **Completion Date**: 2026-02-13
- **What changed (implemented)**:
  - Added `ThreatType` / `ConstraintType` enums and typed threat/constraint entries in state models.
  - Migrated active-state deltas from string adds to typed add objects for threats/constraints.
  - Upgraded planner schema/types/validation/transformer to require typed threat/constraint add payloads.
  - Updated reconciler contracts and normalization to preserve typed threat/constraint adds.
  - Updated prompt sections and planner context rendering to surface threat/constraint type metadata.
  - Updated persistence file types and converters for typed threat/constraint shapes.
  - Updated server/client rendering paths to show typed threat/constraint icon metadata in panels.
  - Regenerated `public/js/app.js` from source bundle inputs.
  - Updated unit and integration tests to assert typed contracts and typed rendering output.
- **Deviation from original draft**:
  - Removed backward-compat deserialization fallback behavior from scope (strict typed cutover used instead).
  - Kept writer schema output untouched (string-based writer state fields remain), and mapped to typed deltas at reconciliation boundaries.
- **Verification**:
  - `npm run typecheck` passed.
  - `npm run test:unit -- --coverage=false --runInBand ...` passed (targeted set expanded by Jest to full unit suite; all passed).
  - `npm run test:integration -- test/integration/engine/page-service.test.ts test/integration/server/play-flow.test.ts` passed (matching integration set passed).
