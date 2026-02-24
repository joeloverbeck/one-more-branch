# Genre Taxonomy Expansion Implementation Plan

**Status**: COMPLETED

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand `GENRE_FRAMES` from 16 to 26 genres to cover missing narrative modes identified by genre theory research.

**Architecture:** Purely additive change to the `GENRE_FRAMES` const array in `concept-generator.ts` and the parallel descriptions array in `concept-prompt-shared.ts`. All downstream code (type guards, JSON schemas, parsers, prompts) auto-derives from the array via TypeScript inference and spread operators.

**Tech Stack:** TypeScript strict mode, Jest for testing

---

### Task 1: Update the test to expect 26 genres (RED)

**Files:**
- Modify: `test/unit/concept-generator-types.test.ts:45`

**Step 1: Update the genre count assertion**

Change line 45 from:
```typescript
expect(GENRE_FRAMES).toHaveLength(16);
```
to:
```typescript
expect(GENRE_FRAMES).toHaveLength(26);
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --testPathPattern=concept-generator-types`
Expected: FAIL — `Expected length: 26, Received length: 16`

---

### Task 2: Expand the GENRE_FRAMES array (GREEN)

**Files:**
- Modify: `src/models/concept-generator.ts:8-25`

**Step 1: Replace the GENRE_FRAMES array with the expanded 26-genre list (alphabetized)**

```typescript
export const GENRE_FRAMES = [
  'ADVENTURE',
  'COSMIC_HORROR',
  'CYBERPUNK',
  'DARK_COMEDY',
  'DRAMA',
  'DYSTOPIAN',
  'ESPIONAGE',
  'FABLE',
  'FANTASY',
  'GOTHIC',
  'GRIMDARK',
  'HISTORICAL',
  'HORROR',
  'LITERARY',
  'MAGICAL_REALISM',
  'MYSTERY',
  'MYTHIC',
  'NOIR',
  'PICARESQUE',
  'POST_APOCALYPTIC',
  'ROMANCE',
  'SATIRE',
  'SCI_FI',
  'SURREAL',
  'THRILLER',
  'WESTERN',
] as const;
```

**Step 2: Run the test to verify it passes**

Run: `npm run test:unit -- --testPathPattern=concept-generator-types`
Expected: PASS — all assertions green including the new length check

---

### Task 3: Update prompt taxonomy descriptions to match new genres

**Files:**
- Modify: `src/llm/prompts/concept-prompt-shared.ts:11-28`

**Step 1: Replace the genreFrame descriptions array**

The descriptions array passed to `buildEnumGuidance` must be in the same order as `GENRE_FRAMES` (now alphabetized). Replace the existing array with:

```typescript
buildEnumGuidance('genreFrame', GENRE_FRAMES, [
  'Physical peril, exotic locations, and protagonist resourcefulness.',
  'Incomprehensible reality, insignificance of humanity, knowledge as madness.',
  'Low-life and high tech; street survival against corporate megastructures.',
  'Gallows humor and absurd irony amid genuinely dire stakes.',
  'Interpersonal and social conflict realism.',
  'Systemic collapse and controlled oppression.',
  'Deception, cover identities, and loyalty-versus-mission tension.',
  'Moral allegory with symbolic clarity.',
  'Mythic or magical rule-bound worlds.',
  'Decay, obsession, and oppressive atmosphere.',
  'Moral nihilism where right action is impossible or futile.',
  'Real-period settings with era-specific customs, constraints, and dilemmas.',
  'Fear, dread, and destabilization.',
  'Character interiority and social nuance focus.',
  'Mundane world where the impossible is treated as ordinary.',
  'Investigation and hidden truth recovery.',
  'Archetypal struggle and legend-scale stakes.',
  'Moral ambiguity, corruption, and fatalism.',
  'Episodic rogue journey through satirical social exposure.',
  'Collapsed civilization, survival, and rebuilding amid ruins.',
  'Intimacy, attachment, and relational stakes.',
  'Societal critique through exaggeration or irony.',
  'Speculative systems and technological consequences.',
  'Dream-logic, symbolic dislocation, altered reality.',
  'Sustained danger and tightening pressure.',
  'Frontier law, territory, and legacy conflict.',
])
```

**Step 2: Run the test suite to verify nothing breaks**

Run: `npm run test:unit -- --testPathPattern=concept-generator-types`
Expected: PASS

**Step 3: Run typecheck to confirm no type errors**

Run: `npm run typecheck`
Expected: Clean — no errors

---

### Task 4: Run full test suite and verify build

**Step 1: Run full unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 2: Run full build**

Run: `npm run build`
Expected: Clean build, no errors

**Step 3: Commit**

```bash
git add src/models/concept-generator.ts src/llm/prompts/concept-prompt-shared.ts test/unit/concept-generator-types.test.ts
git commit -m "Expand GENRE_FRAMES from 16 to 26 genres

Add ADVENTURE, COSMIC_HORROR, CYBERPUNK, DARK_COMEDY, ESPIONAGE,
GRIMDARK, HISTORICAL, MAGICAL_REALISM, PICARESQUE, POST_APOCALYPTIC.
Alphabetize the array and update prompt taxonomy descriptions."
```

## Outcome

- Completion date: 2026-02-24
- Implemented changes:
  - Expanded `GENRE_FRAMES` from 16 to 26 in `src/models/concept-generator.ts` with alphabetized ordering.
  - Updated `genreFrame` taxonomy guidance descriptions in `src/llm/prompts/concept-prompt-shared.ts` to match the new enum order.
  - Updated the enum count assertion to 26 in `test/unit/concept-generator-types.test.ts`.
- Deviations from original plan:
  - The targeted Jest invocation used `--testPathPatterns` because `--testPathPattern` is deprecated; full unit suite ran successfully as part of that command.
- Verification results:
  - `npm run test:unit` passed.
  - `npm run typecheck` passed.
  - `npm run build` passed.
