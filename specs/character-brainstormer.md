# Character Brainstormer Specification

**Status**: ACTIVE

## Overview

A dedicated brainstorming page focused exclusively on generating unique, original, memorable, and distinct character concepts. Unlike the character webs page (which designs cast architecture for existing character ideas), the brainstormer generates fresh character concepts from scratch, grounded in narrative theory techniques that emphasize uniqueness and distinctiveness.

**Pipeline position**: Pre-pipeline brainstorming tool. Sits alongside character webs in the Characters dropdown but produces ephemeral output (not persisted). Generated concepts serve as inspiration for the user to feed into character webs or character profiles.

**Why it exists**: The character webs page produces competent but often functional/generic characters unless the user provides specifically interesting/unique data in the Notes field. There is no tool dedicated to brainstorming a diverse set of truly original character concepts given story constraints (concept, worldbuilding). This fills that gap.

## 1. Data Models

### 1.1 Prompt Input Context

```typescript
// src/llm/prompts/character-brainstormer-prompt.ts

interface CharacterBrainstormerContext {
  readonly conceptSpec: ConceptSpec;
  readonly storyKernel: StoryKernel;
  readonly decomposedWorld: DecomposedWorld | null;
  readonly rawWorldbuilding: string | null;
  readonly existingCharacterNames: readonly ExistingCharacterSummary[];
  readonly userNotes: string;
}

interface ExistingCharacterSummary {
  readonly name: string;
  readonly storyFunction: string | null;   // from CastRoleAssignment
  readonly narrativeRole: string | null;   // from CastRoleAssignment
  readonly superObjective: string | null;  // from CharacterKernel stage 1
}
```

`existingCharacterNames` is populated by loading all character webs that share the selected `sourceConceptId`, then collecting their assignments plus any developed character kernel data. This provides lightweight "avoid similarity to" constraints without dumping full character profiles into the prompt.

### 1.2 LLM Output

```typescript
// src/llm/schemas/character-brainstormer-schema.ts

interface BrainstormedCharacter {
  readonly name: string;
  readonly highConceptPitch: string;
  readonly coreWound: string;
  readonly centralContradiction: string;
  readonly archetypeAndSubversion: string;
  readonly suggestedStoryFunction: string;
  readonly relationshipDynamicHint: string;
  readonly whatMakesThemMemorable: string;
  readonly metaphorFamily: string;
}

interface CharacterBrainstormerResult {
  readonly characters: readonly BrainstormedCharacter[];
  readonly diversityNote: string;
}
```

**Field descriptions**:
- `name`: Character name fitting the worldbuilding context
- `highConceptPitch`: 1-2 sentence elevator pitch containing an inherent tension or surprise
- `coreWound`: A specific formative wound at diagnostic-level specificity (not "she's insecure" but the specific event, the specific response, the specific belief that formed)
- `centralContradiction`: The gap between the character's public persona and private reality, grounded in backstory
- `archetypeAndSubversion`: The recognizable archetype they start from + the specific subversion method applied (inversion, deconstruction, combination, lampshading, or implication) + why
- `suggestedStoryFunction`: How this character might serve the story relative to the protagonist (e.g., ANTAGONIST, RIVAL, ALLY, MENTOR, CATALYST, OBSTACLE, FOIL, TRICKSTER)
- `relationshipDynamicHint`: How this character would naturally relate to other characters or the protagonist — the dramatic friction they create
- `whatMakesThemMemorable`: The single most distinctive quality — the thing a reader would remember and describe to a friend
- `metaphorFamily`: The cognitive domain this character draws all their comparisons from (e.g., "military tactics," "cooking," "gambling," "music theory")

## 2. Route Endpoints

### File: `src/server/routes/character-brainstormer.ts`

**`GET /character-brainstormer`**

Renders the character-brainstormer page with selector data.

```typescript
const [concepts, worldbuildings] = await Promise.all([
  listConcepts(),
  listWorldbuildings(),
]);
res.render('pages/character-brainstormer', {
  title: 'Brainstorm Characters - One More Branch',
  concepts,
  worldbuildings,
});
```

**`POST /character-brainstormer/api/generate`**

Accepts:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conceptId` | `string` | Yes | Selected SavedConcept ID |
| `worldbuildingId` | `string` | Yes | Selected worldbuilding decomposition ID |
| `userNotes` | `string` | No | Optional user-provided content (existing ideas, constraints, preferences) |
| `apiKey` | `string` | Yes | OpenRouter API key |
| `progressId` | `string` | No | Progress tracking ID |

Returns: `{ success: true, result: CharacterBrainstormerResult }`

**Loading existing characters for anti-similarity constraints**:

```typescript
// 1. Load concept and its kernel
const concept = await loadConcept(conceptId);
const kernel = await loadKernel(concept.sourceKernelId);

// 2. Load worldbuilding
const wb = await loadWorldbuildingById(worldbuildingId);

// 3. Load character webs for this concept
const allWebs = await listCharacterWebs();
const conceptWebs = allWebs.filter(w => w.sourceConceptId === conceptId);

// 4. Collect existing character summaries from web assignments + developed data
const existingCharacterSummaries: ExistingCharacterSummary[] = [];
for (const web of conceptWebs) {
  for (const assignment of web.assignments ?? []) {
    // Try to find developed character data for richer constraint
    const devChars = await listDevelopedCharactersByWebId(web.id);
    const devChar = devChars.find(c => c.characterName === assignment.characterName);
    existingCharacterSummaries.push({
      name: assignment.characterName,
      storyFunction: assignment.storyFunction ?? null,
      narrativeRole: assignment.narrativeRole ?? null,
      superObjective: devChar?.characterKernel?.superObjective ?? null,
    });
  }
}
```

### Route Registration

**File: `src/server/routes/index.ts`**

```typescript
import { characterBrainstormerRoutes } from './character-brainstormer';
// ...
router.use('/character-brainstormer', characterBrainstormerRoutes);
```

## 3. Generation Orchestration

### File: `src/llm/character-brainstormer-generation.ts`

Single LLM call. Generation stage: `BRAINSTORMING_CHARACTERS`.

```typescript
export async function generateCharacterBrainstorm(
  context: CharacterBrainstormerContext,
  apiKey: string,
  modelOverride?: string,
  callbacks?: {
    onStageStarted?: (stage: string) => void;
    onStageCompleted?: (stage: string) => void;
  }
): Promise<CharacterBrainstormerResult> {
  callbacks?.onStageStarted?.('BRAINSTORMING_CHARACTERS');

  const messages = buildCharacterBrainstormerPrompt(context);
  const schema = getCharacterBrainstormerSchema();

  const result = await callLlm({
    messages,
    schema,
    apiKey,
    model: modelOverride ?? getModelForStage('BRAINSTORMING_CHARACTERS'),
  });

  const transformed = transformCharacterBrainstormerResponse(result);

  callbacks?.onStageCompleted?.('BRAINSTORMING_CHARACTERS');
  return transformed;
}
```

### Generation Stage Registration

Add `BRAINSTORMING_CHARACTERS` to the `GenerationStage` type in `src/engine/types.ts`.

Add a display name in `public/js/src/01-constants.js`:
```javascript
BRAINSTORMING_CHARACTERS: 'Brainstorming Characters',
```

Add a phrase pool entry for the spinner.

## 4. Prompt Design

### File: `src/llm/prompts/character-brainstormer-prompt.ts`

The prompt encodes narrative theory techniques for generating unique, memorable characters. The key insight from research: generic characters arise from (a) listing traits without causal grounding, (b) using archetypes without subversion, (c) designing characters in isolation rather than as a web of oppositions, and (d) insufficient specificity in wounds and motivations.

### System Message

```text
You are a character concept brainstormer for interactive branching fiction. Your purpose is to generate a diverse set of 6-10 CHARACTER CONCEPTS that are unique, original, memorable, and distinct from each other. These are brainstorming sketches — rich enough to inspire, not full character sheets.

{{CONTENT_POLICY}}

YOUR MANDATE: Every character you generate must pass the DIAGNOSTIC UNIQUENESS TEST — if the description could apply to ten other characters in fiction, it is not specific enough. Generic archetypes without subversion are forbidden. Characters that are merely functional ("the mentor," "the love interest") without distinctive personality are forbidden.

NARRATIVE THEORY TOOLKIT — apply these techniques across the set:

1. CAUSAL CHAIN (Egri): Every psychological trait must trace to a physical or social cause. "She's stubborn" fails. "She refuses to change her mind because she interprets flexibility as betrayal — her mother's constant shifts in loyalty destroyed their family" passes. The causal explanation IS the engine of originality.

2. PRESSURE REVEAL (McKee): Define each character by what they would do under MAXIMUM pressure — not by surface traits. The gap between their public persona and their deep-pressure choice is where memorability lives. A generous person who hoards under extreme stress. A calm leader who becomes vicious when their family is threatened.

3. SPECIFIC WOUND (Weiland/Hurst): Each character's formative wound must be so particular that no other character in fiction shares it. Push through three levels: generic flaw → specific flaw → rooted flaw with a concrete backstory event.

4. PRODUCTIVE CONTRADICTION (Diaz/Seger): Every character must have at least one contradiction between their public persona and private reality. A warrior who secretly writes poetry. A healer who poisoned someone they loved. A truth-teller who built their reputation on one foundational lie.

5. ARCHETYPE + SUBVERSION: Start with a recognizable archetype, then apply ONE subversion method:
   - INVERSION: Flip the core trait (a chosen one who doesn't want to be chosen)
   - DECONSTRUCTION: Ask "what would this really be like?" (a superhero with PTSD)
   - COMBINATION: Merge two archetypes that don't coexist (trickster-mentor)
   - LAMPSHADING: The character acknowledges their archetype then defies it
   - IMPLICATION: Play the archetype straight but add one deeply unexpected detail

6. METAPHOR FAMILY (Matt Bird): Give each character a distinctive cognitive lens — the domain from which they draw all comparisons. A chef sees every situation in terms of recipes and timing. A gambler sees everything as odds and stakes. No two characters in the set share a metaphor family.

ENSEMBLE DIVERSITY RULES — the set as a whole must be diverse:

7. OPPOSITION MATRIX (Truby/McKee): Each character should represent a different answer to the concept's central thematic question. If the theme is "freedom vs. safety," one character embodies freedom-at-all-costs, another safety-at-all-costs, another the compromise, another the one who discovered the question is wrong.

8. TECHNIQUE ROTATION: Deliberately rotate which technique is PRIMARY for each character. One character's uniqueness comes mainly from their contradiction, another from cultural blending, another from wound specificity, another from archetype subversion. Do not use the same primary technique twice in a row.

9. WORLDVIEW FINGERPRINTING: Each character in the set would describe the same event DIFFERENTLY. If two characters would narrate the same scene identically, they are not differentiated enough.

10. FUNCTIONAL DIVERSITY: Vary story functions across the set. Don't generate 5 potential antagonists. Ensure the set includes characters suited for different dramatic roles.

QUALITY GATES:
- Each character must have at least one trait that SURPRISES — that you wouldn't predict from the rest of their description.
- Names must fit the worldbuilding context (cultural naming conventions, era, setting).
- The highConceptPitch must contain an inherent TENSION or SURPRISE — not just a role description.
- coreWound must be a specific EVENT or EXPERIENCE, not an abstract condition.
- centralContradiction must name both the public trait AND the contradicting private reality.
- archetypeAndSubversion must name the base archetype AND the specific subversion method applied.
```

### User Message

```text
Generate 6-10 unique, original, memorable character concepts for this story context.

CONCEPT ANALYSIS:
{{conceptSpec rendered via concept-kernel-sections.ts shared builders}}

THEMATIC KERNEL:
{{storyKernel rendered via concept-kernel-sections.ts shared builders}}

{{#if decomposedWorld}}
WORLD CONTEXT:
{{decomposedWorld rendered via worldbuilding-sections.ts shared builders}}
{{/if}}

{{#if existingCharacterNames.length > 0}}
EXISTING CHARACTERS — DO NOT duplicate or closely resemble these. Generate characters that are DELIBERATELY DIFFERENT in function, personality, wound, contradiction, and archetype:
{{#each existingCharacterNames}}
- {{name}}{{#if storyFunction}} ({{storyFunction}}){{/if}}{{#if narrativeRole}}: {{narrativeRole}}{{/if}}{{#if superObjective}} — drives toward: {{superObjective}}{{/if}}
{{/each}}
{{/if}}

{{#if userNotes}}
USER CREATIVE DIRECTION:
{{userNotes}}

IMPORTANT: The user's notes may contain character ideas they've already developed or are interested in. Use these as ANCHORING CONSTRAINTS — generate characters that complement, contrast with, or fill gaps around these ideas. Do NOT simply repeat or rephrase what the user wrote. Diversify.
{{/if}}

OUTPUT REQUIREMENTS:
- Return JSON matching the schema exactly.
- Generate between 6 and 10 characters.
- Every character must pass the diagnostic uniqueness test.
- The diversityNote should briefly explain which techniques you rotated across the set and how you ensured distinctiveness.
```

## 5. JSON Schema

### File: `src/llm/schemas/character-brainstormer-schema.ts`

```typescript
export function getCharacterBrainstormerSchema(): JsonSchema {
  return {
    type: 'object',
    properties: {
      characters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Character name fitting worldbuilding context' },
            highConceptPitch: { type: 'string', description: '1-2 sentence elevator pitch with inherent tension' },
            coreWound: { type: 'string', description: 'Specific formative wound at diagnostic specificity' },
            centralContradiction: { type: 'string', description: 'Public trait vs. private reality' },
            archetypeAndSubversion: { type: 'string', description: 'Base archetype + subversion method + why' },
            suggestedStoryFunction: { type: 'string', description: 'Dramatic role relative to protagonist' },
            relationshipDynamicHint: { type: 'string', description: 'How they create dramatic friction' },
            whatMakesThemMemorable: { type: 'string', description: 'Single most distinctive quality' },
            metaphorFamily: { type: 'string', description: 'Cognitive domain for comparisons' },
          },
          required: [
            'name',
            'highConceptPitch',
            'coreWound',
            'centralContradiction',
            'archetypeAndSubversion',
            'suggestedStoryFunction',
            'relationshipDynamicHint',
            'whatMakesThemMemorable',
            'metaphorFamily',
          ],
          additionalProperties: false,
        },
        minItems: 6,
        maxItems: 10,
      },
      diversityNote: { type: 'string', description: 'Explanation of techniques used for diversity' },
    },
    required: ['characters', 'diversityNote'],
    additionalProperties: false,
  };
}
```

## 6. UI Design

### File: `src/server/views/pages/character-brainstormer.ejs`

Layout follows existing page patterns (character-webs.ejs, spines.ejs).

**Sections**:

1. **API Key Input** — Password field, stored in `sessionStorage` (same pattern as all other pages)

2. **Configuration Card**:
   - Concept dropdown (`<select>`) — populated server-side from `concepts`
   - Worldbuilding dropdown (`<select>`) — populated server-side from `worldbuildings`
   - Notes textarea — large, optional, with placeholder:
     ```
     Optional: Paste character ideas from previous runs, describe the kind of characters
     you're looking for, set constraints (e.g., "no elves," "all characters must be
     morally ambiguous"), or specify themes to explore.
     ```
   - "Brainstorm Characters" button

3. **Loading Overlay** — Same pattern as other pages, with progress stage display for `BRAINSTORMING_CHARACTERS`

4. **Results Section** (hidden until generation completes):
   - "Copy All as Markdown" button at the top
   - Diversity note display (collapsible)
   - Grid/list of character cards, each showing:
     - **Name** (bold header)
     - **Pitch**: highConceptPitch (italic/emphasized)
     - **Core Wound**: coreWound
     - **Contradiction**: centralContradiction
     - **Archetype**: archetypeAndSubversion
     - **Story Function**: suggestedStoryFunction
     - **Relationship Dynamic**: relationshipDynamicHint
     - **Memorable For**: whatMakesThemMemorable
     - **Metaphor Family**: metaphorFamily
     - "Copy as Markdown" button per card

### Client-Side Controller

**File: `public/js/src/17-character-brainstormer-controller.js`**

Follows the pattern of `16-character-webs-controller.js`:

```javascript
// Key functions:
// - initCharacterBrainstormer() — Called on page load, loads selector options
// - handleBrainstormGenerate() — POST to /api/generate, poll progress, render results
// - renderBrainstormResults(result) — Renders character cards with copy buttons
// - copyCharacterAsMarkdown(character, buttonEl) — Copy single character
// - copyAllCharactersAsMarkdown(characters, buttonEl) — Copy all characters
// - characterToMarkdown(character) — Format single character as Markdown
```

**Markdown format for copy**:

```markdown
## [Name]

**Pitch**: [highConceptPitch]

**Core Wound**: [coreWound]

**Contradiction**: [centralContradiction]

**Archetype & Subversion**: [archetypeAndSubversion]

**Story Function**: [suggestedStoryFunction]

**Relationship Dynamic**: [relationshipDynamicHint]

**Memorable For**: [whatMakesThemMemorable]

**Metaphor Family**: [metaphorFamily]
```

Copy button uses `navigator.clipboard.writeText()` with "Copied!" feedback (1500ms), same pattern as `15a-stage-renderers.js`.

## 7. Header Navigation Update

### File: `src/server/views/partials/header.ejs`

Add "Brainstorm Characters" to the Characters dropdown, before "Character Profiles":

```html
<div class="nav-dropdown__menu">
  <a href="/character-brainstormer" class="nav-dropdown__item<%= cp === '/character-brainstormer' || cp.startsWith('/character-brainstormer') ? ' nav-dropdown__item--active' : '' %>">Brainstorm Characters</a>
  <a href="/characters" class="nav-dropdown__item<%= cp === '/characters' ? ' nav-dropdown__item--active' : '' %>">Character Profiles</a>
  <a href="/character-webs" class="nav-dropdown__item<%= cp === '/character-webs' || cp.startsWith('/character-webs') ? ' nav-dropdown__item--active' : '' %>">Character Webs</a>
</div>
```

## 8. Generation Stage

Add `BRAINSTORMING_CHARACTERS` to:
- `src/engine/types.ts` — `GenerationStage` type
- `public/js/src/01-constants.js` — `STAGE_DISPLAY_NAMES` and `STAGE_PHRASE_POOLS`

```javascript
// In STAGE_DISPLAY_NAMES:
BRAINSTORMING_CHARACTERS: 'Brainstorming Characters',

// In STAGE_PHRASE_POOLS:
BRAINSTORMING_CHARACTERS: [
  'Imagining distinctive souls...',
  'Crafting original personalities...',
  'Brainstorming unique character concepts...',
  'Dreaming up memorable characters...',
],
```

## 9. Model Selection

Add `BRAINSTORMING_CHARACTERS` to `src/config/stage-model.ts` if a per-stage model map exists. Default fallback: `anthropic/claude-sonnet-4.5`.

## 10. Reusable Components

| Component | Source File | Usage |
|-----------|------------|-------|
| `listConcepts()` | `src/persistence/concept-repository.ts` | Populate concept dropdown |
| `loadConcept()` | `src/persistence/concept-repository.ts` | Load selected concept |
| `loadKernel()` | `src/persistence/kernel-repository.ts` | Load concept's source kernel |
| `listWorldbuildings()` | `src/services/worldbuilding-service.ts` | Populate worldbuilding dropdown |
| `loadWorldbuildingById()` | `src/services/worldbuilding-service.ts` | Load selected worldbuilding |
| `listCharacterWebs()` | `src/persistence/character-web-repository.ts` | Find webs for concept |
| `listDevelopedCharactersByWebId()` | `src/persistence/developed-character-repository.ts` | Load developed characters for constraint |
| `buildConceptSection()` | `src/llm/prompts/sections/shared/concept-kernel-sections.ts` | Render concept in prompt |
| `buildKernelSection()` | `src/llm/prompts/sections/shared/concept-kernel-sections.ts` | Render kernel in prompt |
| `formatDecomposedWorldForPrompt()` | `src/models/decomposed-world.ts` | Render worldbuilding in prompt |
| `wrapAsyncRoute()` | `src/server/utils/index.ts` | Express async handler wrapper |
| `parseProgressId()` | `src/server/utils/index.ts` | Progress ID parsing |
| `buildLlmRouteErrorResult()` | `src/server/utils/index.ts` | Error formatting |
| `generationProgressService` | `src/server/services/index.ts` | Progress tracking |
| Copy-to-clipboard pattern | `public/js/src/15a-stage-renderers.js` | `navigator.clipboard.writeText()` |
| `getContentPolicy()` | `src/llm/prompts/content-policy.ts` | NC-21 content policy injection |

## 11. Files to Create

| File | Purpose |
|------|---------|
| `src/server/routes/character-brainstormer.ts` | Route handler (GET / + POST /api/generate) |
| `src/server/views/pages/character-brainstormer.ejs` | EJS template |
| `src/llm/character-brainstormer-generation.ts` | LLM call orchestration |
| `src/llm/prompts/character-brainstormer-prompt.ts` | Prompt builder |
| `src/llm/schemas/character-brainstormer-schema.ts` | JSON Schema + response transformer |
| `public/js/src/17-character-brainstormer-controller.js` | Client-side controller |
| `prompts/character-brainstormer-prompt.md` | Prompt documentation |

## 12. Files to Modify

| File | Change |
|------|--------|
| `src/server/routes/index.ts` | Import and register `characterBrainstormerRoutes` |
| `src/server/views/partials/header.ejs` | Add "Brainstorm Characters" to Characters dropdown |
| `src/engine/types.ts` | Add `BRAINSTORMING_CHARACTERS` to GenerationStage |
| `public/js/src/01-constants.js` | Add stage display name and phrase pool |
| `public/js/app.js` | Regenerate via `node scripts/concat-client-js.js` |

## 13. Key Invariants

- **Ephemeral output**: Brainstormed characters are NEVER saved to file. They exist only in the HTTP response and the rendered UI.
- **No persistence model**: No repository, no saved entity type. This is purely generate-and-display.
- **Iterative via notes**: The user's iteration mechanism is the notes textarea — copy results, paste back, regenerate.
- **Anti-similarity**: When existing characters exist for the selected concept, they are injected as lightweight constraints (name + function + narrative role + super objective).
- **API key security**: Never persisted to disk, only in browser session storage.

## 14. Prompt Logging

Like all LLM calls, the brainstormer logs its prompt payload to `logs/MM-DD-YYYY/prompts.jsonl` via `logPrompt()`. Non-fatal.

## 15. Verification Plan

1. **Build**: `npm run build` succeeds
2. **Typecheck**: `npm run typecheck` passes
3. **Lint**: `npm run lint` passes
4. **Format**: `npm run format` on all new files
5. **Manual test**:
   - Navigate to Characters dropdown → "Brainstorm Characters" link visible
   - Page loads with concept and worldbuilding dropdowns populated
   - Select concept + worldbuilding, enter API key, click "Brainstorm Characters"
   - Loading overlay shows with `BRAINSTORMING_CHARACTERS` stage
   - 6-10 character cards render with all fields populated
   - Each card's "Copy as Markdown" button works (clipboard + "Copied!" feedback)
   - "Copy All" button copies all characters
   - Paste copied content into notes textarea, regenerate → different/diversified set
   - Test with existing characters for the concept → verify anti-similarity text appears in prompt log
6. **Unit tests**: Prompt builder produces correct messages, schema transformer handles valid/edge responses, route handler validates inputs
7. **Client JS**: `node scripts/concat-client-js.js` succeeds, `npm run test:client` passes

## Appendix: Research Foundation

The prompt design is grounded in the following narrative theory frameworks (full research synthesis available in the plan file):

| Technique | Source | Key Insight |
|-----------|--------|-------------|
| Causal Chain | Lajos Egri, *The Art of Dramatic Writing* | Physiology → sociology → psychology as causally linked; specificity in the causal chain produces uniqueness |
| Pressure Reveal | Robert McKee, *Story* and *Character* | True character is revealed by choices under maximum pressure, not surface traits |
| Specific Wound | K.M. Weiland, *Creating Character Arcs* | The specificity of the wound determines the originality of the character |
| Productive Contradiction | Junot Diaz, Linda Seger | Contradictions create unpredictability, humanity, inner conflict, and depth simultaneously |
| Archetype + Subversion | NowNovel, K.M. Weiland, multiple | 5 methods: inversion, deconstruction, combination, lampshading, implication |
| Metaphor Family | Matt Bird (Creative Penn) | Each character draws comparisons from a unique cognitive domain |
| Opposition Matrix | John Truby, Robert McKee | Characters designed as a web of thematic oppositions, not in isolation |
| Worldview Fingerprinting | F.J. Talley, multiple | Each character interprets the same event differently |
| Ensemble Diversity | Linda Seger, Jami Gold | Spider-Verse principle: shared archetype differentiated by coping, humor, aesthetic |
| Diagnostic Uniqueness Test | Multiple practitioners | If it could describe ten other characters, it's not specific enough |
