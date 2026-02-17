# CONGEN-07: Form Pre-fill, Story Model, and Stress-Test Wiring

**Status**: PENDING
**Depends on**: CONGEN-06
**Blocks**: CONGEN-09

## Summary

Wire concept selection to pre-fill the existing story creation form, add the optional `conceptSpec` field to the Story model, and connect the "Harden this concept" toggle to the stress-test endpoint.

## Files to Create

- None

## Files to Touch

- `src/models/story.ts` — Add optional `conceptSpec` field to `Story` interface and `CreateStoryData`
- `src/models/story.ts` — Update `isStory()` type guard to accept optional `conceptSpec`
- `src/persistence/page-serializer.ts` or `src/persistence/converters/` — If needed for serialization (check if Story serialization handles unknown optional fields gracefully)
- `src/persistence/storage.ts` — If Story serialization needs updates for new field
- `public/js/src/09-controllers.js` — Add form pre-fill logic after concept selection, wire stress-test toggle
- `public/js/src/04d-concept-renderer.js` — Add stress-test toggle interaction
- `public/js/app.js` — Regenerated
- `src/server/routes/stories.ts` — Pass `conceptSpec` through story creation routes
- `src/server/services/story-creation-service.ts` — Accept optional `conceptSpec` in `StoryFormInput`

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

Check `src/persistence/storage.ts` to verify Story JSON serialization handles new optional fields gracefully. The project uses `JSON.stringify`/`JSON.parse` for story files, so optional fields should serialize naturally. Only touch serialization code if explicit conversion is needed.

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

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- **All existing Story-related tests pass unchanged** (this is the most critical invariant)
- `npm run test` passes (full suite)
- Existing story creation flow (without concept generation) works identically
- `conceptSpec` is optional everywhere — never required
- `app.js` is regenerated, never hand-edited
- No changes to any existing LLM prompt builders
