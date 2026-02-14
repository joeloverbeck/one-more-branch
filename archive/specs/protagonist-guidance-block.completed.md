# Protagonist Guidance Block

**Status**: COMPLETED
**Priority**: Enhancement
**Scope**: UI + pipeline threading + planner prompt

## Summary

Replace the single "Suggest something your protagonist might say..." text input with a collapsible three-field guidance block (emotions, thoughts, speech). All fields are optional, 500 chars each, and reach the **planner prompt only** (the writer inherits guidance indirectly via the PagePlan).

---

## 1. Type Definition

**New file**: `src/models/protagonist-guidance.ts`

```typescript
export interface ProtagonistGuidance {
  readonly suggestedEmotions?: string;
  readonly suggestedThoughts?: string;
  readonly suggestedSpeech?: string;
}

/**
 * Returns true if all guidance fields are absent or empty strings after trimming.
 */
export function isProtagonistGuidanceEmpty(
  guidance: ProtagonistGuidance | undefined
): boolean {
  if (!guidance) return true;
  return (
    (!guidance.suggestedEmotions || guidance.suggestedEmotions.trim().length === 0) &&
    (!guidance.suggestedThoughts || guidance.suggestedThoughts.trim().length === 0) &&
    (!guidance.suggestedSpeech || guidance.suggestedSpeech.trim().length === 0)
  );
}
```

Export from `src/models/index.ts`.

---

## 2. UI Changes

### 2a. `src/server/views/pages/play.ejs` (lines 116-124)

Replace the single `<input>` block:

```html
<!-- OLD (remove lines 116-124) -->
<div class="suggested-protagonist-speech-container">
  <input type="text" id="suggested-protagonist-speech-input" ... />
</div>
```

With a `<details>/<summary>` collapsible block:

```html
<details class="protagonist-guidance">
  <summary class="protagonist-guidance__summary">Guide Your Protagonist</summary>
  <div class="protagonist-guidance__fields">
    <div class="protagonist-guidance__field">
      <label class="protagonist-guidance__label" for="guidance-emotions">Emotions</label>
      <textarea
        id="guidance-emotions"
        class="protagonist-guidance__textarea"
        name="suggestedEmotions"
        placeholder="e.g. Furious but hiding it behind a thin smile..."
        maxlength="500"
        rows="2"
      ></textarea>
    </div>
    <div class="protagonist-guidance__field">
      <label class="protagonist-guidance__label" for="guidance-thoughts">Thoughts</label>
      <textarea
        id="guidance-thoughts"
        class="protagonist-guidance__textarea"
        name="suggestedThoughts"
        placeholder="e.g. Wondering if the stranger recognized them..."
        maxlength="500"
        rows="2"
      ></textarea>
    </div>
    <div class="protagonist-guidance__field">
      <label class="protagonist-guidance__label" for="guidance-speech">Speech</label>
      <textarea
        id="guidance-speech"
        class="protagonist-guidance__textarea"
        name="suggestedSpeech"
        placeholder="e.g. 'Wake up, Alicia! We don't have much time.'"
        maxlength="500"
        rows="2"
      ></textarea>
    </div>
  </div>
</details>
```

### 2b. CSS (`public/css/styles.css`)

Remove the `.suggested-protagonist-speech-*` rules (lines 1022-1052). Replace with BEM-style rules:

```css
/* Protagonist guidance block */
.protagonist-guidance {
  margin-top: 0.75rem;
}

.protagonist-guidance__summary {
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-style: italic;
  padding: 0.4rem 0;
  user-select: none;
  transition: color var(--transition);
}

.protagonist-guidance__summary:hover {
  color: var(--color-text);
}

.protagonist-guidance[open] .protagonist-guidance__summary {
  margin-bottom: 0.5rem;
}

.protagonist-guidance__fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.protagonist-guidance__field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.protagonist-guidance__label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.protagonist-guidance__textarea {
  width: 100%;
  color: var(--color-text-muted);
  background: rgba(14, 24, 49, 0.25);
  border: 1px solid rgba(39, 64, 111, 0.3);
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.85rem;
  font-style: italic;
  resize: vertical;
  transition: border-color var(--transition), box-shadow var(--transition), color var(--transition);
}

.protagonist-guidance__textarea::placeholder {
  color: var(--color-text-muted);
  opacity: 0.5;
  font-style: italic;
}

.protagonist-guidance__textarea:focus {
  outline: 2px solid transparent;
  color: var(--color-text);
  border-color: rgba(83, 52, 131, 0.5);
  box-shadow: 0 0 0 2px rgba(83, 52, 131, 0.15);
  font-style: normal;
}
```

---

## 3. Client JS Changes

### 3a. `public/js/src/05-choice-renderers.js`

**Replace** `renderCustomChoiceInput(suggestedSpeechValue)` with `renderProtagonistGuidanceAndCustomChoice(guidanceValues)`:

```javascript
function renderProtagonistGuidanceAndCustomChoice(guidanceValues) {
  const safeEmotions = typeof guidanceValues.emotions === 'string'
    ? guidanceValues.emotions : '';
  const safeThoughts = typeof guidanceValues.thoughts === 'string'
    ? guidanceValues.thoughts : '';
  const safeSpeech = typeof guidanceValues.speech === 'string'
    ? guidanceValues.speech : '';

  return `
    <details class="protagonist-guidance">
      <summary class="protagonist-guidance__summary">Guide Your Protagonist</summary>
      <div class="protagonist-guidance__fields">
        <div class="protagonist-guidance__field">
          <label class="protagonist-guidance__label" for="guidance-emotions">Emotions</label>
          <textarea
            id="guidance-emotions"
            class="protagonist-guidance__textarea"
            name="suggestedEmotions"
            placeholder="e.g. Furious but hiding it behind a thin smile..."
            maxlength="500"
            rows="2"
          >${escapeHtml(safeEmotions)}</textarea>
        </div>
        <div class="protagonist-guidance__field">
          <label class="protagonist-guidance__label" for="guidance-thoughts">Thoughts</label>
          <textarea
            id="guidance-thoughts"
            class="protagonist-guidance__textarea"
            name="suggestedThoughts"
            placeholder="e.g. Wondering if the stranger recognized them..."
            maxlength="500"
            rows="2"
          >${escapeHtml(safeThoughts)}</textarea>
        </div>
        <div class="protagonist-guidance__field">
          <label class="protagonist-guidance__label" for="guidance-speech">Speech</label>
          <textarea
            id="guidance-speech"
            class="protagonist-guidance__textarea"
            name="suggestedSpeech"
            placeholder="e.g. 'Wake up, Alicia! We don't have much time.'"
            maxlength="500"
            rows="2"
          >${escapeHtml(safeSpeech)}</textarea>
        </div>
      </div>
    </details>
    <div class="custom-choice-container">
      <input type="text" class="custom-choice-input"
             placeholder="Introduce your own custom choice..."
             maxlength="500" />
      <button type="button" class="custom-choice-btn">Add</button>
    </div>
    <div class="custom-choice-enums">
      <select class="custom-choice-type">
        ${renderSelectOptions(CHOICE_TYPES)}
      </select>
      <select class="custom-choice-delta">
        ${renderSelectOptions(PRIMARY_DELTAS)}
      </select>
    </div>
    <div class="alert alert-error play-error" id="play-error" style="display: none;" role="alert" aria-live="polite"></div>
  `;
}
```

**Update** `rebuildChoicesSection` signature from `(choiceList, suggestedSpeechValue, ...)` to `(choiceList, guidanceValues, ...)`:

```javascript
function rebuildChoicesSection(choiceList, guidanceValues, choicesEl, choicesSectionEl, bindFn) {
  choicesEl.innerHTML = renderChoiceButtons(choiceList);
  // Remove old protagonist guidance block
  const existingGuidance = choicesSectionEl.querySelector('.protagonist-guidance');
  if (existingGuidance) {
    existingGuidance.remove();
  }
  const existingCustom = choicesSectionEl.querySelector('.custom-choice-container');
  if (existingCustom) {
    existingCustom.remove();
  }
  const existingEnums = choicesSectionEl.querySelector('.custom-choice-enums');
  if (existingEnums) {
    existingEnums.remove();
  }
  // Also clean up any legacy speech container (backward compat during transition)
  const legacySpeech = choicesSectionEl.querySelector('.suggested-protagonist-speech-container');
  if (legacySpeech) {
    legacySpeech.remove();
  }
  choicesEl.insertAdjacentHTML('afterend', renderProtagonistGuidanceAndCustomChoice(guidanceValues));
  bindFn();
}
```

### 3b. `public/js/src/09-controllers.js`

**Replace** `getSuggestedProtagonistSpeechInputValue()` with `getProtagonistGuidanceValues()`:

```javascript
function getProtagonistGuidanceValues() {
  const emotionsEl = choicesSection.querySelector('#guidance-emotions');
  const thoughtsEl = choicesSection.querySelector('#guidance-thoughts');
  const speechEl = choicesSection.querySelector('#guidance-speech');

  return {
    emotions: emotionsEl instanceof HTMLTextAreaElement ? emotionsEl.value : '',
    thoughts: thoughtsEl instanceof HTMLTextAreaElement ? thoughtsEl.value : '',
    speech: speechEl instanceof HTMLTextAreaElement ? speechEl.value : '',
  };
}
```

**Update POST body construction** in the choice click handler (around line 162-170):

```javascript
// OLD:
const suggestedProtagonistSpeech = getSuggestedProtagonistSpeechInputValue().trim();
if (suggestedProtagonistSpeech.length > 0) {
  body.suggestedProtagonistSpeech = suggestedProtagonistSpeech;
}

// NEW:
const guidanceValues = getProtagonistGuidanceValues();
const protagonistGuidance = {};
if (guidanceValues.emotions.trim().length > 0) {
  protagonistGuidance.suggestedEmotions = guidanceValues.emotions.trim();
}
if (guidanceValues.thoughts.trim().length > 0) {
  protagonistGuidance.suggestedThoughts = guidanceValues.thoughts.trim();
}
if (guidanceValues.speech.trim().length > 0) {
  protagonistGuidance.suggestedSpeech = guidanceValues.speech.trim();
}
if (Object.keys(protagonistGuidance).length > 0) {
  body.protagonistGuidance = protagonistGuidance;
}
```

**Update `rebuildChoicesSection` calls** -- pass guidance values object instead of speech string:

```javascript
// After successful choice (new generation) -- clear all fields:
const guidanceForRebuild = data.wasGenerated === true
  ? { emotions: '', thoughts: '', speech: '' }
  : getProtagonistGuidanceValues();
rebuildChoicesSection(data.page.choices, guidanceForRebuild, choices, choicesSection, bindCustomChoiceEvents);

// After custom choice add -- preserve current values:
rebuildChoicesSection(data.choices, getProtagonistGuidanceValues(), choices, choicesSection, bindCustomChoiceEvents);
```

**Regenerate `app.js`**: Run `node scripts/concat-client-js.js` after editing source files.

---

## 4. Route Handler Changes

### `src/server/routes/play.ts`

#### 4a. Update `ChoiceBody` type

```typescript
// OLD:
type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
  progressId?: unknown;
  suggestedProtagonistSpeech?: unknown;
};

// NEW:
type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
  progressId?: unknown;
  protagonistGuidance?: unknown;
  suggestedProtagonistSpeech?: unknown;  // backward compat
};
```

#### 4b. Replace `normalizeSuggestedProtagonistSpeech()` with `normalizeProtagonistGuidance()`

```typescript
import type { ProtagonistGuidance } from '../../models/protagonist-guidance.js';
import { isProtagonistGuidanceEmpty } from '../../models/protagonist-guidance.js';

const MAX_GUIDANCE_FIELD_LENGTH = 500;

function normalizeProtagonistGuidance(
  rawGuidance: unknown,
  legacySpeech: unknown
): ProtagonistGuidance | undefined {
  // Try new format first
  if (rawGuidance && typeof rawGuidance === 'object' && !Array.isArray(rawGuidance)) {
    const g = rawGuidance as Record<string, unknown>;
    const result: ProtagonistGuidance = {
      suggestedEmotions: normalizeGuidanceField(g['suggestedEmotions']),
      suggestedThoughts: normalizeGuidanceField(g['suggestedThoughts']),
      suggestedSpeech: normalizeGuidanceField(g['suggestedSpeech']),
    };
    return isProtagonistGuidanceEmpty(result) ? undefined : result;
  }

  // Backward compat: wrap legacy string as speech-only
  if (typeof legacySpeech === 'string') {
    const trimmed = legacySpeech.trim();
    if (trimmed.length > 0) {
      return {
        suggestedSpeech: trimmed.slice(0, MAX_GUIDANCE_FIELD_LENGTH),
      };
    }
  }

  return undefined;
}

function normalizeGuidanceField(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_GUIDANCE_FIELD_LENGTH);
}
```

#### 4c. Update the choice POST handler

In the `/:storyId/choice` handler, replace:

```typescript
// OLD:
const suggestedProtagonistSpeech = normalizeSuggestedProtagonistSpeech(
  rawSuggestedProtagonistSpeech
);
// ...validation of suggestedProtagonistSpeech length...
// ...spread into storyEngine.makeChoice(...)...
```

With:

```typescript
const {
  protagonistGuidance: rawGuidance,
  suggestedProtagonistSpeech: rawLegacySpeech,
} = req.body as ChoiceBody;
const protagonistGuidance = normalizeProtagonistGuidance(rawGuidance, rawLegacySpeech);

// Remove the old MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH validation block
// (field truncation is now handled inside normalizeProtagonistGuidance)
```

Pass to `storyEngine.makeChoice()`:

```typescript
const result = await storyEngine.makeChoice({
  storyId: storyId as StoryId,
  pageId: pageId as PageId,
  choiceIndex,
  apiKey: apiKey ?? undefined,
  onGenerationStage: ...,
  ...(protagonistGuidance ? { protagonistGuidance } : {}),
});
```

Remove the constant `MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH` (replaced by `MAX_GUIDANCE_FIELD_LENGTH`).

---

## 5. Pipeline Threading

Changes must be applied in dependency order.

### 5a. `src/engine/types.ts` -- `MakeChoiceOptions`

```typescript
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';

export interface MakeChoiceOptions {
  readonly storyId: StoryId;
  readonly pageId: PageId;
  readonly choiceIndex: number;
  readonly apiKey?: string;
  readonly protagonistGuidance?: ProtagonistGuidance;  // was: suggestedProtagonistSpeech?: string
  readonly onGenerationStage?: GenerationStageCallback;
}
```

### 5b. `src/engine/story-engine.ts` -- `makeChoice()`

Line 76: replace `options.suggestedProtagonistSpeech` with `options.protagonistGuidance`:

```typescript
const { page, wasGenerated, deviationInfo } = await getOrGeneratePage(
  story,
  currentPage,
  options.choiceIndex,
  options.apiKey,
  options.onGenerationStage,
  options.protagonistGuidance  // was: options.suggestedProtagonistSpeech
);
```

### 5c. `src/engine/page-service.ts`

Update `GeneratePageContinuationParams`:

```typescript
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';

export interface GeneratePageContinuationParams {
  readonly parentPage: Page;
  readonly choiceIndex: number;
  readonly protagonistGuidance?: ProtagonistGuidance;  // was: suggestedProtagonistSpeech?: string
}
```

Update `getOrGeneratePage()` signature (line 423):

```typescript
export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey?: string,
  onGenerationStage?: GenerationStageCallback,
  protagonistGuidance?: ProtagonistGuidance  // was: suggestedProtagonistSpeech?: string
): Promise<{ ... }> {
```

Pass through at line 465:

```typescript
const { page, updatedStory, metrics, deviationInfo } = await generatePage(
  'continuation',
  story,
  apiKey,
  { parentPage, choiceIndex, protagonistGuidance },  // was: suggestedProtagonistSpeech
  onGenerationStage
);
```

In `generatePage()`, update the two calls to `buildContinuationContext()` (lines 149 and 190) to pass `continuationParams!.protagonistGuidance` instead of `continuationParams!.suggestedProtagonistSpeech`.

Update the deprecated `generateNextPage()` function signature (line 401) accordingly, or remove the deprecated parameter and pass `undefined` for `protagonistGuidance` since the deprecated function is not used by the route handler.

### 5d. `src/engine/continuation-context-builder.ts`

Update function signature:

```typescript
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';

export function buildContinuationContext(
  story: Story,
  parentPage: Page,
  choiceText: string,
  parentState: CollectedParentState,
  ancestorContext: AncestorContext,
  currentStructureVersion: VersionedStoryStructure | null,
  protagonistGuidance?: ProtagonistGuidance  // was: suggestedProtagonistSpeech?: string
): ContinuationContext {
  return {
    ...existingFields,
    protagonistGuidance,  // was: suggestedProtagonistSpeech
  };
}
```

### 5e. `src/llm/context-types.ts` -- `ContinuationContext`

Replace line 55:

```typescript
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';

export interface ContinuationContext {
  // ...existing fields...
  protagonistGuidance?: ProtagonistGuidance;  // was: suggestedProtagonistSpeech?: string
  // ...remaining fields...
}
```

---

## 6. Planner Prompt Changes

### `src/llm/prompts/sections/planner/continuation-context.ts`

Replace `buildSuggestedSpeechSection()` with `buildProtagonistGuidanceSection()`:

```typescript
import type { ProtagonistGuidance } from '../../../../models/protagonist-guidance.js';
import { isProtagonistGuidanceEmpty } from '../../../../models/protagonist-guidance.js';

function buildProtagonistGuidanceSection(
  guidance: ProtagonistGuidance | undefined
): string {
  if (isProtagonistGuidanceEmpty(guidance)) {
    return '';
  }

  const lines: string[] = ['=== PROTAGONIST GUIDANCE (PLAYER INTENT) ==='];
  lines.push('The player has provided guidance for the protagonist. This is meaningful player input -- plan around it, do not treat it as optional.');
  lines.push('');

  if (guidance!.suggestedEmotions?.trim()) {
    lines.push('EMOTIONAL STATE the player wants the protagonist to feel:');
    lines.push(`"${guidance!.suggestedEmotions!.trim()}"`);
    lines.push('');
    lines.push('Incorporate this emotion into your plan:');
    lines.push('- Show, don\'t tell: plan scene elements that evoke this emotion through behavior, body language, and physical reactions rather than naming the emotion.');
    lines.push('- Create circumstances that naturally trigger this emotional state -- environment, NPC actions, or consequences of the previous choice.');
    lines.push('- Let the emotion color the protagonist\'s decision-making in the choiceIntents.');
    lines.push('');
  }

  if (guidance!.suggestedThoughts?.trim()) {
    lines.push('INNER THOUGHTS the player wants the protagonist to have:');
    lines.push(`"${guidance!.suggestedThoughts!.trim()}"`);
    lines.push('');
    lines.push('Incorporate these thoughts into your plan:');
    lines.push('- Use as motivational drivers: let these thoughts shape what the protagonist pursues or avoids in the scene.');
    lines.push('- Create dramatic irony opportunities: plan situations where the protagonist\'s inner thoughts contrast with what other characters perceive.');
    lines.push('- Surface via internal monologue: include a must-include beat in writerBrief for the protagonist reflecting along these lines.');
    lines.push('');
  }

  if (guidance!.suggestedSpeech?.trim()) {
    lines.push('SPEECH the player wants the protagonist to say:');
    lines.push(`"${guidance!.suggestedSpeech!.trim()}"`);
    lines.push('');
    lines.push('Incorporate this speech into your plan:');
    lines.push('- Shape the sceneIntent so the scene creates a natural moment for this speech.');
    lines.push('- Include a must-include beat in writerBrief that reflects the protagonist voicing this intent.');
    lines.push('- Consider how NPCs and the situation would react to this kind of statement.');
    lines.push('- Let the speech intent influence at least one choiceIntent\'s consequences.');
    lines.push('');
  }

  return lines.join('\n') + '\n';
}
```

Update the call site in `buildPlannerContinuationContextSection()` (line 372):

```typescript
// OLD:
${buildSuggestedSpeechSection(context.suggestedProtagonistSpeech)}PLAYER'S CHOICE:

// NEW:
${buildProtagonistGuidanceSection(context.protagonistGuidance)}PLAYER'S CHOICE:
```

---

## 7. Testing Strategy

### 7a. Unit tests for `isProtagonistGuidanceEmpty()`

New file: `test/unit/models/protagonist-guidance.test.ts`

Test cases:
- Returns `true` for `undefined`
- Returns `true` for `{}`
- Returns `true` for `{ suggestedEmotions: '', suggestedThoughts: '', suggestedSpeech: '' }`
- Returns `true` for `{ suggestedEmotions: '   ' }` (whitespace-only)
- Returns `false` for `{ suggestedEmotions: 'angry' }`
- Returns `false` for `{ suggestedSpeech: 'hello' }` (single field present)
- Returns `false` for all three fields present

### 7b. Unit tests for `normalizeProtagonistGuidance()`

New file: `test/unit/server/routes/normalize-protagonist-guidance.test.ts`

(Or add to existing `test/unit/server/routes/play.test.ts`)

Test cases:
- New format: valid object with all fields -> returns ProtagonistGuidance
- New format: object with some empty fields -> strips empty fields
- New format: object with whitespace-only fields -> returns undefined
- New format: fields > 500 chars -> truncated to 500
- Backward compat: `rawGuidance` is undefined, `legacySpeech` is string -> wraps as `{ suggestedSpeech }`
- Backward compat: `legacySpeech` > 500 chars -> truncated
- Both undefined -> returns undefined
- Non-object `rawGuidance` (string, array, number) -> falls through to legacy check

### 7c. Unit tests for planner prompt section

Update `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`:

Test cases for `buildProtagonistGuidanceSection()`:
- Empty guidance -> returns `''`
- Only emotions -> includes EMOTIONAL STATE block, no THOUGHTS or SPEECH blocks
- Only thoughts -> includes INNER THOUGHTS block only
- Only speech -> includes SPEECH block only (same behavior as old `buildSuggestedSpeechSection`)
- All three fields -> includes all three blocks in order
- Two fields present, one absent -> includes only the two present blocks
- Whitespace-only fields treated as absent

### 7d. Update existing tests

#### `test/unit/engine/continuation-context-builder.test.ts`

- Change all `suggestedProtagonistSpeech` mock parameters to `protagonistGuidance`
- Verify `buildContinuationContext()` passes the guidance object through to the returned context

#### `test/unit/engine/page-service.test.ts`

- Update mock `GeneratePageContinuationParams` to use `protagonistGuidance` instead of `suggestedProtagonistSpeech`

#### `test/unit/engine/story-engine.test.ts`

- Update `MakeChoiceOptions` mocks to use `protagonistGuidance`

#### `test/unit/server/routes/play.test.ts`

- Update POST body in choice tests to send `protagonistGuidance` object
- Add backward compat test: POST with `suggestedProtagonistSpeech` string still works

#### `test/unit/client/play-page/choice-click.test.ts`

- Update assertions for POST body to expect `protagonistGuidance` object instead of `suggestedProtagonistSpeech` string

#### `test/unit/server/public/app.test.ts`

- Update any assertions referencing the old `.suggested-protagonist-speech-*` selectors to use `.protagonist-guidance__*`

### 7e. Integration test

In `test/integration/server/play-flow.test.ts`:

- Add a test that sends both `protagonistGuidance` and `suggestedProtagonistSpeech` -- only `protagonistGuidance` is used
- Add a test that sends only `suggestedProtagonistSpeech` string -- correctly wrapped as guidance

---

## 8. Files to Modify

| File | Change |
|------|--------|
| `src/models/protagonist-guidance.ts` | **NEW** -- `ProtagonistGuidance` interface + `isProtagonistGuidanceEmpty()` |
| `src/models/index.ts` | Export new module |
| `src/server/views/pages/play.ejs` | Replace speech input (lines 116-124) with `<details>` guidance block |
| `public/css/styles.css` | Replace `.suggested-protagonist-speech-*` rules (lines 1022-1052) with `.protagonist-guidance__*` BEM styles |
| `public/js/src/05-choice-renderers.js` | Replace `renderCustomChoiceInput` -> `renderProtagonistGuidanceAndCustomChoice`; update `rebuildChoicesSection` |
| `public/js/src/09-controllers.js` | Replace `getSuggestedProtagonistSpeechInputValue` -> `getProtagonistGuidanceValues`; update POST body + rebuild calls |
| `public/js/app.js` | Regenerated via `node scripts/concat-client-js.js` |
| `src/server/routes/play.ts` | Replace `normalizeSuggestedProtagonistSpeech` -> `normalizeProtagonistGuidance`; update `ChoiceBody` type |
| `src/engine/types.ts` | `MakeChoiceOptions`: replace `suggestedProtagonistSpeech` with `protagonistGuidance` |
| `src/engine/story-engine.ts` | Pass `protagonistGuidance` instead of `suggestedProtagonistSpeech` |
| `src/engine/page-service.ts` | Update `GeneratePageContinuationParams`, `getOrGeneratePage()`, `generatePage()`, deprecated `generateNextPage()` |
| `src/engine/continuation-context-builder.ts` | Accept `ProtagonistGuidance` instead of `string` |
| `src/llm/context-types.ts` | `ContinuationContext`: replace `suggestedProtagonistSpeech` with `protagonistGuidance` |
| `src/llm/prompts/sections/planner/continuation-context.ts` | Replace `buildSuggestedSpeechSection` -> `buildProtagonistGuidanceSection` with three labeled subsections |

### Test files to modify

| File | Change |
|------|--------|
| `test/unit/models/protagonist-guidance.test.ts` | **NEW** -- tests for `isProtagonistGuidanceEmpty()` |
| `test/unit/server/routes/play.test.ts` | Update POST bodies, add backward compat tests, add `normalizeProtagonistGuidance` tests |
| `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` | Replace speech section tests with guidance section tests |
| `test/unit/engine/continuation-context-builder.test.ts` | Update parameter from string to `ProtagonistGuidance` |
| `test/unit/engine/page-service.test.ts` | Update `GeneratePageContinuationParams` mocks |
| `test/unit/engine/story-engine.test.ts` | Update `MakeChoiceOptions` mocks |
| `test/unit/client/play-page/choice-click.test.ts` | Update POST body assertions |
| `test/unit/server/public/app.test.ts` | Update DOM selector assertions |
| `test/integration/server/play-flow.test.ts` | Add backward compat integration test |

---

## 9. Verification

```bash
npm run typecheck   # no type errors
npm run lint        # no lint errors
npm test            # all tests pass
```

Manual verification:
1. Start a story, navigate to a page with choices
2. Open "Guide Your Protagonist" collapsible block
3. Fill one or more fields (emotions, thoughts, speech)
4. Make a choice and observe spinner
5. Check `logs/MM-DD-YYYY/prompts.jsonl` for the planner prompt -- verify the `=== PROTAGONIST GUIDANCE ===` section appears with the correct subsections
6. Verify fields are cleared after a new page generates
7. Verify fields are preserved when navigating to an already-explored page
8. Test backward compat: use browser devtools to manually POST with old `suggestedProtagonistSpeech` string format -- verify it still works

---

## 10. Migration Notes

- The old `suggestedProtagonistSpeech` field on `ChoiceBody` is kept for backward compatibility but is only used as a fallback when `protagonistGuidance` is absent.
- No database/storage migration needed -- protagonist guidance is transient (not persisted in page JSON).
- The old `buildSuggestedSpeechSection()` function is fully replaced (not deprecated) since it is a private function in the prompt builder.
- The `MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH` constant is replaced by `MAX_GUIDANCE_FIELD_LENGTH` with the same value (500).

## Outcome

- **Completion date**: 2026-02-14
- **What was actually changed**:
  - Introduced `ProtagonistGuidance` domain model and helper.
  - Replaced the single speech input with a three-field collapsible guidance block in both server-rendered and client-rebuilt UI.
  - Threaded `protagonistGuidance` (emotions/thoughts/speech) through route, engine, continuation context, and planner prompt.
  - Added shared request normalization utilities for route parsing and guidance normalization.
  - Updated and expanded unit/integration/client/server tests; regenerated `public/js/app.js`.
- **Deviations from original plan**:
  - Removed backward compatibility/alias handling for legacy `suggestedProtagonistSpeech` to keep a single clean contract.
  - Centralized parsing/normalization in `src/server/utils/request-normalizers.ts` for cleaner, extensible route architecture.
- **Verification results**:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed.
