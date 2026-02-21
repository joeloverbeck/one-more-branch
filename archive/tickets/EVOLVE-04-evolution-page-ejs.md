# EVOLVE-04: Create Evolution Page EJS Template

**Status**: COMPLETED
**Priority**: MEDIUM
**Depends on**: EVOLVE-03
**Blocks**: EVOLVE-06

## Summary

Create the `/evolve` EJS page shell and header navigation entry so the already-implemented evolution routes can render a real page. This ticket defines stable DOM IDs/classes for EVOLVE-06 client behavior.

## Reassessed Assumptions (2026-02-21)

### What already exists (do not re-implement)

- `src/server/routes/evolution.ts` already implements:
  - `GET /evolve` rendering `pages/evolution`
  - `GET /evolve/api/concepts-by-kernel/:kernelId`
  - `POST /evolve/api/evolve`
- `src/server/services/evolution-service.ts` and evolver/evaluator/verifier pipeline are already implemented.
- `EVOLVING_CONCEPTS` stage plumbing and server-side route/service tests already exist.

### Discrepancies corrected

- `src/server/views/pages/evolution.ejs` is currently missing, so `GET /evolve` cannot render successfully at runtime.
- `src/server/views/partials/header.ejs` does not yet include an `/evolve` link.
- Original acceptance criteria mixed in EVOLVE-06 concerns (dynamic filtering, selection behavior, API calls, progress polling). Those are out of scope for EVOLVE-04 and remain in EVOLVE-06.
- New custom CSS classes are not required here; existing `.spine-card-selected` style is already available and should be reused by the future controller.

## Architecture Rationale

This ticket should keep architecture clean by:

1. Delivering a server-rendered page shell now, with stable IDs that decouple view structure from client behavior.
2. Reusing existing card/loading/button CSS primitives to avoid style aliasing and duplicate semantics.
3. Keeping interactive orchestration in a dedicated evolution controller ticket (EVOLVE-06), instead of expanding unrelated controllers.

This approach is more robust than deferring page creation or coupling runtime behavior into server templates because it preserves clear boundaries: route -> template shell -> client controller.

## Scope (Corrected)

1. Create `src/server/views/pages/evolution.ejs` with:
   - Kernel selector section (`#evolution-kernel-selector`, kernel summary card placeholders)
   - Parent concept selection container (`#evolution-parent-concepts-section`, `#evolution-parent-concepts`)
   - Selection counter (`#evolution-selection-counter`)
   - API key input (`#evolutionApiKey`) and disabled evolve button (`#evolve-btn`)
   - Hidden results section (`#evolution-results-section`, `#evolution-cards`)
   - Loading overlay (`#evolution-loading`) compatible with existing progress UI helpers
2. Update `src/server/views/partials/header.ejs` to add `<a href="/evolve">Evolve</a>` immediately after Concepts.
3. Add/adjust server-side template tests so missing evolution view/nav regressions are caught.

## Out of Scope

- Client-side evolution controller logic (kernel fetch, concept filtering, selection toggles, evolve/save API flows)
- Progress polling implementation details
- New backend routes/services/stage model changes
- New CSS architecture beyond minor utility usage already in `styles.css`

## Acceptance Criteria (Corrected)

- [x] `src/server/views/pages/evolution.ejs` exists and includes required DOM anchors for EVOLVE-06
- [x] `GET /evolve` has a concrete template target that can render at runtime
- [x] Header includes `Evolve` nav link next to `Concepts`
- [x] Added/updated tests cover evolution template presence and critical markup anchors

## Outcome

- **Completion date**: 2026-02-21
- **What changed**:
  - Added `src/server/views/pages/evolution.ejs` as a full page shell with stable IDs for kernel selection, parent selection, evolve action, results rendering, and loading overlay.
  - Added `Evolve` navigation link in `src/server/views/partials/header.ejs` after `Concepts`.
  - Added `test/unit/server/views/evolution.test.ts` to enforce template existence and required DOM anchors/default states.
  - Updated `test/unit/server/views/partials.test.ts` to assert `Evolve` nav presence and ordering.
  - Updated `test/unit/server/views-copy.test.ts` so build verification includes `pages/evolution.ejs`.
- **Deviations from original plan**:
  - Corrected scope to template/navigation/test coverage only; dynamic client behavior (kernel fetch, parent selection, evolve/save actions, progress polling) remains intentionally deferred to EVOLVE-06.
  - Dropped proposal for new custom selectable-card CSS classes in this ticket; existing styling primitives are sufficient and reduce style duplication.
- **Verification**:
  - `npm run build` passed
  - `npm run test:unit -- --coverage=false` passed
  - `npm run lint` passed
  - `npm run typecheck` passed
