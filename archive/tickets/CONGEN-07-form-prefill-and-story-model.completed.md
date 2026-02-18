# CONGEN-07: Form Pre-fill, Story Model, and Stress-Test Wiring

**Status**: COMPLETED
**Depends on**: CONGEN-06
**Blocks**: CONGEN-09

## Summary

Wire concept selection to pre-fill the existing story creation form, add the optional `conceptSpec` field to the Story model, and connect the "Harden this concept" toggle to the stress-test endpoint.

## Reassessed Assumptions (2026-02-18)

The ticket assumptions were rechecked against current code and tests before implementation.

1. Story serialization does **not** pass through unknown Story fields automatically. The serializer/parser in `src/persistence/story-repository.ts` explicitly maps allowed properties, so `conceptSpec` must be added there.
2. `create-ajax` currently sends only legacy form fields and selected spine. `conceptSpec` is not threaded through route/service/model layers yet.
3. Concept selection in the client currently updates UI state/events only; it does not pre-fill form fields or store a canonical selected concept for story creation.
4. The "Harden this concept" toggle currently does not call `/stories/stress-test-concept`; stress-test wiring remains to be implemented.
5. Existing unit tests do not cover `conceptSpec` propagation or concept-based form pre-fill.

Scope below is corrected to match these realities.

## Files to Create

- None

## Files to Touch

- `src/models/story.ts` — Add optional `conceptSpec` field to `Story` interface and `CreateStoryData`
- `src/models/story.ts` — Update `isStory()` type guard to accept optional `conceptSpec`
- `src/persistence/story-repository.ts` — Persist/parse optional `conceptSpec` in Story file mapping
- `public/js/src/09-controllers.js` — Add form pre-fill logic after concept selection, wire stress-test toggle
- `public/js/src/04d-concept-renderer.js` — Add stress-test toggle interaction
- `public/js/app.js` — Regenerated
- `src/server/routes/stories.ts` — Pass `conceptSpec` through story creation routes
- `src/server/services/story-creation-service.ts` — Accept optional `conceptSpec` in `StoryFormInput`
- `test/unit/models/story.test.ts` — Cover optional `conceptSpec` model/type guard behavior
- `test/unit/server/routes/stories.test.ts` — Cover `conceptSpec` pass-through in `/stories/create-ajax`
- `test/unit/persistence/story-repository.test.ts` — Cover Story serialization round-trip with `conceptSpec`

## Out of Scope

- Downstream prompt enrichment (spine prompt, entity decomposer, structure generator receiving ConceptContext) — this is explicitly called out as follow-up work in spec section 8.2
- Briefing page display of concept info (potential follow-up)
- Changes to existing LLM prompts
- Changes to page generation pipeline

## Work Description

### 1. Story Model Changes

In `src/models/story.ts`:
- Add `readonly conceptSpec?: ConceptSpec` to `Story` interface (import from `concept-generator-types.ts`)
- Add `conceptSpec?: ConceptSpec` to `CreateStoryData` interface
- Update `createStory()` to pass through `conceptSpec` if provided
- Update `isStory()` — `conceptSpec` is optional, so existing validation continues to pass; add a simple shape check if present

### 2. Story Serialization

Update `src/persistence/story-repository.ts` serializer/parser so `conceptSpec` is explicitly included in stored Story JSON and restored on load. This is required because Story persistence uses explicit object mapping, not transparent pass-through of unknown fields.

### 3. Form Pre-fill Mapping (Client JS)

In `09-controllers.js`, after concept card selection:

| Concept Field | → Form Field | Transform |
|---|---|---|
| `protagonistRole` + `coreCompetence` + `coreFlaw` | `characterConcept` textarea | Join as paragraph: "Role: {role}. Competence: {competence}. Flaw: {flaw}." |
| `settingAxioms` + `constraintSet` + `keyInstitutions` | `worldbuilding` textarea | Join as structured text with headers |
| `genreFrame` + `genreSubversion` | `tone` input | "{genreFrame} — {genreSubversion}" |
| (not mapped) | `title`, `npcs`, `startingSituation` | Left empty for user to fill |

- Show the existing form section after pre-fill
- Display read-only concept context (oneLineHook, coreConflictLoop, conflictAxis, pressureSource, stakes, actionVerbs, deadlineMechanism) as an informational panel above the form
- Store selected ConceptSpec in a JS variable for inclusion in create-ajax payload

### 4. Stress-Test Toggle Wiring

When "Harden this concept" is toggled and user clicks a concept card:
- POST to `/stories/stress-test-concept` with selected concept + scores + weaknesses + apiKey
- Show progress spinner during stress-test
- On success: update the stored concept with `hardenedConcept`, re-render concept info panel
- Pre-fill form from hardened concept instead of original

### 5. Route Updates

In `src/server/routes/stories.ts`:
- In `create-ajax` handler: extract `conceptSpec` from request body and pass to `storyEngine.prepareStory()`
- Preserve existing trimming/validation for legacy fields; `conceptSpec` remains optional and does not block story creation

In `src/server/services/story-creation-service.ts`:
- Add `conceptSpec?: ConceptSpec` to `StoryFormInput` type

### 6. Regenerate `app.js`

Run `node scripts/concat-client-js.js`.

## Acceptance Criteria

### Tests That Must Pass

1. **Story model: `createStory` with conceptSpec**: New story includes `conceptSpec` when provided
2. **Story model: `createStory` without conceptSpec**: Existing behavior unchanged, `conceptSpec` is undefined
3. **Story model: `isStory` accepts story with conceptSpec**: Type guard returns true
4. **Story model: `isStory` accepts story without conceptSpec**: Existing tests still pass
5. **Story serialization round-trip**: Story with `conceptSpec` survives JSON.stringify → JSON.parse
6. **Route payload threading**: `/stories/create-ajax` passes optional `conceptSpec` to `prepareStory()`
7. **Client mapping**: Selecting a concept pre-fills `characterConcept`/`worldbuilding`/`tone` and keeps the selected (or hardened) concept as canonical payload state
8. **Stress-test integration**: With "Harden this concept" enabled, concept selection calls `/stories/stress-test-concept` and uses `hardenedConcept` for pre-fill + submit payload

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- **All existing Story-related tests pass unchanged** (this is the most critical invariant)
- `npm run test` passes (full suite)
- Existing story creation flow (without concept generation) works identically
- `conceptSpec` is optional everywhere — never required
- `app.js` is regenerated, never hand-edited
- No changes to any existing LLM prompt builders

## Architecture Direction

- Persist only one canonical `conceptSpec` on Story (the final selected concept, hardened when applicable). Do not introduce aliases or duplicate concept fields.
- Keep concept enrichment upstream of spine/page generation in this ticket; downstream prompt integration stays deferred to follow-up work.

## Outcome

- **Completion date**: 2026-02-18
- **What changed**:
  - Added optional `conceptSpec` support end-to-end in Story model (`createStory`, `isStory`), engine start options, route/service validation, and story persistence mapping.
  - Added robust `isConceptSpec` model validator and reused it for request validation + story type guard.
  - Implemented concept selection pre-fill mapping for `characterConcept`, `worldbuilding`, and `tone`, added a concept context panel, and threaded canonical selected/hardened concept into `/stories/create-ajax`.
  - Wired "Harden this concept" selection flow to `/stories/stress-test-concept` with progress lifecycle integration and hardened concept replacement.
  - Regenerated `public/js/app.js`.
- **Deviations from original plan**:
  - Serialization updates were required in `src/persistence/story-repository.ts` (not `storage.ts`) because Story persistence uses explicit mapping.
  - Added strict request-side concept payload validation (`Concept payload is invalid`) to preserve model invariants.
  - Added explicit client/unit coverage beyond original minimum (service validation + client hardened flow).
- **Verification results**:
  - `npm run lint` passed.
  - `npm test` passed (full suite).
