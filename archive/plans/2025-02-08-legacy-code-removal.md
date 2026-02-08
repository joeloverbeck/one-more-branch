**Status:** ✅ COMPLETED

# Legacy Code Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all backward compatibility handling code since there are no legacy pages in production (stories/ is empty) and we're early in the app lifecycle.

**Architecture:** Make all model fields mandatory, remove optional handling in converters/validators, eliminate re-export facades. All pages must have all fields - no graceful degradation for missing fields.

**Tech Stack:** TypeScript, Jest

---

## Analysis Summary

Found **13 backward compatibility instances** across **9 files**. After analysis:

| File | Type | Removable? | Reason |
|------|------|------------|--------|
| `src/persistence/converters/active-state-converter.ts` | Data compat | **YES** | Empty stories/, no legacy pages |
| `src/persistence/converters/protagonist-affect-converter.ts` | Data compat | **YES** | Empty stories/, no legacy pages |
| `src/models/page.ts` | Validation compat | **YES** | Make fields mandatory |
| `src/llm/schemas/validation-schema.ts` | LLM fallback | **NO** | Still needed - LLM might not return data |
| `src/llm/prompts/system-prompt.ts` | Re-export facade | **YES** | Clean import paths |
| `src/llm/examples.ts` | Re-export facade | **YES** | Clean import paths |
| `src/engine/character-canon-manager.ts` | Re-export | **YES** | Clean import paths |
| `src/engine/character-state-manager.ts` | Alias export | **PARTIAL** | Used internally, tests reference it |
| `src/models/protagonist-affect.ts` | LLM fallback | **NO** | Still needed - LLM might not return data |

**Key insight:** The backward compatibility for missing *file data* can be removed (no legacy pages exist). But backward compatibility for *LLM response parsing* must stay (LLM output is unpredictable).

---

## Task 1: Remove Backward Compat from Active State Converter

**Files:**
- Modify: `src/persistence/converters/active-state-converter.ts`
- Test: `test/unit/persistence/converters/active-state-converter.test.ts`

**Step 1: Read the test file to understand existing coverage**

```bash
cat test/unit/persistence/converters/active-state-converter.test.ts
```

**Step 2: Update converter to require data (not optional)**

Change `fileDataToActiveStateChanges`:
```typescript
// BEFORE (lines 42-48):
export function fileDataToActiveStateChanges(
  data: ActiveStateChangesFileData | undefined
): ActiveStateChanges {
  // Backward compatibility: pages without activeStateChanges get empty defaults
  if (!data) {
    return createEmptyActiveStateChanges();
  }

// AFTER:
export function fileDataToActiveStateChanges(
  data: ActiveStateChangesFileData
): ActiveStateChanges {
```

Change `fileDataToAccumulatedActiveState`:
```typescript
// BEFORE (lines 61-67):
export function fileDataToAccumulatedActiveState(
  data: AccumulatedActiveStateFileData | undefined
): ActiveState {
  // Backward compatibility: pages without accumulatedActiveState get empty defaults
  if (!data) {
    return createEmptyActiveState();
  }

// AFTER:
export function fileDataToAccumulatedActiveState(
  data: AccumulatedActiveStateFileData
): ActiveState {
```

Also update module docstring (lines 1-4):
```typescript
// BEFORE:
/**
 * Converts ActiveState and ActiveStateChanges between domain model and file format.
 * Includes backward compatibility for pages created before these fields were added.
 */

// AFTER:
/**
 * Converts ActiveState and ActiveStateChanges between domain model and file format.
 */
```

**Step 3: Run tests to verify nothing breaks**

```bash
npm run test:unit -- --testPathPattern=active-state-converter
```
Expected: PASS (assuming no tests depend on undefined handling)

**Step 4: Run typecheck to find any callers passing undefined**

```bash
npm run typecheck
```
Expected: May fail - we'll fix callers in subsequent tasks

**Step 5: Commit if passing**

```bash
git add src/persistence/converters/active-state-converter.ts
git commit -m "refactor: remove backward compat from active state converter"
```

---

## Task 2: Remove Backward Compat from Protagonist Affect Converter

**Files:**
- Modify: `src/persistence/converters/protagonist-affect-converter.ts`

**Step 1: Update converter to require data (not optional)**

Change `fileDataToProtagonistAffect`:
```typescript
// BEFORE (lines 24-30):
export function fileDataToProtagonistAffect(
  data: ProtagonistAffectFileData | undefined
): ProtagonistAffect {
  // Backward compatibility: pages without protagonistAffect get default values
  if (!data) {
    return createDefaultProtagonistAffect();
  }

// AFTER:
export function fileDataToProtagonistAffect(
  data: ProtagonistAffectFileData
): ProtagonistAffect {
```

Also update module docstring (lines 1-4):
```typescript
// BEFORE:
/**
 * Converts ProtagonistAffect between domain model and file format.
 * Includes backward compatibility for pages created before protagonistAffect was added.
 */

// AFTER:
/**
 * Converts ProtagonistAffect between domain model and file format.
 */
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Commit**

```bash
git add src/persistence/converters/protagonist-affect-converter.ts
git commit -m "refactor: remove backward compat from protagonist affect converter"
```

---

## Task 3: Fix Page Serializer to Pass Required Data

**Files:**
- Modify: `src/persistence/page-serializer.ts` (likely caller)

**Step 1: Find where converters are called**

```bash
grep -n "fileDataTo" src/persistence/page-serializer.ts
```

**Step 2: Ensure the caller asserts data exists**

If the serializer currently passes potentially undefined data, add validation:
```typescript
// Example pattern:
if (!data.activeStateChanges || !data.accumulatedActiveState) {
  throw new Error('Invalid page file: missing required active state fields');
}
const activeStateChanges = fileDataToActiveStateChanges(data.activeStateChanges);
const accumulatedActiveState = fileDataToAccumulatedActiveState(data.accumulatedActiveState);
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS

**Step 4: Run tests**

```bash
npm run test:unit
```

**Step 5: Commit**

```bash
git add src/persistence/page-serializer.ts
git commit -m "refactor: require all page fields in serializer"
```

---

## Task 4: Update Page Validator - Make Fields Mandatory

**Files:**
- Modify: `src/models/page.ts:139-171` (isPage function)
- Modify: `test/unit/models/page.test.ts`

**Step 1: Update isPage to require protagonistAffect and activeState fields**

```typescript
// BEFORE (lines 149-155):
  // protagonistAffect is optional for backward compatibility with existing pages
  const protagonistAffectValid =
    obj['protagonistAffect'] === undefined || isProtagonistAffect(obj['protagonistAffect']);
  const activeStateChangesValid =
    obj['activeStateChanges'] === undefined || isActiveStateChanges(obj['activeStateChanges']);
  const accumulatedActiveStateValid =
    obj['accumulatedActiveState'] === undefined || isActiveState(obj['accumulatedActiveState']);

// AFTER:
  const protagonistAffectValid = isProtagonistAffect(obj['protagonistAffect']);
  const activeStateChangesValid = isActiveStateChanges(obj['activeStateChanges']);
  const accumulatedActiveStateValid = isActiveState(obj['accumulatedActiveState']);
```

**Step 2: Remove or update the legacy page test**

In `test/unit/models/page.test.ts`, find and remove:
```typescript
    it('returns true for legacy pages without active state fields', () => {
      // ...
    });
```

Or update it to expect FALSE (legacy pages should now be rejected).

**Step 3: Run tests**

```bash
npm run test:unit -- --testPathPattern=page.test
```

**Step 4: Commit**

```bash
git add src/models/page.ts test/unit/models/page.test.ts
git commit -m "refactor: require all fields in page validator"
```

---

## Task 5: Remove Re-export Facades

**Files:**
- Modify: `src/llm/prompts/system-prompt.ts`
- Modify: `src/llm/examples.ts`
- Modify: `src/engine/character-canon-manager.ts`

**Step 1: Update system-prompt.ts**

Remove backward compatibility comments (lines 1-6, 11, 19):
```typescript
// BEFORE:
/**
 * System prompt exports for narrative generation.
 *
 * This module provides backward-compatible exports while delegating
 * to the modular system-prompt-builder for composition.
 */

// AFTER:
/**
 * System prompt exports for narrative generation.
 * Delegates to the modular system-prompt-builder for composition.
 */
```

Remove comments on lines 11 and 19.

**Step 2: Update examples.ts**

Remove backward compatibility reference (lines 1-8):
```typescript
// BEFORE:
/**
 * Few-shot examples for story generation prompts.
 *
 * This module serves as a backwards-compatible facade, re-exporting
 * from the refactored modules:
 * - few-shot-data.ts: Pure data constants
 * - few-shot-builder.ts: Message building logic
 */

// AFTER:
/**
 * Few-shot examples for story generation prompts.
 * Re-exports from modular modules for convenience.
 */
```

**Step 3: Update character-canon-manager.ts**

Remove backward compat comment (line 3):
```typescript
// BEFORE:
// Re-export for backward compatibility
export { normalizeCharacterName };

// AFTER:
export { normalizeCharacterName };
```

**Step 4: Run tests**

```bash
npm run test
```

**Step 5: Commit**

```bash
git add src/llm/prompts/system-prompt.ts src/llm/examples.ts src/engine/character-canon-manager.ts
git commit -m "refactor: remove backward compat comments from facades"
```

---

## Task 6: Evaluate normalizeCharacterNameForState Alias

**Files:**
- Review: `src/engine/character-state-manager.ts`
- Review: Tests using the alias

**Step 1: Assess usage**

The alias `normalizeCharacterNameForState` is used:
- Internally in `character-state-manager.ts` (3 usages)
- Exported in `src/engine/index.ts`
- Unit tested in `character-state-manager.test.ts`
- Integration tested in `state-modules.test.ts`

**Decision:** Keep the alias but remove the "backward compatibility" comment. It's actually a semantic alias (normalize for *state* context) that clarifies intent, not legacy code.

**Step 2: Update comment**

```typescript
// BEFORE:
/**
 * Re-export normalizeCharacterName as normalizeCharacterNameForState for backward compatibility.
 */
export const normalizeCharacterNameForState = normalizeCharacterName;

// AFTER:
/**
 * Alias for normalizeCharacterName providing semantic clarity in state context.
 */
export const normalizeCharacterNameForState = normalizeCharacterName;
```

**Step 3: Run tests**

```bash
npm run test
```

**Step 4: Commit**

```bash
git add src/engine/character-state-manager.ts
git commit -m "refactor: clarify normalizeCharacterNameForState is semantic alias not compat"
```

---

## Task 7: Update Test Comments for Clarity

**Files:**
- Modify: `test/unit/llm/examples.test.ts`
- Modify: `test/unit/llm/prompts.test.ts`

**Step 1: Update test names**

These tests reference "legacy" but are actually testing that OLD field formats are NOT present in the current examples. This is valid testing - keep the tests, just clarify the names:

In `examples.test.ts`:
```typescript
// Line 183 - keep test, maybe rename for clarity:
it('should not include deprecated storyArc field in any assistant example', () => {

// Line 194 - keep test:
it('should not include deprecated stateChangesAdded/Removed in any example', () => {
```

In `prompts.test.ts`:
```typescript
// Line 493 - keep test:
it('should not include deprecated story arc section in continuation prompt', () => {
```

**Step 2: Run tests**

```bash
npm run test
```

**Step 3: Commit**

```bash
git add test/unit/llm/examples.test.ts test/unit/llm/prompts.test.ts
git commit -m "refactor: rename legacy test cases to deprecated for clarity"
```

---

## Task 8: Final Verification

**Step 1: Run full test suite**

```bash
npm run test
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

**Step 3: Run linting**

```bash
npm run lint
```

**Step 4: Search for any remaining backward/legacy references**

```bash
grep -ri "backward\|legacy\|backwards" src/ --include="*.ts" | grep -v node_modules
```

Expected: Only valid uses remain (e.g., narrative content in examples)

**Step 5: Final commit if needed**

```bash
git add -A
git commit -m "chore: complete legacy code removal"
```

---

## Verification

1. **Tests pass:** `npm test` should pass 100%
2. **Types check:** `npm run typecheck` should pass
3. **No legacy patterns:** `grep -ri "backward compat" src/` returns no results
4. **Cleaner code:** Fewer optional parameters, simpler validation
5. **No behavior change:** App still works identically (stories/ was already empty)

---

## What We're NOT Removing (and Why)

1. **`createDefaultProtagonistAffect()` in `src/models/protagonist-affect.ts`** - Still needed when LLM doesn't provide affect data
2. **`defaultProtagonistAffect` in `src/llm/schemas/validation-schema.ts`** - Still needed for LLM response validation fallback
3. **The narrative text mentioning "legacy" in `src/llm/prompts/structure-rewrite-prompt.ts`** - This is story content, not code

These are **LLM output fallbacks**, not **file format backward compatibility**. The LLM is unpredictable and may omit fields, so defaults are still required.

---

## Outcome

**Completion Date:** 2026-02-08

**Changes Made:**
- Removed backward compat from `active-state-converter.ts` - made function parameters required
- Removed backward compat from `protagonist-affect-converter.ts` - made function parameters required  
- Made `protagonistAffect` required in `PageFileData` type
- Updated `isPage()` validator to require all fields (no optional handling)
- Removed backward compat comments from facade modules
- Clarified `normalizeCharacterNameForState` is a semantic alias, not compat code
- Renamed "legacy" test cases to "deprecated" for clarity
- Clarified LLM fallback defaults are not backward compatibility

**Files Modified:**
- `src/persistence/converters/active-state-converter.ts`
- `src/persistence/converters/protagonist-affect-converter.ts`
- `src/persistence/page-serializer-types.ts`
- `src/models/page.ts`
- `src/llm/prompts/system-prompt.ts`
- `src/llm/examples.ts`
- `src/engine/character-canon-manager.ts`
- `src/engine/character-state-manager.ts`
- `src/models/protagonist-affect.ts`
- `src/llm/schemas/validation-schema.ts`
- `test/unit/persistence/page-serializer.test.ts`
- `test/unit/models/page.test.ts`
- `test/unit/models/validation.test.ts`
- `test/unit/llm/examples.test.ts`
- `test/unit/llm/prompts.test.ts`

**Deviations from Plan:**
- Task 3 (page serializer) was already fixed by Task 2's type changes - TypeScript enforced required fields
- Added test helper fixes in `buildTestFileData` and validation tests

**Verification:**
- ✅ All 1375 tests pass (16 skipped are build verification tests)
- ✅ TypeScript typecheck passes
- ✅ ESLint passes
- ✅ No "backward compat" references remain in source code (only LLM fallback comments which are intentional)
