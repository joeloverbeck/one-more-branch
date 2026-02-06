# STOENG-003: Canon Manager

## Status

Completed (2026-02-06)

## Summary

Implement the global canon management logic for tracking world facts across all story branches. This module handles adding new canon facts, detecting potential contradictions, and formatting canon for LLM prompts.

## Reassessed Assumptions (2026-02-06)

- `src/engine/canon-manager.ts` does not exist yet and must be created in this ticket.
- `test/unit/engine/canon-manager.test.ts` does not exist yet and should be added.
- The current repository uses extensionless internal TypeScript imports (for example `../models`), so this ticket should follow that convention instead of `.js` suffixed imports shown in `specs/05-story-engine.md` examples.
- `mergeCanonFacts` already performs trim/case-insensitive deduplication through model helpers; this ticket should rely on that behavior rather than reimplementing deduplication logic.
- `specs/05-story-engine.md` includes `addCanonFact` in sample imports, but this ticket only needs `mergeCanonFacts` for the required behavior.

## Updated Scope

- Create `src/engine/canon-manager.ts` with pure canon update/format/validation helpers.
- Add `test/unit/engine/canon-manager.test.ts` covering all listed behaviors plus contradiction edge cases tied to current heuristics.
- Keep changes limited to the new canon manager module, its tests, and this ticket document.

## Files to Create/Modify

### Create
- `src/engine/canon-manager.ts`
- `test/unit/engine/canon-manager.test.ts`

### Modify
- `tickets/STOENG-003-canon-manager.md` (assumptions/scope/status updates)

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** implement state management (separate ticket)
- **DO NOT** persist canon changes - return updated Story objects only

## Implementation Details

Create `src/engine/canon-manager.ts` with the following exports:

### updateStoryWithNewCanon

```typescript
export function updateStoryWithNewCanon(
  story: Story,
  newFacts: readonly string[]
): Story
```

- Returns same story if newFacts is empty
- Uses `mergeCanonFacts` from models to add facts (handles deduplication)
- Returns new Story with updated `globalCanon` and `updatedAt`
- Returns same story object if no actual changes (no new unique facts after normalization)

### formatCanonForPrompt

```typescript
export function formatCanonForPrompt(canon: GlobalCanon): string
```

- Returns empty string for empty canon
- Formats as bulleted list: `'• Fact A\n• Fact B'`

### mightContradictCanon

```typescript
export function mightContradictCanon(
  existingCanon: GlobalCanon,
  newFact: string
): boolean
```

- Heuristic check for potential contradictions
- Detects negation patterns: "is not", "does not", "never", "no longer", "was destroyed", "died"
- Returns true only when negation polarity differs and there is enough overlapping entity context
- Best-effort, not foolproof

### validateNewFacts

```typescript
export function validateNewFacts(
  existingCanon: GlobalCanon,
  newFacts: readonly string[]
): string[]
```

- Returns list of facts that might contradict existing canon
- Uses `mightContradictCanon` for each fact
- Empty return = no detected conflicts

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/canon-manager.test.ts`:

1. **updateStoryWithNewCanon**
   - Adds new facts to story
   - Updates `updatedAt` timestamp
   - Returns same story object if no new facts
   - Does not add duplicate facts (uses mergeCanonFacts)
   - Handles empty newFacts array

2. **formatCanonForPrompt**
   - Formats canon as bulleted list
   - Returns empty string for empty canon
   - Handles single fact correctly

3. **mightContradictCanon**
   - Detects "alive" vs "died" contradiction
   - Allows compatible facts about same entity
   - Returns false for completely unrelated facts
   - Handles case-insensitive matching
   - Does not flag facts that both use the same negation polarity

4. **validateNewFacts**
   - Returns potentially problematic facts
   - Returns empty array when no conflicts
   - Checks all facts in input array

### Invariants That Must Remain True

1. **Pure functions**: All functions must be pure (no side effects)
2. **Immutability**: Never mutate input Story or canon arrays
3. **Canon monotonicity**: Canon can only grow, never shrink
4. **Deduplication**: No duplicate facts in canon (handled by mergeCanonFacts)
5. **Heuristic nature**: Contradiction detection is best-effort, not guaranteed

## Estimated Size

~150 lines of code + ~100 lines of tests

## Dependencies

- STOENG-001: Engine Types
- Spec 02: Data Models (Story, GlobalCanon, mergeCanonFacts)

## Outcome

Originally planned:
- Create canon manager helper functions and their unit tests.

Actually changed:
- Added `src/engine/canon-manager.ts` with the four required exports.
- Added `test/unit/engine/canon-manager.test.ts` with coverage for update, formatting, contradiction heuristics, and validation behavior.
- Tightened contradiction tests around negation polarity to document current heuristic limits without expanding scope into full NLP contradiction detection.
- Verified with `npm run test:unit -- --testPathPattern=test/unit/engine/canon-manager.test.ts --coverage=false`, `npm run test:unit -- --testPathPattern=test/unit/engine --coverage=false`, and `npm run typecheck`.
