# STOKERSTAANDCONENR-10: Concept Page Kernel Integration & UI Rendering

**Status**: COMPLETED
**Priority**: MEDIUM
**Depends On**: STOKERSTAANDCONENR-05, STOKERSTAANDCONENR-09
**Spec Phase**: 7a, 7b, 7c, 7d, 7e

## Summary

Integrate story-kernel selection into concept generation end-to-end. Concept generation must require a selected kernel, pass the concrete `StoryKernel` into ideation prompting, and render concept enrichment fields (`whatIfQuestion`, `ironicTwist`, `playerFantasy`) in generated concept cards.

## Reassessed Assumptions (Current Code vs Ticket)

1. Kernel integration is **not** already wired.
- `src/server/views/pages/concepts.ejs` currently has no kernel selector or kernel summary.
- `public/js/src/11-concepts-controller.js` currently posts concept seeds + API key only.
- `src/server/routes/concepts.ts` currently accepts no `kernelId` in `/api/generate`.
- `src/server/services/concept-service.ts` and `src/llm/prompts/concept-ideator-prompt.ts` currently do not accept kernel input.

2. Enrichment fields exist in the model/schema but are not surfaced in concept cards.
- `ConceptSpec` and parser/schema already require `whatIfQuestion`, `ironicTwist`, `playerFantasy`.
- `public/js/src/04d-concept-renderer.js` and generated-cards markup in `public/js/src/11-concepts-controller.js` do not render those fields.

3. Test assumptions are stale.
- Existing concept route/service/client tests validate pre-kernel behavior.
- Missing tests for required `kernelId`, kernel-not-found handling, kernel propagation, and prompt kernel constraints.

## Architectural Direction (Scope-Corrected)

The proposed changes are beneficial over current architecture because they enforce the intended pipeline invariant (`Kernel -> Concept`) at the API boundary and prompt stage. To keep the client robust and extensible, avoid duplicate concept-card markup paths:

- Use a single concept-card rendering path for generated cards (renderer module), instead of maintaining separate HTML templates in both `04d-concept-renderer.js` and `11-concepts-controller.js`.
- Keep breaking API contract explicit: `/concepts/api/generate` now requires `kernelId` and fails fast when missing/invalid.

## File List

### Modified Files
- `src/server/views/pages/concepts.ejs` -- Add kernel selector UI and selected-kernel summary container
- `public/js/src/11-concepts-controller.js` -- Kernel fetch/select flow, generate gating, include `kernelId`, route generated cards through shared renderer path
- `public/js/src/04d-concept-renderer.js` -- Render enrichment fields with graceful fallback for missing fields
- `src/server/routes/concepts.ts` -- Require/validate `kernelId`, load kernel, pass kernel to concept service
- `src/server/services/concept-service.ts` -- Accept required kernel for concept generation, pass through to ideator context
- `src/models/concept-generator.ts` -- Extend `ConceptIdeatorContext` with kernel input
- `src/llm/prompts/concept-ideator-prompt.ts` -- Add kernel constraints and kernel context section
- `prompts/concept-ideator-prompt.md` -- Update prompt documentation for kernel-conditioned concept ideation

### Modified Tests
- `test/integration/server/concept-routes.test.ts`
- `test/unit/server/services/concept-service.test.ts`
- `test/unit/llm/concept-ideator.test.ts`
- `test/unit/server/views/concepts.test.ts`
- `test/unit/client/concepts-page/form-validation.test.ts`
- `test/unit/client/concepts-page/renderer.test.ts`

### Regenerated Files
- `public/js/app.js` -- Regenerated via `npm run concat:js`

## Detailed Requirements

### `src/server/views/pages/concepts.ejs`

Add before seed inputs:
1. Kernel selector `<select id="kernel-selector">` populated by client JS
2. Selected kernel summary card (hidden by default, shown when selected): dramaticThesis, valueAtStake, opposingForce, thematicQuestion, score summary
3. Generate button starts disabled; enabled only when a kernel is selected and API key is valid

### `public/js/src/11-concepts-controller.js`

1. On page load, fetch kernels via `GET /kernels/api/list`
2. Populate selector options from response
3. On selection change, fetch full kernel via `GET /kernels/api/:id`, render summary card
4. Enable generate button only when both selected kernel and valid API key exist
5. Include `kernelId` in `POST /concepts/api/generate`
6. Use shared concept renderer path for generated cards (no duplicated generated-card HTML template)

### `public/js/src/04d-concept-renderer.js`

Render enrichment fields in concept cards:
- `whatIfQuestion`: prominent question line
- `ironicTwist`: labeled section
- `playerFantasy`: highlighted experiential line

Compatibility requirement:
- Rendering must not throw when these fields are missing (old saved concepts)

### `src/server/routes/concepts.ts`

Modify `POST /concepts/api/generate`:
1. Accept `kernelId` in request body
2. Return 400 for missing/blank `kernelId`
3. Load kernel with `loadKernel(kernelId)`
4. Return 400 when kernel not found
5. Pass `kernel.evaluatedKernel.kernel` to concept service

### `src/server/services/concept-service.ts`

- `generateConcepts` requires kernel input for generation
- Service validates kernel presence and passes kernel into concept ideator context

### `src/models/concept-generator.ts` + `src/llm/prompts/concept-ideator-prompt.ts`

- Extend concept ideator context to include optional/required kernel payload used by prompt builder
- Prompt adds kernel-conditioning block when kernel is present, including:
  - concept must operationalize kernel dramatic thesis
  - conflict engine grounded in kernel value-at-stake and opposing force
  - kernel fields included in user message context

## Out of Scope

- Kernel page/routes/service implementation itself (already done)
- Concept evaluator scoring changes
- Spine inheritance and spine-stage prompt work
- Backward compatibility shims/aliases for old `/concepts/api/generate` request shape

## Acceptance Criteria

### Tests That Must Pass
- Concepts page includes kernel selector + summary container
- Client generate flow blocks when kernel is not selected
- Concept renderer displays enrichment fields when present
- Concept renderer handles missing enrichment fields without runtime errors
- `POST /concepts/api/generate` returns 400 without `kernelId`
- `POST /concepts/api/generate` returns 400 for missing kernel record
- `POST /concepts/api/generate` passes loaded kernel data to concept service
- Concept service forwards kernel to ideator context
- Concept ideator prompt includes kernel constraints when kernel provided
- Existing prompt behavior for non-kernel seed fields remains intact
- `npm run typecheck` passes
- relevant unit/integration/client tests pass

### Invariants
- Kernel selection is not persisted into saved concept payload (selection is request-scoped)
- API key is never persisted
- Existing concept CRUD endpoints (save/update/delete/list/get) remain behaviorally unchanged
- `/concepts/api/generate` requires `kernelId` (intentional breaking contract)

## Outcome

- Completion date: 2026-02-19
- Implemented:
  - Enforced kernel selection and propagation through concepts UI -> `/concepts/api/generate` route -> concept service -> concept ideator prompt.
  - Added kernel constraints/context to concept ideator prompting.
  - Rendered concept enrichment fields (`whatIfQuestion`, `ironicTwist`, `playerFantasy`) in concept cards with missing-field safety.
  - Removed duplicate generated-card markup path by routing generated concept cards through shared renderer logic.
  - Updated prompt documentation for concept ideator kernel conditioning.
- Deviations from original plan:
  - Added renderer deduplication as an architecture hardening step to reduce markup drift risk.
  - Added dedicated client renderer tests for enrichment rendering + legacy-field absence compatibility.
- Verification:
  - `npm run concat:js`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/services/concept-service.test.ts test/unit/llm/concept-ideator.test.ts test/unit/server/views/concepts.test.ts test/unit/client/concepts-page/form-validation.test.ts test/unit/client/concepts-page/renderer.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/server/concept-routes.test.ts test/integration/llm/concept-pipeline.test.ts`
  - `npm run test:client`
