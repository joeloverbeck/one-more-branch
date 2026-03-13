# Character Contextualizer Prompt (Production Template)

- Source: `src/llm/prompts/character-contextualizer-prompt.ts`
- Generation file: `src/llm/character-contextualizer.ts`
- Schema file: `src/llm/schemas/character-contextualizer-schema.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/decomposed-character.ts` (`DecomposedCharacter`, `DecomposedRelationship`), `src/models/standalone-decomposed-character.ts` (`StandaloneDecomposedCharacter`)

## Purpose

Post-decomposition thematic positioning and protagonist relationship assignment. Takes pre-analyzed standalone character profiles (from the character decomposer) and determines each character's thematic stance relative to the story's central argument, plus structured protagonist relationships for NPCs.

**Pipeline position**: Character Decomposer (per-character) -> **Character Contextualizer** -> Entity Decomposer (legacy) / Structure Generator

**Why it exists**: The character decomposer produces standalone profiles without story-level context (no thematic stance, no protagonist relationships). This stage adds the story-specific layer by analyzing how each character positions relative to the spine's dramatic question and value at stake.

## Context Provided

| Context Field | Type | Description |
|---|---|---|
| `characters` | `StandaloneDecomposedCharacter[]` | Pre-analyzed character profiles (protagonist first) |
| `protagonistIndex` | `number` | Index of the protagonist in the characters array |
| `spine` | `StorySpine` | Story spine with dramatic question, need/want, antagonistic force |
| `tone` | `string` | Tone/genre string |
| `toneFeel` | `string[]?` | Target feel keywords (optional) |
| `toneAvoid` | `string[]?` | Words/moods to avoid (optional) |
| `startingSituation` | `string?` | Initial scene context (optional) |
| `conceptSpec` | `ConceptSpec?` | Full typed concept spec (~25 fields) |
| `storyKernel` | `StoryKernel?` | Full typed kernel (~10 fields + valueSpectrum) |

## Messages Sent To Model

### 1) System Message

```text
You are a Character Contextualizer for an interactive branching story engine. You receive pre-analyzed character profiles and story context. Your job is to determine each character's thematic stance and relationship to the protagonist.

{{CONTENT_POLICY}}

CONTEXTUALIZATION PRINCIPLES:

1. THEMATIC STANCE: For each character, state how they position relative to the story's thematic argument/value at stake. Capture whether they reinforce, resist, complicate, or evolve against the core thesis. One sentence.

2. PROTAGONIST RELATIONSHIP: For each NPC, produce a structured relationship object describing their dynamic with the protagonist: valence (-5 to +5), dynamic label (mentor, rival, ally, etc.), 1-2 sentence history, current tension, and leverage. Set to null for the protagonist's own entry.

3. USE EXISTING PROFILES: The character profiles have already been decomposed with speech fingerprints, traits, beliefs, etc. Do NOT re-analyze those. Focus ONLY on thematic stance and protagonist relationship.

4. STORY CONTEXT ALIGNMENT: Ground thematic stances in the spine's dramatic question and the kernel's value at stake. NPC relationships should create friction with or support for the antagonistic force.
```

### 2) User Message

```text
Determine the thematic stance and protagonist relationships for the following characters in the context of this story.

CHARACTER PROFILES:
{{#each characters}}
{{formatStandaloneCharacterSummary(character)}} {{isProtagonist ? '(PROTAGONIST)' : '(NPC)'}}
{{/each}}

STORY SPINE:
Central dramatic question: {{spine.centralDramaticQuestion}}
Protagonist need: {{spine.protagonistNeedVsWant.need}}
Protagonist want: {{spine.protagonistNeedVsWant.want}}
Need-want dynamic: {{spine.protagonistNeedVsWant.dynamic}}
Antagonistic force: {{spine.primaryAntagonisticForce.description}}
Pressure mechanism: {{spine.primaryAntagonisticForce.pressureMechanism}}
Character arc type: {{spine.characterArcType}}

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}
{{/if}}

{{#if startingSituation}}
STARTING SITUATION:
{{startingSituation}}
{{/if}}

INSTRUCTIONS:
1. Return characters in the SAME ORDER as provided above
2. The protagonist's protagonistRelationship MUST be null
3. Each NPC MUST have a non-null protagonistRelationship
4. Thematic stances should reflect each character's relationship to the story's central dramatic question and value at stake
5. NPC relationships should create productive narrative tension — not every NPC is an ally or enemy
```

## JSON Response Shape

```json
{
  "characters": [
    {
      "name": "{{character name — must match input exactly}}",
      "thematicStance": "{{how this character positions relative to the story's thematic argument. 1 sentence.}}",
      "protagonistRelationship": null
    },
    {
      "name": "{{NPC name}}",
      "thematicStance": "{{thematic stance. 1 sentence.}}",
      "protagonistRelationship": {
        "valence": 3,
        "dynamic": "{{mentor|rival|ally|target|dependency|protector|adversary|etc.}}",
        "history": "{{1-2 sentences of relationship history}}",
        "currentTension": "{{1-2 sentences of current tension}}",
        "leverage": "{{1 sentence: what one holds over the other}}"
      }
    }
  ]
}
```

- `characters` array must match the input order exactly (protagonist first).
- `protagonistRelationship` is `null` for the protagonist, non-null for all NPCs.
- `valence` is a number from -5 (hostile) to +5 (devoted), 0 = neutral.
- The generation file merges contextualization results back into `StandaloneDecomposedCharacter` objects to produce full `DecomposedCharacter` objects with `thematicStance` and `protagonistRelationship`.

## Generation Stage

The Character Contextualizer runs as part of the entity decomposition pipeline.

## LLM Stage Configuration

- Stage model key: `characterContextualizer`
- Uses `withRetry()` + `withModelFallback()` directly (not `runLlmStage()`)

## Contract Notes

- Input characters are `StandaloneDecomposedCharacter` objects (no `thematicStance` or `protagonistRelationship`).
- Output is `DecomposedCharacter[]` — the same profiles with `thematicStance` and `protagonistRelationship` merged in.
- `parseProtagonistRelationship()` coerces `valence` from string/number, clamps to -5..+5, defaults missing fields to empty strings or 0.
- If the LLM returns a different count of characters than provided, the parser throws `CONTEXTUALIZATION_PARSE_ERROR`.
