# Two-Layer Genre Contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat 4-tag-per-genre obligation system with a two-layer contract: 6 persistent genre conventions + 6 beat-assignable obligatory moments per genre, both with glosses.

**Architecture:** Two registries (`genre-conventions.ts` and modified `genre-obligations.ts`) with entry types `{ tag, gloss }`. Conventions inject as persistent creative guidance into writer/planner/lorekeeper/structure prompts. Obligations keep the existing beat-tagging pipeline but expand from 4→6 tags with gloss descriptions.

**Tech Stack:** TypeScript strict mode, Jest testing, OpenRouter prompt pipeline.

---

### Task 1: Create Genre Conventions Registry

**Files:**
- Create: `src/models/genre-conventions.ts`
- Test: `test/unit/models/genre-conventions.test.ts`

**Step 1: Write the failing test**

Create `test/unit/models/genre-conventions.test.ts`:

```typescript
import { GENRE_FRAMES } from '@/models/concept-generator';
import {
  GENRE_CONVENTIONS_BY_GENRE,
  getGenreConventions,
  isGenreConventionTag,
} from '@/models/genre-conventions';

describe('genre conventions registry', () => {
  it('defines conventions for every GenreFrame', () => {
    const registryKeys = Object.keys(GENRE_CONVENTIONS_BY_GENRE).sort();
    const genreFrames = [...GENRE_FRAMES].sort();
    expect(registryKeys).toEqual(genreFrames);
  });

  it('defines exactly 6 convention entries per genre', () => {
    for (const conventions of Object.values(GENRE_CONVENTIONS_BY_GENRE)) {
      expect(conventions).toHaveLength(6);
      for (const entry of conventions) {
        expect(typeof entry.tag).toBe('string');
        expect(entry.tag.trim().length).toBeGreaterThan(0);
        expect(typeof entry.gloss).toBe('string');
        expect(entry.gloss.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('returns per-genre conventions through the accessor', () => {
    expect(getGenreConventions('THRILLER')).toEqual(
      GENRE_CONVENTIONS_BY_GENRE.THRILLER,
    );
  });

  it('validates convention tags with a type guard', () => {
    const validTag = GENRE_CONVENTIONS_BY_GENRE.MYSTERY[0].tag;
    expect(isGenreConventionTag(validTag)).toBe(true);
    expect(isGenreConventionTag('not_a_real_tag')).toBe(false);
    expect(isGenreConventionTag(null)).toBe(false);
  });

  it('keeps convention tags unique within each genre', () => {
    for (const conventions of Object.values(GENRE_CONVENTIONS_BY_GENRE)) {
      const tags = conventions.map((c) => c.tag);
      expect(new Set(tags).size).toBe(tags.length);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern="genre-conventions" --no-coverage`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/models/genre-conventions.ts` with all 26 genres × 6 conventions from the design doc (`docs/plans/2026-02-27-genre-taxonomy-two-layer-contract.md`, lines 47–254). The file structure:

```typescript
import type { GenreFrame } from './concept-generator.js';

export interface GenreConventionEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_CONVENTIONS_BY_GENRE = {
  ADVENTURE: [
    { tag: 'protagonist_driven_by_external_goal', gloss: 'The protagonist pursues a concrete outer objective' },
    { tag: 'escalating_environmental_danger', gloss: 'The environment itself grows more hostile over time' },
    { tag: 'companion_or_ally_dynamic', gloss: 'Relationships with allies shape the journey' },
    { tag: 'wonder_and_discovery_atmosphere', gloss: 'New places and phenomena evoke awe' },
    { tag: 'physical_competence_tested', gloss: 'The protagonist must prove capable through action' },
    { tag: 'journey_as_transformation', gloss: 'Travel changes the traveler' },
  ],
  // ... all 26 genres from the design doc taxonomy
} as const satisfies Record<GenreFrame, readonly GenreConventionEntry[]>;

export type GenreConventionsByGenre = typeof GENRE_CONVENTIONS_BY_GENRE;
export type GenreConventionTag =
  GenreConventionsByGenre[keyof GenreConventionsByGenre][number]['tag'];

const GENRE_CONVENTION_TAG_SET = new Set<string>(
  Object.values(GENRE_CONVENTIONS_BY_GENRE)
    .flat()
    .map((e) => e.tag),
);

export function isGenreConventionTag(value: unknown): value is GenreConventionTag {
  return typeof value === 'string' && GENRE_CONVENTION_TAG_SET.has(value);
}

export function getGenreConventions(
  genreFrame: GenreFrame
): readonly GenreConventionEntry[] {
  return GENRE_CONVENTIONS_BY_GENRE[genreFrame];
}
```

Use the full taxonomy from the design doc lines 47–254.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern="genre-conventions" --no-coverage`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add src/models/genre-conventions.ts test/unit/models/genre-conventions.test.ts
git commit -m "Add genre conventions registry with 6 conventions per genre"
```

---

### Task 2: Modify Genre Obligations to Entry Type with Gloss + Expand to 6 Tags

**Files:**
- Modify: `src/models/genre-obligations.ts`
- Modify: `test/unit/models/genre-obligations.test.ts`

**Step 1: Update the existing test to expect new shape**

Modify `test/unit/models/genre-obligations.test.ts`:
- Change "3-5 non-empty obligation tags per genre" → "exactly 6 obligation entries per genre"
- Add gloss validation (each entry has `tag: string` and `gloss: string`)
- Update accessor test to use `.tag` access
- Update type guard test to use `.tag` access
- Update uniqueness test to check `entry.tag` across all genres

```typescript
import { GENRE_FRAMES } from '@/models/concept-generator';
import {
  GENRE_OBLIGATION_TAGS_BY_GENRE,
  getGenreObligationTags,
  isGenreObligationTag,
} from '@/models/genre-obligations';

describe('genre obligations registry', () => {
  it('defines obligations for every GenreFrame', () => {
    const registryKeys = Object.keys(GENRE_OBLIGATION_TAGS_BY_GENRE).sort();
    const genreFrames = [...GENRE_FRAMES].sort();
    expect(registryKeys).toEqual(genreFrames);
  });

  it('defines exactly 6 obligation entries per genre', () => {
    for (const obligations of Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)) {
      expect(obligations).toHaveLength(6);
      for (const entry of obligations) {
        expect(typeof entry.tag).toBe('string');
        expect(entry.tag.trim().length).toBeGreaterThan(0);
        expect(typeof entry.gloss).toBe('string');
        expect(entry.gloss.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('returns per-genre entries through the accessor', () => {
    expect(getGenreObligationTags('THRILLER')).toEqual(
      GENRE_OBLIGATION_TAGS_BY_GENRE.THRILLER,
    );
  });

  it('validates obligation tags with a strict type guard', () => {
    const validTag = GENRE_OBLIGATION_TAGS_BY_GENRE.MYSTERY[0].tag;
    expect(isGenreObligationTag(validTag)).toBe(true);
    expect(isGenreObligationTag('not_a_real_tag')).toBe(false);
    expect(isGenreObligationTag(null)).toBe(false);
  });

  it('keeps obligation tags globally unique to avoid ambiguous matching', () => {
    const allTags = Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)
      .flat()
      .map((e) => e.tag);
    const unique = new Set(allTags);
    expect(unique.size).toBe(allTags.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern="genre-obligations" --no-coverage`
Expected: FAIL — old shape is `string[]`, not `{ tag, gloss }[]`

**Step 3: Rewrite `src/models/genre-obligations.ts`**

Transform from flat `string[]` to `GenreObligationEntry[]` with 6 entries per genre. Use the full taxonomy from the design doc lines 258–466.

```typescript
import type { GenreFrame } from './concept-generator.js';

export interface GenreObligationEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_OBLIGATION_TAGS_BY_GENRE = {
  ADVENTURE: [
    { tag: 'call_to_quest', gloss: 'An external summons or discovery launches the journey' },
    { tag: 'threshold_crossing', gloss: 'The protagonist leaves the known world behind' },
    { tag: 'ally_tested_or_won', gloss: 'A companion proves loyalty or is recruited through trial' },
    { tag: 'ordeal_survived', gloss: 'The protagonist endures a defining physical or mental test' },
    { tag: 'treasure_with_cost', gloss: 'The prize is won but at meaningful expense' },
    { tag: 'return_transformed', gloss: 'The protagonist comes back changed by the journey' },
  ],
  // ... all 26 genres from the design doc taxonomy
} as const satisfies Record<GenreFrame, readonly GenreObligationEntry[]>;

export type GenreObligationTagsByGenre = typeof GENRE_OBLIGATION_TAGS_BY_GENRE;
export type GenreObligationTag =
  GenreObligationTagsByGenre[keyof GenreObligationTagsByGenre][number]['tag'];

const GENRE_OBLIGATION_TAG_SET = new Set<string>(
  Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)
    .flat()
    .map((e) => e.tag),
);

export function isGenreObligationTag(value: unknown): value is GenreObligationTag {
  return typeof value === 'string' && GENRE_OBLIGATION_TAG_SET.has(value);
}

export function getGenreObligationTags(
  genreFrame: GenreFrame
): readonly GenreObligationEntry[] {
  return GENRE_OBLIGATION_TAGS_BY_GENRE[genreFrame];
}
```

**IMPORTANT**: The return type of `getGenreObligationTags` changes from `readonly GenreObligationTag[]` to `readonly GenreObligationEntry[]`. All callers must be updated in subsequent tasks.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern="genre-obligations" --no-coverage`
Expected: PASS (all 5 tests)

**Step 5: Commit**

```bash
git add src/models/genre-obligations.ts test/unit/models/genre-obligations.test.ts
git commit -m "Expand genre obligations to 6 entries with glosses"
```

---

### Task 3: Add Cross-Registry Disjointness Test

**Files:**
- Create: `test/unit/models/genre-registries-disjoint.test.ts`

**Step 1: Write the failing test**

```typescript
import { GENRE_CONVENTIONS_BY_GENRE } from '@/models/genre-conventions';
import { GENRE_OBLIGATION_TAGS_BY_GENRE } from '@/models/genre-obligations';

describe('genre convention / obligation disjointness', () => {
  it('has no tag appearing in both conventions and obligations', () => {
    const conventionTags = new Set(
      Object.values(GENRE_CONVENTIONS_BY_GENRE)
        .flat()
        .map((e) => e.tag),
    );
    const obligationTags = new Set(
      Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)
        .flat()
        .map((e) => e.tag),
    );

    const overlap = [...conventionTags].filter((t) => obligationTags.has(t));
    expect(overlap).toEqual([]);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `npm run test:unit -- --testPathPattern="genre-registries-disjoint" --no-coverage`
Expected: PASS (the taxonomies were designed to be disjoint)

**Step 3: Commit**

```bash
git add test/unit/models/genre-registries-disjoint.test.ts
git commit -m "Add cross-registry disjointness test for genre conventions vs obligations"
```

---

### Task 4: Export New Convention Module from Model Index

**Files:**
- Modify: `src/models/index.ts`

**Step 1: Add exports**

After the existing genre-obligations exports (line 263), add:

```typescript
export {
  GENRE_CONVENTIONS_BY_GENRE,
  isGenreConventionTag,
  getGenreConventions,
} from './genre-conventions';
export type {
  GenreConventionEntry,
  GenreConventionsByGenre,
  GenreConventionTag,
} from './genre-conventions';
```

Also update the existing genre-obligations type export to include `GenreObligationEntry`:

```typescript
export type { GenreObligationTagsByGenre, GenreObligationTag, GenreObligationEntry } from './genre-obligations';
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (will likely fail due to callers of `getGenreObligationTags` expecting old shape — see Task 5)

**Step 3: Commit**

```bash
git add src/models/index.ts
git commit -m "Export genre conventions module from models barrel"
```

---

### Task 5: Fix All Callers of `getGenreObligationTags` for New Entry Shape

The return type changed from `readonly string[]` to `readonly GenreObligationEntry[]`. All callers must extract `.tag` from entries.

**Files:**
- Modify: `src/llm/structure-generator.ts` (lines 106-111, 130, 142-144)
- Modify: `src/llm/prompts/structure-prompt.ts` (lines 130-142)

**Step 1: Run typecheck to see all failures**

Run: `npm run typecheck`
Expected: FAIL — type errors where `string[]` is now `GenreObligationEntry[]`

**Step 2: Fix `src/llm/prompts/structure-prompt.ts`**

In `buildGenreObligationsSection()` (line 125-143), change:

```typescript
// OLD (line 130-137):
const obligations = getGenreObligationTags(conceptSpec.genreFrame);
if (obligations.length === 0) { return ''; }
const listed = obligations.map((tag) => `- ${tag}`).join('\n');

// NEW:
const obligations = getGenreObligationTags(conceptSpec.genreFrame);
if (obligations.length === 0) { return ''; }
const listed = obligations.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n');
```

This also improves the prompt — the LLM now sees what each obligation tag means.

**Step 3: Fix `src/llm/structure-generator.ts`**

In `generateStoryStructure()` (line 142-144), change the expected obligations extraction:

```typescript
// OLD (line 142-144):
const expectedGenreObligations = context.conceptSpec
  ? getGenreObligationTags(context.conceptSpec.genreFrame)
  : null;

// NEW:
const expectedGenreObligationEntries = context.conceptSpec
  ? getGenreObligationTags(context.conceptSpec.genreFrame)
  : null;
const expectedGenreObligations = expectedGenreObligationEntries
  ? expectedGenreObligationEntries.map((e) => e.tag)
  : null;
```

The `fetchStructure()` parameter `expectedGenreObligations` (line 58) stays `readonly string[] | null` — it only needs tag strings for the post-validation warning check.

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Run tests**

Run: `npm test --no-coverage`
Expected: PASS (no behavioral change, just shape adaptation)

**Step 6: Commit**

```bash
git add src/llm/prompts/structure-prompt.ts src/llm/structure-generator.ts
git commit -m "Adapt obligation callers to new GenreObligationEntry shape"
```

---

### Task 6: Build Genre Conventions Prompt Section

**Files:**
- Create: `src/llm/prompts/sections/shared/genre-conventions-section.ts`
- Modify: `src/llm/prompts/sections/shared/index.ts`

**Step 1: Create the section builder**

Create `src/llm/prompts/sections/shared/genre-conventions-section.ts`:

```typescript
import type { GenreFrame } from '../../../../models/concept-generator.js';
import { getGenreConventions } from '../../../../models/genre-conventions.js';

export function buildGenreConventionsSection(genreFrame?: GenreFrame): string {
  if (!genreFrame) {
    return '';
  }

  const conventions = getGenreConventions(genreFrame);
  if (conventions.length === 0) {
    return '';
  }

  const listed = conventions.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n');
  return `GENRE CONVENTIONS (${genreFrame} — maintain throughout):
${listed}

These conventions define the genre's atmosphere, character dynamics, and tonal expectations. They are NOT specific scenes — they are persistent creative constraints that every scene should honor.

`;
}
```

**Step 2: Add export to barrel**

In `src/llm/prompts/sections/shared/index.ts` (line 28), add:

```typescript
export { buildGenreConventionsSection } from './genre-conventions-section.js';
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/llm/prompts/sections/shared/genre-conventions-section.ts src/llm/prompts/sections/shared/index.ts
git commit -m "Add genre conventions prompt section builder"
```

---

### Task 7: Thread `genreFrame` Through Context Types

**Files:**
- Modify: `src/llm/context-types.ts` (add `genreFrame?` to `OpeningContext`, `ContinuationContext`, `LorekeeperContext`)
- Modify: `src/llm/prompts/spine-rewrite-prompt.ts` (add `genreFrame?` to `SpineRewriteContext`)
- Modify: `src/engine/generation-context-assembler.ts` (pass `genreFrame` when building contexts)
- Modify: `src/engine/continuation-context-builder.ts` (pass `genreFrame`)

**Step 1: Add `genreFrame` to context interfaces**

In `src/llm/context-types.ts`:
- `OpeningContext` (line 26): add `genreFrame?: GenreFrame;` after `toneAvoid` (line 29). Add `import type { GenreFrame } from '../models/concept-generator.js';`
- `ContinuationContext` (line 42): add `genreFrame?: GenreFrame;` after `toneAvoid` (line 45)
- `LorekeeperContext` (line 100): add `readonly genreFrame?: GenreFrame;` after `toneAvoid` (line 103)

In `src/llm/prompts/spine-rewrite-prompt.ts`:
- `SpineRewriteContext` (line 11): add `readonly genreFrame?: GenreFrame;` after `tone` (line 12). Add `import type { GenreFrame } from '../../models/concept-generator.js';`

**Step 2: Thread `genreFrame` from Story in context assembly**

In `src/engine/generation-context-assembler.ts`:
- Opening context (line 121-131): add `genreFrame: story.conceptSpec?.genreFrame,`
- Opening plan context (line 163-176): add `genreFrame: story.conceptSpec?.genreFrame,`

In `src/engine/continuation-context-builder.ts`:
- Find the `buildContinuationContext` function. Add `genreFrame: story.conceptSpec?.genreFrame,` to the returned object.

**Step 3: Thread `genreFrame` to lorekeeper context**

Search for where `LorekeeperContext` is assembled (in `src/engine/lorekeeper-writer-pipeline.ts`). Add `genreFrame` from the opening/continuation context.

**Step 4: Thread `genreFrame` to spine rewrite context**

Search for where `SpineRewriteContext` is assembled (in `src/engine/spine-deviation-processing.ts` or `src/engine/deviation-handler.ts`). Add `genreFrame: story.conceptSpec?.genreFrame,`.

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (new optional fields don't break existing code)

**Step 6: Run tests**

Run: `npm test --no-coverage`
Expected: PASS

**Step 7: Commit**

```bash
git add src/llm/context-types.ts src/llm/prompts/spine-rewrite-prompt.ts \
  src/engine/generation-context-assembler.ts src/engine/continuation-context-builder.ts \
  src/engine/lorekeeper-writer-pipeline.ts
git commit -m "Thread genreFrame through context types for convention injection"
```

---

### Task 8: Inject Genre Conventions into Structure Prompt

**Files:**
- Modify: `src/llm/prompts/structure-prompt.ts`

**Step 1: Add conventions section to structure prompt**

In `buildStructurePrompt()` (line 180), after `genreObligationsSection` (line 196):

```typescript
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';

// In buildStructurePrompt, after line 196:
const genreConventionsSection = buildGenreConventionsSection(context.conceptSpec?.genreFrame);
```

Then insert `${genreConventionsSection}` in the user prompt (line 201), before the genre obligations section:

```
${genreConventionsSection}${genreObligationsSection}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run tests**

Run: `npm test --no-coverage`
Expected: PASS

**Step 4: Commit**

```bash
git add src/llm/prompts/structure-prompt.ts
git commit -m "Inject genre conventions into structure prompt"
```

---

### Task 9: Inject Genre Conventions into Writer System Prompt

**Files:**
- Modify: `src/llm/prompts/system-prompt-builder.ts` (lines 115-135)

**Step 1: Modify `ToneParams` and `composeCreativeSystemPrompt`**

In `src/llm/prompts/system-prompt-builder.ts`:

Add import:
```typescript
import type { GenreFrame } from '../../models/concept-generator.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
```

Extend `ToneParams` (line 115):
```typescript
export interface ToneParams {
  tone: string;
  toneFeel?: readonly string[];
  toneAvoid?: readonly string[];
  genreFrame?: GenreFrame;
}
```

In `composeCreativeSystemPrompt()` (line 126-135), add conventions injection after tone directive:
```typescript
export function composeCreativeSystemPrompt(toneParams?: ToneParams): string {
  const sections: string[] = [SYSTEM_INTRO];

  if (toneParams) {
    sections.push(buildToneDirective(toneParams.tone, toneParams.toneFeel, toneParams.toneAvoid));
    const conventionsBlock = buildGenreConventionsSection(toneParams.genreFrame);
    if (conventionsBlock) {
      sections.push(conventionsBlock);
    }
  }

  sections.push(CONTENT_POLICY, ...CREATIVE_SECTIONS);
  return sections.join('\n\n');
}
```

**Step 2: Pass `genreFrame` from callers**

The callers of `composeCreativeSystemPrompt` are `buildOpeningSystemPrompt` and `buildContinuationSystemPrompt` (lines 176-186). They just pass through `toneParams`. The caller that builds `ToneParams` is in the writer prompt builders — search for where `buildOpeningSystemPrompt` or `buildContinuationSystemPrompt` is called with tone params. The `genreFrame` will come from the opening/continuation context (added in Task 7).

Find all callers:
```bash
grep -rn "buildOpeningSystemPrompt\|buildContinuationSystemPrompt\|composeCreativeSystemPrompt" src/llm/prompts/
```

Update each caller to pass `genreFrame` in the `ToneParams` object from context.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Run tests**

Run: `npm test --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/llm/prompts/system-prompt-builder.ts
git commit -m "Inject genre conventions into writer system prompt"
```

---

### Task 10: Inject Genre Conventions into Planner Prompt

**Files:**
- Modify: `src/llm/prompts/page-planner-prompt.ts`

**Step 1: Add conventions to planner user message**

In `buildPagePlannerPrompt()` (line 50):

```typescript
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
```

After `spineSection` (line 68), add:
```typescript
const genreConventionsSection = buildGenreConventionsSection(context.genreFrame);
```

Insert `${genreConventionsSection}` in the user prompt (line 73-80), after spine section:
```
${spineSection}${genreConventionsSection}${contextSection}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/llm/prompts/page-planner-prompt.ts
git commit -m "Inject genre conventions into planner prompt"
```

---

### Task 11: Inject Genre Conventions into Lorekeeper Prompt

**Files:**
- Modify: `src/llm/prompts/lorekeeper-prompt.ts`

**Step 1: Add conventions to lorekeeper user message**

In `buildLorekeeperPrompt()` (line 66):

```typescript
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
```

After the spine section in the user prompt (line 237), add genre conventions:
```typescript
const genreConventionsSection = buildGenreConventionsSection(context.genreFrame);
```

Insert in the FULL STORY CONTEXT section (line 237), after spine section:
```
${buildSpineSection(context.spine)}${genreConventionsSection}${npcsSection}...
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/llm/prompts/lorekeeper-prompt.ts
git commit -m "Inject genre conventions into lorekeeper prompt"
```

---

### Task 12: Inject Genre Conventions into Structure Rewrite and Spine Rewrite Prompts

**Files:**
- Modify: `src/llm/prompts/structure-rewrite-prompt.ts`
- Modify: `src/llm/prompts/spine-rewrite-prompt.ts`

**Step 1: Add conventions to structure rewrite prompt**

In `buildStructureRewritePrompt()` (line 93):

```typescript
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
```

After `conceptStakesSection` (line 131-139), add:
```typescript
const genreConventionsSection = buildGenreConventionsSection(context.conceptSpec?.genreFrame);
```

Insert in user prompt (line 151), after concept stakes:
```
${spineSection}${conceptStakesSection}${genreConventionsSection}
```

**Step 2: Add conventions to spine rewrite prompt**

In `buildSpineRewritePrompt()` (line 35):

```typescript
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
```

After the worldSection (line 58-60), add:
```typescript
const genreConventionsSection = buildGenreConventionsSection(context.genreFrame);
```

Insert in user prompt (line 62-78), after world section and before "CURRENT (BROKEN) SPINE":
```
WORLDBUILDING:
${worldSection}

${genreConventionsSection}CURRENT (BROKEN) SPINE:
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Run full tests**

Run: `npm test --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/llm/prompts/structure-rewrite-prompt.ts src/llm/prompts/spine-rewrite-prompt.ts
git commit -m "Inject genre conventions into structure rewrite and spine rewrite prompts"
```

---

### Task 13: Update Genre Obligations Section to Include Glosses in Structure Rewrite

**Files:**
- Modify: `src/llm/prompts/structure-rewrite-prompt.ts`

The structure rewrite prompt currently has requirement #22 referencing obligatory scene tags, but doesn't inject the actual genre obligation contract section. Check whether `buildGenreObligationsSection` is called there. If not, add it. If it is, the Task 5 changes to `buildGenreObligationsSection` already include glosses.

**Step 1: Check and fix**

Search `structure-rewrite-prompt.ts` for `obligatorySceneTag` or `genreObligation`. The output shape already mentions `obligatorySceneTag` in the requirements but may not inject the actual contract list. If missing, add:

```typescript
import { buildGenreObligationsSection } from './structure-prompt.js';

// In buildStructureRewritePrompt, add:
const genreObligationsSection = buildGenreObligationsSection(context.conceptSpec);
```

And insert in the user prompt.

**Step 2: Run typecheck + tests**

Run: `npm run typecheck && npm test --no-coverage`
Expected: PASS

**Step 3: Commit (if changes were needed)**

```bash
git add src/llm/prompts/structure-rewrite-prompt.ts
git commit -m "Add genre obligation contract to structure rewrite prompt"
```

---

### Task 14: Run Full Test Suite and Fix Any Failures

**Step 1: Run full test suite with coverage**

Run: `npm run test:coverage`

**Step 2: Fix any failures**

Most likely sources of failure:
- Test mocks missing `genreFrame` field (optional, so likely fine)
- Prompt snapshot tests expecting old obligation format (tags without glosses)
- Any test that accesses `getGenreObligationTags()` result and expects strings instead of entries

**Step 3: Run typecheck**

Run: `npm run typecheck`

**Step 4: Run lint**

Run: `npm run lint`

**Step 5: Fix any issues and commit**

```bash
git add -A
git commit -m "Fix test suite for two-layer genre contract"
```

---

### Task 15: Final Verification and Cleanup

**Step 1: Run full verification**

```bash
npm run typecheck && npm run lint && npm run test:coverage
```

**Step 2: Verify design doc invariants**

- Every GenreFrame has exactly 6 convention entries ✓ (Task 1 test)
- Every GenreFrame has exactly 6 obligation entries ✓ (Task 2 test)
- Convention tags unique within each genre ✓ (Task 1 test)
- Obligation tags globally unique ✓ (Task 2 test)
- No tag in both registries ✓ (Task 3 test)
- Conventions injected into 6 prompt stages ✓ (Tasks 8-12)
- Obligations include glosses ✓ (Task 5)

**Step 3: Final commit if any cleanup**

```bash
git add -A
git commit -m "Final cleanup for two-layer genre contract implementation"
```
