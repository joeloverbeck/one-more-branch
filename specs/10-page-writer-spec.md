**Status**: Draft

# Spec 10: Page Writer (Creative-Only)

## Objective

Refactor writer generation so it produces only creative scene outputs while using `PagePlan` and authoritative state as input context.

## Writer Responsibilities

1. Write narrative prose.
2. Produce structured choices.
3. Produce `sceneSummary`.
4. Produce `protagonistAffect`.
5. Mark ending status.

## Writer Must Not

1. Add/remove any state entries.
2. Propose canon additions.
3. Resolve thread IDs.

## New Writer Output Contract

### `PageWriterResult` in `src/llm/types.ts`

Required fields:

- `narrative: string`
- `choices: Array<{ text: string; choiceType: ChoiceType; primaryDelta: PrimaryDelta }>`
- `sceneSummary: string`
- `protagonistAffect: ProtagonistAffect`
- `isEnding: boolean`
- `rawResponse: string`

## Schema and Validation Changes

### Replace writer schema scope

Update `src/llm/schemas/writer-schema.ts` and related validation so state/canon fields are removed from required and properties.

Fields removed from writer schema:

- `currentLocation`
- `threatsAdded` / `threatsRemoved`
- `constraintsAdded` / `constraintsRemoved`
- `threadsAdded` / `threadsResolved`
- `newCanonFacts` / `newCharacterCanonFacts`
- `inventoryAdded` / `inventoryRemoved`
- `healthAdded` / `healthRemoved`
- `characterStateChangesAdded` / `characterStateChangesRemoved`

### Validation updates

- Keep choice uniqueness validation (`choiceType + primaryDelta`).
- Keep protagonist-affect required-field validation.
- Remove state-ID validation from writer validator; that shifts to planner and reconciler.

## Prompt Changes

### Files

- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/continuation-prompt.ts`

### Required prompt behavior

1. Include `PagePlan.sceneIntent`, `PagePlan.writerBrief`, and continuity anchors.
2. Continue to include current structured state as authoritative context.
3. Explicitly state: writer does not output state changes.
4. Remove instructions that ask writer to fill state add/remove arrays.

## Engine/Client Integration

1. Add `generatePageWriterOutput(context, plan, options)` in `src/llm/client.ts`.
2. Keep retry and structured-output enforcement behavior.
3. Ensure page-service passes plan to writer prompt builder.

## Acceptance Criteria

1. Writer response is creative-only and schema-valid.
2. Any state fields returned by model are rejected by strict schema.
3. Continuity quality does not regress in fixture-based continuation tests.

## Required Tests

1. Unit: writer schema rejects state fields.
2. Unit: prompt includes plan sections and no state-mutation requirements.
3. Unit: writer validator still enforces choice divergence and protagonist affect requirements.
4. Integration: generated page applies state via reconciler only.
