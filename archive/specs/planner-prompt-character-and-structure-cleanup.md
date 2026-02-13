# Spec: Planner Prompt — Character Label, Structure Context, and Index Cleanup
**Status**: COMPLETED

## Overview

The Page Planner prompt has three deficiencies that weaken the LLM's ability to plan scenes effectively:

1. **Character concept redundancy**: Both the raw `characterConcept` string AND the structured `decomposedCharacters` array are injected into planner context. The protagonist is always `decomposedCharacters[0]` (enforced by the entity decomposition stage), so the raw concept is redundant when decomposition exists.

2. **Useless act/beat indices**: The continuation planner shows `Current Act Index: 0` / `Current Beat Index: 0` — bare numbers meaningless to an LLM that has no index-to-content mapping.

3. **Missing structure context**: The continuation planner receives almost nothing about story structure (just theme + two indices), while the writer already gets a rich display via `buildWriterStructureContext()` showing current act (name/objective/stakes), beat statuses (CONCLUDED/ACTIVE/PENDING), and remaining acts.

## Goals

1. Add a `PROTAGONIST` label to the first decomposed character in planner context
2. Remove the raw `CHARACTER CONCEPT` block when structured decomposition exists
3. Replace the minimal structure section in both opening and continuation planners with the rich `buildWriterStructureContext()` display
4. Keep layering clean by avoiding `llm -> engine` imports or duplicated structure-state logic
5. Update tests to match the new output and harden edge-case coverage

## Reassessed Assumptions and Scope

1. `formatDecomposedCharacterForPrompt()` currently has no protagonist marker support. The ticket assumption is correct.
2. Both planner context builders still always emit `CHARACTER CONCEPT:`. The ticket assumption is correct.
3. Continuation planner still emits raw numeric indices (`Current Act Index`, `Current Beat Index`). The ticket assumption is correct.
4. `buildWriterStructureContext()` already exists and is suitable for planner reuse. The ticket assumption is correct.
5. The original proposed opening helper is architecturally stale:
   - `createInitialStructureState()` already exists in `src/engine/structure-state.ts`.
   - Importing that directly from planner prompt code would create a bad dependency direction (`llm -> engine`).
   - Re-implementing a local helper in planner code duplicates domain logic.

## Architecture Decision

Move `createInitialStructureState()` into a shared domain-layer module (`src/models/story-arc.ts`) and import it from both:
- `src/engine/structure-state.ts` (for progression logic and existing engine flows)
- `src/llm/prompts/sections/planner/opening-context.ts` (for opening planner structure rendering)

This is cleaner and more extensible than duplicating initialization logic in prompts or widening `OpeningContext` solely for one prompt formatter.

## Implementation Details

### Change 1: Add `isProtagonist` parameter to shared formatter

**File**: `src/models/decomposed-character.ts`

Add an optional `isProtagonist` parameter to `formatDecomposedCharacterForPrompt()`. When `true`, insert a `PROTAGONIST` line immediately after the `CHARACTER: {name}` line.

**Current** (line 20-54):
```typescript
export function formatDecomposedCharacterForPrompt(char: DecomposedCharacter): string {
  const fingerprint = char.speechFingerprint;
  const lines: string[] = [
    `CHARACTER: ${char.name}`,
    `Core Traits: ${char.coreTraits.join(', ')}`,
    // ...
  ];
```

**New**:
```typescript
export function formatDecomposedCharacterForPrompt(
  char: DecomposedCharacter,
  isProtagonist?: boolean
): string {
  const fingerprint = char.speechFingerprint;
  const lines: string[] = [
    `CHARACTER: ${char.name}`,
  ];

  if (isProtagonist) {
    lines.push('PROTAGONIST');
  }

  lines.push(
    `Core Traits: ${char.coreTraits.join(', ')}`,
    `Motivations: ${char.motivations}`,
    `Appearance: ${char.appearance}`,
  );
  // ... rest unchanged
```

**Result for protagonist**: `CHARACTER: Jon Urena\nPROTAGONIST\nCore Traits: ...`
**Result for NPCs**: unchanged (`CHARACTER: Maria\nCore Traits: ...`)

### Change 2: Update all planner callers to pass `isProtagonist`

All callers that use `formatDecomposedCharacterForPrompt` in the planner context must pass `isProtagonist: i === 0`:

#### File: `src/llm/prompts/sections/planner/opening-context.ts` (line 27)

**Current**:
```typescript
const npcsSection = hasDecomposed
  ? `CHARACTERS (structured profiles):
${context.decomposedCharacters!.map((c) => formatDecomposedCharacterForPrompt(c)).join('\n\n')}
```

**New**:
```typescript
const npcsSection = hasDecomposed
  ? `CHARACTERS (structured profiles):
${context.decomposedCharacters!.map((c, i) => formatDecomposedCharacterForPrompt(c, i === 0)).join('\n\n')}
```

#### File: `src/llm/prompts/sections/planner/continuation-context.ts` (line 213)

Same change as opening — add `(c, i)` and pass `i === 0`.

#### Files NOT changed (no protagonist labeling needed)

The following files also call `formatDecomposedCharacterForPrompt` but are **not planner prompts** — they should remain unchanged because the writer and lorekeeper have their own character handling and the protagonist label is only needed in planner context:

- `src/llm/prompts/lorekeeper-prompt.ts` (line 36) — lorekeeper already curates characters differently
- `src/llm/prompts/agenda-resolver-prompt.ts` (line 55) — NPC-focused, protagonist label not relevant

### Change 3: Remove `CHARACTER CONCEPT` when decomposition exists

#### File: `src/llm/prompts/sections/planner/opening-context.ts`

**Current** (lines 85-91):
```typescript
return `=== PLANNER CONTEXT: OPENING ===
CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}...`;
```

**New**:
```typescript
const characterConceptSection = hasDecomposed
  ? ''
  : `CHARACTER CONCEPT:
${context.characterConcept}

`;

return `=== PLANNER CONTEXT: OPENING ===
${characterConceptSection}${worldSection}${npcsSection}...`;
```

When `decomposedCharacters` is non-empty, the protagonist's structured profile (now with `PROTAGONIST` label) fully replaces the raw concept string.

#### File: `src/llm/prompts/sections/planner/continuation-context.ts`

**Current** (lines 313-315):
```typescript
return `=== PLANNER CONTEXT: CONTINUATION ===
CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}...`;
```

**New** — same conditional pattern:
```typescript
const characterConceptSection = hasDecomposed
  ? ''
  : `CHARACTER CONCEPT:
${context.characterConcept}

`;

return `=== PLANNER CONTEXT: CONTINUATION ===
${characterConceptSection}${worldSection}${npcsSection}...`;
```

### Change 4: Replace structure display with `buildWriterStructureContext()`

The existing `buildWriterStructureContext()` in `src/llm/prompts/continuation/story-structure-section.ts` (lines 89-145) produces a rich display:

```
=== STORY STRUCTURE ===
Overall Theme: ...
Premise: ...

CURRENT ACT: Lockdown (Act 1 of 3)
Objective: ...
Stakes: ...

BEATS IN THIS ACT:
  [x] CONCLUDED (setup): ...
    Resolution: ...
  [>] ACTIVE (escalation): ...
    Objective: ...
  [ ] PENDING (turning_point): ...

REMAINING ACTS:
  - Act 2: ... - ...
```

#### File: `src/llm/prompts/sections/planner/continuation-context.ts`

**Current** (lines 223-231):
```typescript
const structureSection =
  context.structure && context.accumulatedStructureState
    ? `=== STORY STRUCTURE (if provided) ===
Overall Theme: ${context.structure.overallTheme}
Current Act Index: ${context.accumulatedStructureState.currentActIndex}
Current Beat Index: ${context.accumulatedStructureState.currentBeatIndex}

`
    : '';
```

**New**:
```typescript
import { buildWriterStructureContext } from '../../continuation/story-structure-section.js';
// ...
const structureSection = buildWriterStructureContext(
  context.structure,
  context.accumulatedStructureState
);
```

This is a direct replacement. `buildWriterStructureContext` already handles `undefined` inputs (returns `''`), already appends a trailing newline, and already includes `=== STORY STRUCTURE ===` as its header.

#### File: `src/llm/prompts/sections/planner/opening-context.ts`

**Current** (lines 44-56):
```typescript
const firstAct = context.structure?.acts[0];
const firstBeat = firstAct?.beats[0];
const structureSection =
  context.structure && firstAct && firstBeat
    ? `=== STORY STRUCTURE (if provided) ===
Overall Theme: ${context.structure.overallTheme}
Current Act: ${firstAct.name}
Act Objective: ${firstAct.objective}
Current Beat: ${firstBeat.description}
Beat Objective: ${firstBeat.objective}

`
    : '';
```

**Problem**: `buildWriterStructureContext` requires an `AccumulatedStructureState`, but `OpeningPagePlanContext` has no accumulated state.

**Updated solution**:
1. Move `createInitialStructureState(structure)` from `src/engine/structure-state.ts` to `src/models/story-arc.ts`.
2. Re-export/use that shared function from `src/engine/structure-state.ts`.
3. In opening planner context, call:
```typescript
const structureSection = context.structure
  ? buildWriterStructureContext(
      context.structure,
      createInitialStructureState(context.structure)
    )
  : '';
```

This preserves a single source of truth for structure-state initialization and avoids cross-layer coupling.

### Change 5: Update tests

#### File: `test/unit/models/decomposed-models.test.ts`

Add test cases for the `isProtagonist` parameter:
- When `isProtagonist` is `true`, output contains `PROTAGONIST` after the character name line
- When `isProtagonist` is `false` or omitted, output does NOT contain `PROTAGONIST`
- Existing tests remain unchanged (they pass `undefined` implicitly)

#### File: `test/unit/llm/prompts/sections/planner/opening-context.test.ts`

Current tests assert `expect(result).toContain('CHARACTER CONCEPT:')`. These need updates:

- **With decomposed characters**: assert `CHARACTER CONCEPT:` is NOT present, assert `PROTAGONIST` is present in first character block
- **Without decomposed characters**: assert `CHARACTER CONCEPT:` IS present (fallback path)
- **Structure display**: replace assertions for `Current Act:` / `Current Beat:` with assertions for `CURRENT ACT:` / `BEATS IN THIS ACT:` / `CONCLUDED` / `ACTIVE` / `PENDING` patterns
- Add test case for structure with initial state (first beat shown as ACTIVE)

#### File: `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`

- **With decomposed characters**: assert `CHARACTER CONCEPT:` is NOT present
- **Without decomposed characters**: assert `CHARACTER CONCEPT:` IS present
- **Structure display**: replace assertions for `Current Act Index:` / `Current Beat Index:` with assertions for `CURRENT ACT:` / `BEATS IN THIS ACT:` / `REMAINING ACTS:` etc.
- Add test with mixed beat statuses (some concluded, some active, some pending) to verify the full display

#### File: `test/unit/models/story-arc.test.ts`

Add assertions for the now-shared `createInitialStructureState()`:
- first beat is `active`, later beats are `pending`
- empty structures still return a valid zeroed state
- initialization shape remains stable for both engine and prompt consumers

## Files Changed

| File | Change |
|------|--------|
| `src/models/decomposed-character.ts` | Add `isProtagonist` parameter to `formatDecomposedCharacterForPrompt()` |
| `src/models/story-arc.ts` | Add/move shared `createInitialStructureState()` domain utility |
| `src/engine/structure-state.ts` | Consume shared `createInitialStructureState()` from models module |
| `src/llm/prompts/sections/planner/opening-context.ts` | Pass `isProtagonist`, conditionally remove CHARACTER CONCEPT, and render structure via `buildWriterStructureContext(createInitialStructureState(...))` |
| `src/llm/prompts/sections/planner/continuation-context.ts` | Pass `isProtagonist`, conditionally remove CHARACTER CONCEPT, replace structure display with `buildWriterStructureContext()` |
| `test/unit/models/decomposed-models.test.ts` | Add `isProtagonist` test cases |
| `test/unit/models/story-arc.test.ts` | Add tests for shared `createInitialStructureState()` |
| `test/unit/llm/prompts/sections/planner/opening-context.test.ts` | Update assertions for new output format |
| `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` | Update assertions for new output format |

## Files NOT Changed

| File | Reason |
|------|--------|
| `src/llm/prompts/lorekeeper-prompt.ts` | Not a planner prompt; protagonist label not relevant |
| `src/llm/prompts/agenda-resolver-prompt.ts` | NPC-focused; protagonist label not relevant |
| `src/llm/context-types.ts` | No type changes needed; opening prompt derives initial structure state directly from `structure` |
| `src/engine/page-service.ts` | Import path update only (`createInitialStructureState` now sourced from `models/story-arc`) |
| `src/llm/prompts/continuation/story-structure-section.ts` | Reused as-is, no modifications |

## Verification

1. `npm run typecheck` — no type errors
2. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/models/decomposed-models.test.ts test/unit/models/story-arc.test.ts test/unit/llm/prompts/sections/planner/opening-context.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/engine/page-service.test.ts test/unit/engine/structure-state.test.ts` — all pass
6. Manual: start a story, generate 3+ pages, inspect prompt logs in `logs/MM-DD-YYYY/prompts.jsonl`:
   - Protagonist entry shows `PROTAGONIST` label after `CHARACTER: {name}`
   - No raw `CHARACTER CONCEPT` block when decomposition exists
   - `CHARACTER CONCEPT` block present when decomposition is absent (fallback)
   - Opening planner structure section shows `CURRENT ACT: ...` with first beat as `ACTIVE`
   - Continuation planner structure section shows full act/beat display with `CONCLUDED`/`ACTIVE`/`PENDING` status
   - No bare `Current Act Index` / `Current Beat Index` numbers anywhere in planner prompts

## Outcome

- Completion date: February 13, 2026
- Actual implementation:
  - Added `PROTAGONIST` labeling support to decomposed-character prompt formatting.
  - Planner opening/continuation contexts now suppress raw `CHARACTER CONCEPT` when structured characters are present.
  - Both planner contexts now reuse `buildWriterStructureContext()` (including opening via `createInitialStructureState`).
  - Promoted `createInitialStructureState()` into `src/models/story-arc.ts` as shared domain logic.
  - Updated dependent imports/tests to use the new source of truth and avoid `llm -> engine` or barrel-mock coupling.
- Deviations from original plan:
  - Instead of creating a local opening helper, centralized `createInitialStructureState()` in the models layer for cleaner architecture.
  - Adjusted `src/engine/page-service.ts` import path to avoid runtime issues from mocked model barrels in unit tests.
- Verification results:
  - Typecheck passed.
  - Targeted hard unit suites for models, planner prompt sections, and impacted engine modules all passed.
