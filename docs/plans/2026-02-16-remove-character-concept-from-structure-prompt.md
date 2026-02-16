# Remove Redundant CHARACTER CONCEPT from Structure Prompt — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the redundant CHARACTER CONCEPT section from the structure prompt, since decomposed character profiles already contain the protagonist.

**Architecture:** Remove `characterConcept` from `StructureContext` interface and all code that passes or uses it in the structure prompt pipeline. Update tests and docs to reflect the change.

**Tech Stack:** TypeScript, Jest

---

### Task 1: Update `StructureContext` interface and prompt template

**Files:**
- Modify: `src/llm/prompts/structure-prompt.ts`

**Step 1: Remove `characterConcept` from the `StructureContext` interface**

In `src/llm/prompts/structure-prompt.ts`, remove the `characterConcept: string;` line from the `StructureContext` interface (line 14). The interface should become:

```typescript
export interface StructureContext {
  worldbuilding: string;
  tone: string;
  npcs?: readonly Npc[];
  startingSituation?: string;
  spine?: StorySpine;
  decomposedCharacters?: readonly DecomposedCharacter[];
  decomposedWorld?: DecomposedWorld;
}
```

**Step 2: Remove `CHARACTER CONCEPT:` block from user prompt template**

In `buildStructurePrompt()`, replace the user prompt template opening (lines 153-157):

```typescript
// BEFORE
const userPrompt = `Generate a story structure before the first page.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${characterSection}...
```

With:

```typescript
// AFTER
const userPrompt = `Generate a story structure before the first page.

${worldSection}${characterSection}...
```

Remove the `CHARACTER CONCEPT:` literal and the `${context.characterConcept}` interpolation entirely.

**Step 3: Remove `CHARACTER CONCEPT:` from few-shot user example**

In `STRUCTURE_FEW_SHOT_USER` (lines 24-32), remove the `CHARACTER CONCEPT:` section. Change from:

```typescript
const STRUCTURE_FEW_SHOT_USER = `Generate a story structure before the first page.

CHARACTER CONCEPT:
A disgraced city guard seeking redemption

WORLDBUILDING:
A plague-ridden port city ruled by merchant houses and secret tribunals

TONE/GENRE: grim political fantasy`;
```

To:

```typescript
const STRUCTURE_FEW_SHOT_USER = `Generate a story structure before the first page.

WORLDBUILDING:
A plague-ridden port city ruled by merchant houses and secret tribunals

TONE/GENRE: grim political fantasy`;
```

**Step 4: Update REQUIREMENTS item 4**

In the REQUIREMENTS section, change item 4 from:

```
4. Reflect the character concept in the protagonist's journey, conflicts, and opportunities.
```

To:

```
4. Reflect the protagonist (first character profile) in the protagonist's journey, conflicts, and opportunities.
```

**Step 5: Run typecheck to identify compile errors**

Run: `npm run typecheck`
Expected: Errors in `src/engine/story-service.ts` (passes `characterConcept`) and `test/unit/llm/structure-generator.test.ts` (context has `characterConcept`). These are fixed in subsequent tasks.

---

### Task 2: Update call site in story-service.ts

**Files:**
- Modify: `src/engine/story-service.ts`

**Step 1: Remove `characterConcept` from the context object**

In `story-service.ts`, find the `generateStoryStructure()` call (around line 101). Remove the `characterConcept: story.characterConcept,` line from the context object:

```typescript
// BEFORE
const structureResult = await generateStoryStructure(
  {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs,
    startingSituation: story.startingSituation,
    spine: story.spine,
    decomposedCharacters: story.decomposedCharacters,
    decomposedWorld: story.decomposedWorld,
  },
  options.apiKey
);
```

```typescript
// AFTER
const structureResult = await generateStoryStructure(
  {
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs,
    startingSituation: story.startingSituation,
    spine: story.spine,
    decomposedCharacters: story.decomposedCharacters,
    decomposedWorld: story.decomposedWorld,
  },
  options.apiKey
);
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Remaining errors only in test files.

---

### Task 3: Update structure-prompt unit tests

**Files:**
- Modify: `test/unit/llm/prompts/structure-prompt.test.ts`

**Step 1: Remove `characterConcept` from `baseContext`**

Change:

```typescript
const baseContext = {
  characterConcept: 'A retired smuggler forced back into one final run',
  worldbuilding: 'An archipelago where each island is ruled by rival tide cults.',
  tone: 'stormy maritime thriller',
};
```

To:

```typescript
const baseContext = {
  worldbuilding: 'An archipelago where each island is ruled by rival tide cults.',
  tone: 'stormy maritime thriller',
};
```

This applies to BOTH `baseContext` definitions in the file (lines 17-21 and lines 131-135).

**Step 2: Rewrite the "includes character concept, worldbuilding, and tone" test**

Replace the test at line 31-38:

```typescript
it('includes worldbuilding and tone in the user prompt', () => {
  const messages = buildStructurePrompt(baseContext);
  const lastUser = getUserMessages(messages).at(-1) ?? '';

  expect(lastUser).toContain(baseContext.worldbuilding);
  expect(lastUser).toContain(`TONE/GENRE: ${baseContext.tone}`);
});
```

**Step 3: Add test — no CHARACTER CONCEPT section in output**

```typescript
it('does not include a CHARACTER CONCEPT section', () => {
  const messages = buildStructurePrompt(baseContext);
  const lastUser = getUserMessages(messages).at(-1) ?? '';

  expect(lastUser).not.toContain('CHARACTER CONCEPT:');
});
```

**Step 4: Add test — decomposed characters appear when provided**

```typescript
it('includes decomposed character profiles when provided', () => {
  const contextWithChars = {
    ...baseContext,
    decomposedCharacters: [
      {
        name: 'Kael the Smuggler',
        coreTraits: ['cunning', 'loyal'],
        motivations: 'Escape the past',
        protagonistRelationship: null,
        knowledgeBoundaries: 'Knows smuggling routes',
        decisionPattern: 'Acts on instinct',
        coreBeliefs: ['Freedom above all'],
        conflictPriority: 'Self-preservation',
        appearance: 'Weathered face, salt-stained coat',
        rawDescription: 'A retired smuggler',
        speechFingerprint: {
          catchphrases: [],
          vocabularyProfile: 'Nautical slang',
          sentencePatterns: 'Short, clipped',
          verbalTics: [],
          dialogueSamples: [],
          metaphorFrames: '',
          antiExamples: [],
          discourseMarkers: [],
          registerShifts: '',
        },
      },
    ],
  };

  const messages = buildStructurePrompt(contextWithChars);
  const lastUser = getUserMessages(messages).at(-1) ?? '';

  expect(lastUser).toContain('CHARACTERS (decomposed profiles):');
  expect(lastUser).toContain('Kael the Smuggler');
});
```

**Step 5: Add test — character section omitted when no characters and no NPCs**

```typescript
it('omits character section when no decomposed characters and no NPCs', () => {
  const messages = buildStructurePrompt(baseContext);
  const lastUser = getUserMessages(messages).at(-1) ?? '';

  expect(lastUser).not.toContain('CHARACTERS');
  expect(lastUser).not.toContain('NPCS');
});
```

**Step 6: Run tests**

Run: `npm test -- --testPathPattern='structure-prompt.test'`
Expected: All tests pass.

---

### Task 4: Update structure-generator unit tests

**Files:**
- Modify: `test/unit/llm/structure-generator.test.ts`

**Step 1: Remove `characterConcept` from context object**

At line 141-145, change:

```typescript
const context = {
  characterConcept: 'A disgraced guard trying to clear their name.',
  worldbuilding: 'A plague-ridden harbor city controlled by merchant tribunals.',
  tone: 'grim political fantasy',
};
```

To:

```typescript
const context = {
  worldbuilding: 'A plague-ridden harbor city controlled by merchant tribunals.',
  tone: 'grim political fantasy',
};
```

**Step 2: Update assertion that checked characterConcept**

At line 201, change:

```typescript
expect(messages[messages.length - 1]?.content).toContain(context.characterConcept);
```

To:

```typescript
expect(messages[messages.length - 1]?.content).toContain(context.worldbuilding);
```

(The worldbuilding assertion on line 202 already checks this, so alternatively just remove line 201 entirely.)

**Step 3: Run tests**

Run: `npm test -- --testPathPattern='structure-generator.test'`
Expected: All tests pass.

---

### Task 5: Run full typecheck and test suite

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors. If there are remaining errors from other test files that construct `StructureContext` with `characterConcept`, fix those by removing the field.

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/llm/prompts/structure-prompt.ts src/engine/story-service.ts test/unit/llm/prompts/structure-prompt.test.ts test/unit/llm/structure-generator.test.ts
git commit -m "Remove redundant CHARACTER CONCEPT section from structure prompt"
```

---

### Task 6: Update prompt documentation

**Files:**
- Modify: `prompts/structure-prompt.md`

**Step 1: Remove CHARACTER CONCEPT from documented template**

In the "2) User Message" section, remove:

```
CHARACTER CONCEPT:
{{characterConcept}}
```

And add before the worldbuilding section:

```
{{#if decomposedCharacters.length}}
CHARACTERS (decomposed profiles):
{{formattedDecomposedCharacters}}
{{/if}}
```

**Step 2: Update the notes at the bottom**

Ensure the note about "The structure generator receives decomposed character profiles" is still present and accurate. Remove any mention of `characterConcept` if present.

**Step 3: Commit**

```bash
git add prompts/structure-prompt.md
git commit -m "Update structure prompt docs to reflect CHARACTER CONCEPT removal"
```
