# Enhanced Voice Fingerprint & Character Agency for Entity Decomposer

**Status**: PENDING
**Priority**: Enhancement
**Scope**: Models, LLM schema, entity decomposer prompt/parser, persistence, tests

## Overview

Character voice distinctiveness is critical to scene quality. The current `SpeechFingerprint` schema (catchphrases, vocabularyProfile, sentencePatterns, verbalTics, dialogueSamples) has three gaps identified through external review and validated against the codebase:

1. **No metaphor frames** — characters who conceptualize the world through specific metaphors ("life is war", "relationships are transactions") produce distinctly different language, but the decomposer doesn't extract this.
2. **No anti-examples** — we tell the LLM how a character sounds but never how they do NOT sound, so voice boundaries are soft and the writer can drift.
3. **No discourse markers** — turn-taking patterns ("Look,", "Listen,", "Anyway,") serve conversational management functions distinct from verbal tics ("um", "well") but are currently lumped together.
4. **No register shifts** — how speech changes under stress, formality, or intimacy isn't explicitly captured, even though the writer prompt already asks for emotional filtering.

For character agency, the NPC agenda system (goal/leverage/fear/offScreenBehavior) models **what** characters want but not **how** they decide, **why** at a belief level, or **what wins** when goals conflict. This gap means the writer/agenda resolver improvises decision-making each time, producing inconsistencies across branches.

## Theoretical Basis (Validated)

The new fields draw on well-established frameworks, but adapted for LLM consumption (concrete examples and directives, not academic abstractions):

- **Metaphor frames**: Lakoff & Johnson's conceptual metaphor theory. A character who sees "life as war" produces different language than one who sees "life as a game." Operationalized as a 1-2 sentence description, not a formal taxonomy.
- **Anti-examples**: Negative exemplars are standard in ML training. Showing "how X does NOT sound" creates sharper voice boundaries than positive examples alone. Operationalized as 2-3 concrete lines.
- **Discourse markers**: Distinct from verbal tics in sociolinguistic literature. "Look," as a confrontation opener vs "Listen," as an intimacy marker serve conversational functions, not just fill time. Operationalized as a short list of patterns.
- **Register shifts**: Halliday's register theory adapted to fiction. Not academic categories but concrete descriptions: "formal in public, crude under stress."

## Current Schema

### SpeechFingerprint (src/models/decomposed-character.ts)

```typescript
export interface SpeechFingerprint {
  readonly catchphrases: readonly string[];
  readonly vocabularyProfile: string;
  readonly sentencePatterns: string;
  readonly verbalTics: readonly string[];
  readonly dialogueSamples: readonly string[];
}
```

### DecomposedCharacter (src/models/decomposed-character.ts)

```typescript
export interface DecomposedCharacter {
  readonly name: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly relationships: readonly string[];
  readonly knowledgeBoundaries: string;
  readonly appearance: string;
  readonly rawDescription: string;
}
```

### Downstream Data Flow

Speech fingerprint data flows through two formatters:

1. **`formatSpeechFingerprintForWriter(fingerprint)`** — lightweight, protagonist only. Injected into:
   - `src/llm/prompts/opening-prompt.ts` (line ~99)
   - `src/llm/prompts/continuation-prompt.ts` (line ~212)

2. **`formatDecomposedCharacterForPrompt(char, isProtagonist?)`** — full profile, all characters. Injected into:
   - `src/llm/prompts/lorekeeper-prompt.ts` (line ~37)
   - `src/llm/prompts/agenda-resolver-prompt.ts` (line ~66)
   - `src/llm/prompts/sections/planner/opening-context.ts` (line ~29)
   - `src/llm/prompts/sections/planner/continuation-context.ts` (line ~280)

Updating the two formatters propagates new fields to all six downstream injection points automatically.

---

## Phase 1: Model Changes

### 1a. Extend SpeechFingerprint

**File**: `src/models/decomposed-character.ts`

```typescript
export interface SpeechFingerprint {
  // existing
  readonly catchphrases: readonly string[];
  readonly vocabularyProfile: string;
  readonly sentencePatterns: string;
  readonly verbalTics: readonly string[];
  readonly dialogueSamples: readonly string[];
  // new voice fields
  readonly metaphorFrames: string;
  readonly antiExamples: readonly string[];
  readonly discourseMarkers: readonly string[];
  readonly registerShifts: string;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `metaphorFrames` | string | `''` | Conceptual metaphors this character uses. E.g. "Sees relationships as transactions — loyalty has a price, betrayal is theft." 1-2 sentences. |
| `antiExamples` | string[] | `[]` | 2-3 lines showing how this character does NOT sound. Voice boundary markers. |
| `discourseMarkers` | string[] | `[]` | Conversational management patterns — turn openers, topic shifts, self-correction, closers. 0-5 items. E.g. ["Look,", "Here's the thing—", "End of story."] |
| `registerShifts` | string | `''` | How speech changes in different contexts (stress, formality, intimacy). 1-2 sentences. |

### 1b. Extend DecomposedCharacter

**File**: `src/models/decomposed-character.ts`

```typescript
export interface DecomposedCharacter {
  // existing fields unchanged
  readonly name: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly relationships: readonly string[];
  readonly knowledgeBoundaries: string;
  readonly appearance: string;
  readonly rawDescription: string;
  // new agency fields
  readonly decisionPattern: string;
  readonly coreBeliefs: readonly string[];
  readonly conflictPriority: string;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `decisionPattern` | string | `''` | How this character approaches decisions. E.g. "Calculates risk obsessively, delays action until forced, then commits totally." 1-2 sentences. |
| `coreBeliefs` | string[] | `[]` | 2-3 fundamental beliefs driving behavior. E.g. ["Trust gets you killed", "Power is the only real freedom"]. |
| `conflictPriority` | string | `''` | What wins when goals conflict. E.g. "Self-preservation above loyalty, but will sacrifice everything for her daughter." 1 sentence. |

### 1c. Update formatSpeechFingerprintForWriter()

**File**: `src/models/decomposed-character.ts`

After the existing lines (vocabulary, patterns, catchphrases, tics, samples), append:

```
Metaphor frames: {metaphorFrames}          // if non-empty
Discourse markers: {discourseMarkers}       // if non-empty array
Register shifts: {registerShifts}           // if non-empty
Anti-examples (how they do NOT sound):      // if non-empty array
  "{antiExample1}"
  "{antiExample2}"
```

### 1d. Update formatDecomposedCharacterForPrompt()

**File**: `src/models/decomposed-character.ts`

**In the SPEECH FINGERPRINT block**, add the same four new voice fields as in 1c.

**After Knowledge Boundaries** (before the closing), add:

```
Decision Pattern: {decisionPattern}         // if non-empty
Core Beliefs: {coreBeliefs as bullets}      // if non-empty array
Conflict Priority: {conflictPriority}       // if non-empty
```

---

## Phase 2: JSON Schema

**File**: `src/llm/schemas/entity-decomposer-schema.ts`

### 2a. Add to speechFingerprint properties

```typescript
metaphorFrames: {
  type: 'string',
  description:
    'Conceptual metaphors this character uses to understand the world. ' +
    'E.g. "Sees relationships as transactions — loyalty has a price, betrayal is theft. ' +
    'Treats problems like sieges — patient preparation, then overwhelming force." 1-2 sentences.',
},
antiExamples: {
  type: 'array',
  description:
    'Write 2-3 example lines showing how this character does NOT sound. ' +
    'These are voice boundary markers — they define the edges of the character\'s voice. ' +
    'E.g. if the character is blunt and crude, an anti-example might be a flowery diplomatic line.',
  items: { type: 'string' },
},
discourseMarkers: {
  type: 'array',
  description:
    'Conversational management patterns — how this character opens turns, shifts topics, ' +
    'self-corrects, or closes statements. Distinct from verbal tics (which are filler/habitual). ' +
    'E.g. ["Look,", "Here\'s the thing—", "Bottom line:", "End of story."]. 0-5 items.',
  items: { type: 'string' },
},
registerShifts: {
  type: 'string',
  description:
    'How this character\'s speech changes in different contexts. ' +
    'E.g. "Formal and measured in public, but speech degrades to clipped profanity under stress. ' +
    'Intimate conversations become halting and vulnerable." 1-2 sentences.',
},
```

Add all four to `speechFingerprint.required`.

### 2b. Add to character properties

```typescript
decisionPattern: {
  type: 'string',
  description:
    'How this character approaches decisions and what they prioritize when forced to choose. ' +
    'E.g. "Calculates risk obsessively, delays action until forced, then commits totally." ' +
    '1-2 sentences.',
},
coreBeliefs: {
  type: 'array',
  description:
    '2-3 fundamental beliefs that drive this character\'s behavior. These are the axioms they act on, ' +
    'not aspirational values. E.g. ["Trust gets you killed", "Power is the only real freedom", ' +
    '"Everyone has a price"]. These should feel like things the character would actually say or think.',
  items: { type: 'string' },
},
conflictPriority: {
  type: 'string',
  description:
    'When this character\'s goals conflict, what wins? ' +
    'E.g. "Self-preservation above loyalty, but will sacrifice everything for her daughter." 1 sentence.',
},
```

Add all three to character `required`.

---

## Phase 3: Entity Decomposer Parser

**File**: `src/llm/entity-decomposer.ts`

### 3a. Update parseSpeechFingerprint()

Add defensive defaults for new fields following the existing pattern:

```typescript
metaphorFrames: typeof raw.metaphorFrames === 'string' ? raw.metaphorFrames : '',
antiExamples: Array.isArray(raw.antiExamples)
  ? raw.antiExamples.filter((s): s is string => typeof s === 'string')
  : [],
discourseMarkers: Array.isArray(raw.discourseMarkers)
  ? raw.discourseMarkers.filter((s): s is string => typeof s === 'string')
  : [],
registerShifts: typeof raw.registerShifts === 'string' ? raw.registerShifts : '',
```

### 3b. Update parseCharacter()

Add defensive defaults for new character fields:

```typescript
decisionPattern: typeof raw.decisionPattern === 'string' ? raw.decisionPattern : '',
coreBeliefs: Array.isArray(raw.coreBeliefs)
  ? raw.coreBeliefs.filter((s): s is string => typeof s === 'string')
  : [],
conflictPriority: typeof raw.conflictPriority === 'string' ? raw.conflictPriority : '',
```

---

## Phase 4: Entity Decomposer Prompt

**File**: `src/llm/prompts/entity-decomposer-prompt.ts`

### 4a. Update system prompt SPEECH FINGERPRINT EXTRACTION principle

After the existing items (catchphrases, vocabulary, sentence patterns, verbal tics, dialogue samples), add:

```text
   - Metaphor frames: What conceptual metaphors does this character use to understand the world? (e.g., "sees life as war", "treats relationships as investments"). These shape word choice at a deep level.
   - Anti-examples: Write 2-3 lines showing how this character does NOT sound. If the character is blunt, show a flowery line they'd never say. If formal, show crude speech they'd avoid.
   - Discourse markers: How does this character manage conversations? Turn openers ("Look,"), topic shifts ("Anyway,"), self-corrections ("No, wait—"), closers ("End of story."). Distinct from verbal tics.
   - Register shifts: How does speech change under stress, in formal settings, or in intimate moments?
```

### 4b. Add new decomposition principles

After principle 7 (INFER MISSING DETAILS), add:

```text
8. DECISION PATTERN: How does this character approach decisions? Are they methodical or impulsive, cautious or bold? When forced to choose under pressure, what do they default to? 1-2 sentences.

9. CORE BELIEFS: What 2-3 non-negotiable axioms drive this character? These aren't aspirational values — they're operational truths the character acts on. "Trust gets you killed" is a core belief; "I value honesty" is not (unless they genuinely act on it even when costly).

10. CONFLICT PRIORITY: When this character's goals clash, what wins? Self-preservation vs loyalty, ambition vs love, duty vs desire. One sentence that tells the planner how this character would resolve an impossible choice.
```

### 4c. Update user message instructions

Add to the instructions list:

```text
6. For decision patterns and core beliefs: if the description doesn't state these explicitly, INFER them from personality traits, backstory, and the character's apparent worldview
7. Core beliefs should feel like things the character would actually say or think, not academic descriptions of their psychology
```

---

## Phase 5: Persistence

**File**: `src/persistence/story-repository.ts`

### 5a. Serialization (character mapping)

Add new fields to the speechFingerprint object spread:

```typescript
metaphorFrames: char.speechFingerprint.metaphorFrames,
antiExamples: [...char.speechFingerprint.antiExamples],
discourseMarkers: [...char.speechFingerprint.discourseMarkers],
registerShifts: char.speechFingerprint.registerShifts,
```

Add new character-level fields:

```typescript
decisionPattern: char.decisionPattern,
coreBeliefs: [...char.coreBeliefs],
conflictPriority: char.conflictPriority,
```

### 5b. Deserialization (with backward-compatible defaults)

For speechFingerprint:

```typescript
metaphorFrames: char.speechFingerprint?.metaphorFrames ?? '',
antiExamples: [...(char.speechFingerprint?.antiExamples ?? [])],
discourseMarkers: [...(char.speechFingerprint?.discourseMarkers ?? [])],
registerShifts: char.speechFingerprint?.registerShifts ?? '',
```

For character-level:

```typescript
decisionPattern: char.decisionPattern ?? '',
coreBeliefs: [...(char.coreBeliefs ?? [])],
conflictPriority: char.conflictPriority ?? '',
```

The `??` fallbacks ensure existing `story.json` files (which lack these fields) deserialize without error.

---

## Phase 6: Tests

### 6a. Entity decomposer unit tests

**File**: `test/unit/llm/entity-decomposer.test.ts`

Add new fields to existing mock response fixtures so existing tests don't break.

Add new test cases:
- "parses new voice fields correctly" — metaphorFrames, antiExamples, discourseMarkers, registerShifts
- "parses new agency fields correctly" — decisionPattern, coreBeliefs, conflictPriority
- "defaults new voice fields when missing" — verify backward compat when LLM omits new fields
- "defaults new agency fields when missing" — same for character-level fields

### 6b. Mock updates across test suite

Search all test files for `SpeechFingerprint` and `DecomposedCharacter` mock objects. Add the new fields (with empty defaults) to prevent TypeScript type errors. Key files likely affected:

- `test/unit/llm/entity-decomposer.test.ts`
- `test/unit/models/decomposed-character.test.ts` (if exists)
- Any integration tests that construct `DecomposedCharacter` objects
- Tests for lorekeeper, opening/continuation prompt builders that include decomposed character data

---

## Phase 7: Documentation

**File**: `prompts/entity-decomposer-prompt.md`

Update:
- System message text (add new principles 8-10)
- Speech fingerprint extraction principle (add new sub-items)
- JSON Response Shape (add new fields)
- User message instructions (add new items 6-7)
- Field description table (add new fields with types and defaults)

---

## Backward Compatibility

- All new fields default to empty string or empty array when absent.
- Existing `story.json` files deserialize cleanly via `??` fallbacks in persistence.
- The two format functions skip empty fields (no output for empty string/array), so existing stories produce identical prompt output.
- No migration needed — new fields appear naturally when a new story is created.
- The entity decomposer schema uses `strict: true`, so the LLM will always produce the new fields for new stories.

## Token Budget Impact

Estimated ~30-40% increase in entity decomposer output per character:
- 4 new speech fields: ~100-200 tokens per character
- 3 new agency fields: ~50-100 tokens per character
- Total per character: ~150-300 additional tokens

With 5 NPCs + 1 protagonist: ~900-1800 additional tokens in the decomposer output. Stored once in `story.json` and propagated through formatters to downstream prompts.

The lorekeeper filters characters per scene, so the writer doesn't receive all characters' expanded data — only scene-relevant characters.

## Verification

1. `npm run typecheck` — no type errors
2. `npm test` — all existing tests pass (backward compat verified)
3. `npm run test:unit -- --testPathPattern entity-decomposer` — new tests pass
4. `npm run lint` — no lint errors
5. Manual: create a new story and verify `story.json` includes meaningful new field content
6. Manual: load an existing story (without new fields) and verify it works unchanged
