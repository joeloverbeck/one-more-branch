# STOKERSTAANDCONENR-10: Concept Page Kernel Integration & UI Rendering

**Status**: PENDING
**Priority**: MEDIUM
**Depends On**: STOKERSTAANDCONENR-05, STOKERSTAANDCONENR-09
**Spec Phase**: 7a, 7b, 7c, 7d, 7e

## Summary

Wire the kernel selection into the concept generation flow. The concepts page gets a kernel selector dropdown, concept generation requires a selected kernel, and the concept renderer displays the 3 new enrichment fields.

## File List

### Modified Files
- `src/server/views/pages/concepts.ejs` -- Add kernel selector dropdown and selected kernel summary
- `public/js/src/11-concepts-controller.js` -- Kernel fetching, selection, and generate flow changes
- `public/js/src/04d-concept-renderer.js` -- Render whatIfQuestion, ironicTwist, playerFantasy
- `src/server/routes/concepts.ts` -- Require `kernelId` in generate, load kernel, pass to service
- `src/server/services/concept-service.ts` -- Accept kernel data, pass to ideator

### Regenerated Files
- `public/js/app.js` -- Regenerated via `node scripts/concat-client-js.js`

### Modified (prompt layer)
- `src/llm/prompts/concept-ideator-prompt.ts` -- Accept kernel data as parameter, add kernel constraint block to system message

## Detailed Requirements

### `src/server/views/pages/concepts.ejs`

Add before the seed input form:
1. Kernel selector: `<select id="kernel-selector">` populated dynamically by JS
2. Selected kernel summary card (hidden by default, shown when kernel selected): displays dramaticThesis, valueAtStake, opposingForce, thematicQuestion, scores
3. Generate button starts disabled; enabled only when a kernel is selected AND API key is entered

### `public/js/src/11-concepts-controller.js`

Changes:
1. On page load, fetch saved kernels via `GET /kernels/api/list`
2. Populate `#kernel-selector` dropdown with kernel names
3. When kernel selected, fetch full kernel via `GET /kernels/api/:id` and display summary card
4. Enable generate button only when both kernel selected and API key entered
5. Include `kernelId` in the POST body to `/concepts/api/generate`

### `public/js/src/04d-concept-renderer.js`

Add rendering for 3 new fields in concept cards:
- `whatIfQuestion` -- displayed prominently in italic, question format
- `ironicTwist` -- distinct section with label
- `playerFantasy` -- highlighted, italic or distinct styling

These render only if the fields exist (backward-compatible with old saved concepts that lack them).

### `src/server/routes/concepts.ts`

Modify `POST /concepts/api/generate`:
1. Accept `kernelId` in request body
2. Return 400 if `kernelId` missing or empty
3. Load kernel from kernel repository via `loadKernel(kernelId)`
4. Return 400 if kernel not found
5. Pass kernel's `evaluatedKernel.kernel` (the StoryKernel object) to concept service

### `src/server/services/concept-service.ts`

Modify `generateConcepts` to accept optional `kernel: StoryKernel` parameter.
Pass kernel data to the concept ideator prompt builder.

### `src/llm/prompts/concept-ideator-prompt.ts`

Modify `buildConceptIdeatorPrompt` to accept optional kernel parameter.

When kernel provided, add a kernel constraint block to the system message:
- "The concept MUST operationalize the provided kernel's dramatic thesis."
- "The kernel's value at stake and opposing force must be the foundation of the concept's conflict engine."
- Include the kernel's fields in the user message so the LLM can reference them.

## Out of Scope

- Kernel page/routes/service (STOKERSTAANDCONENR-01 through -08 -- already done)
- ConceptSpec field additions (STOKERSTAANDCONENR-09 -- already done)
- Spine inheritance (STOKERSTAANDCONENR-11)
- Prompt documentation (STOKERSTAANDCONENR-11)
- Concept evaluator scoring changes (done in STOKERSTAANDCONENR-09)

## Acceptance Criteria

### Tests That Must Pass
- Concepts page renders kernel selector dropdown
- Concept renderer displays `whatIfQuestion`, `ironicTwist`, `playerFantasy` when present
- Concept renderer handles missing new fields gracefully (old saved concepts)
- `POST /concepts/api/generate` returns 400 without `kernelId`
- `POST /concepts/api/generate` returns 400 for non-existent kernel
- `POST /concepts/api/generate` passes kernel data to concept service
- Concept ideator prompt includes kernel constraint block when kernel provided
- Concept ideator prompt works without kernel (no regression)
- `npm run typecheck` passes
- `npm run test:client` passes after app.js regeneration

### Invariants
- Old saved concepts without the 3 new fields render without errors
- Concept generation NOW requires a kernel (breaking change to API contract)
- Concept ideator prompt includes kernel's dramatic thesis as constraint
- Kernel selection is stored client-side only (not persisted server-side in concept data)
- Existing concept CRUD endpoints (save, update, delete, list, get) are unchanged
- API key is still never persisted
