# Character Development Stages Prompt (Production Template)

- Stage 1 source: `src/llm/prompts/char-kernel-prompt.ts`
- Stage 2 source: `src/llm/prompts/char-tridimensional-prompt.ts`
- Stage 3 source: `src/llm/prompts/char-agency-prompt.ts`
- Stage 4 source: `src/llm/prompts/char-relationships-prompt.ts`
- Stage 5 source: `src/llm/prompts/char-presentation-prompt.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Generation files: `src/llm/char-{kernel,tridimensional,agency,relationships,presentation}-generation.ts`
- Schema files: `src/llm/schemas/char-{kernel,tridimensional,agency,relationships,presentation}-schema.ts`
- Shared context type: `CharacterDevPromptContext` in `char-kernel-prompt.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts`

## Purpose

The character development pipeline takes a character from the character web (role assignment + relationship archetypes) through 5 sequential stages that progressively build a complete, dramaturgically grounded character profile. Each stage depends on all prior stages' output.

**Pipeline position**: Kernel -> Concept -> Character Web -> **Char Dev Stage 1-5** -> Story Preparation

**Why it exists**: A single monolithic "generate a character" prompt produces shallow, inconsistent results. The staged approach forces the LLM to derive each layer from the previous one, creating characters where psychology follows from physiology and sociology, agency follows from profile, relationships follow from agency, and voice follows from everything.

## Shared Context (`CharacterDevPromptContext`)

All 5 stages share a common base context:

| Context Field | Type | Description |
|---|---|---|
| `kernelSummary` | `string?` | Compact text summary of the story kernel (fallback) |
| `conceptSummary` | `string?` | Compact text summary of the concept spec (fallback) |
| `userNotes` | `string?` | Free-text user notes |
| `webContext` | `CharacterWebContext` | Character's role assignment, archetypes, cast dynamics |
| `storyKernel` | `StoryKernel?` | Full typed kernel (~10 fields + valueSpectrum) |
| `conceptSpec` | `ConceptSpec?` | Full typed concept spec (~25 fields) |

Each stage extends this base with prior stage outputs as additional required fields.

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available, each stage prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`, with **stage-specific CONSTRAINT lines** tailored to that stage's dramatic purpose. When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields.

The shared section builders produce:
- **CONCEPT ANALYSIS**: Full 25-field concept spec organized by group (Narrative Identity, Genre Frame, Protagonist, Protagonist Arc, Conflict Engine, World Architecture)
- **THEMATIC KERNEL**: Full kernel with value spectrum (McKee)

## Stage 1: Character Kernel

**LLM stage model**: `charKernel`
**Generation stage**: `GENERATING_CHAR_KERNEL`
**Prompt builder**: `buildCharKernelPrompt()`

### Purpose
Generate the character's dramatic kernel: super-objective, opposition, stakes, constraints, and pressure point.

### Additional Context
None beyond base `CharacterDevPromptContext`.

### Stage-Specific Constraint
"Use conflict engine and protagonist arc to ground the super-objective in the story's central tension. Use protagonist lie/truth/ghost to shape the character's deepest wants and blind spots. Use pressure source to calibrate opposition."

### JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "superObjective": "{{deepest want driving all actions}}",
  "immediateObjectives": ["{{concrete near-term goal}}"],
  "primaryOpposition": "{{main force opposing the super-objective}}",
  "stakes": ["{{what the character stands to lose or gain}}"],
  "constraints": ["{{internal or external limitation}}"],
  "pressurePoint": "{{vulnerability that forces action against own interests}}"
}
```

---

## Stage 2: Tridimensional Profile

**LLM stage model**: `charTridimensional`
**Generation stage**: `GENERATING_CHAR_TRIDIMENSIONAL`
**Prompt builder**: `buildCharTridimensionalPrompt()`

### Purpose
Build a three-dimensional character profile using Lajos Egri's method: physiology (body), sociology (environment), psychology (mind). Each dimension must be derived logically from the kernel.

### Additional Context
- `characterKernel`: Stage 1 output

### Stage-Specific Constraint
"Use genre frame and world architecture to ground physiology and sociology in the setting. Use setting axioms to determine what physical and social traits are possible. Use setting scale to calibrate the character's social reach."

### JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "physiology": "{{body — age, appearance, health, heredity}}",
  "sociology": "{{environment — class, occupation, education, community}}",
  "psychology": "{{mind — morals, temperament, complexes, abilities}}",
  "derivationChain": "{{explicit reasoning from kernel to each dimension}}",
  "coreTraits": ["{{trait1}}", "{{trait2}}", "...5-8 traits"]
}
```

---

## Stage 3: Agency Model

**LLM stage model**: `charAgency`
**Generation stage**: `GENERATING_CHAR_AGENCY`
**Prompt builder**: `buildCharAgencyPrompt()`

### Purpose
Model the character's decision-making agency: replanning policy, emotion salience, beliefs, desires, intentions, false beliefs, and decision pattern.

### Additional Context
- `characterKernel`: Stage 1 output
- `tridimensionalProfile`: Stage 2 output

### Stage-Specific Constraint
"Use conflict engine and value spectrum to calibrate core beliefs and desires. Use protagonist lie to seed false beliefs. Use escape valve to shape what alternatives the character considers when replanning."

### JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "replanningPolicy": "ON_NEW_INFORMATION",
  "emotionSalience": "HIGH",
  "coreBeliefs": ["{{conviction the character acts on}}"],
  "desires": ["{{enduring want}}"],
  "currentIntentions": ["{{immediate active pursuit}}"],
  "falseBeliefs": ["{{incorrect assumption driving conflict}}"],
  "decisionPattern": "{{how the character chooses under pressure}}"
}
```

### Enum Values
- **replanningPolicy**: `NEVER`, `ON_FAILURE`, `ON_NEW_INFORMATION`, `PERIODIC`
- **emotionSalience**: `LOW`, `MEDIUM`, `HIGH`

---

## Stage 4: Deep Relationships

**LLM stage model**: `charRelationships`
**Generation stage**: `GENERATING_CHAR_RELATIONSHIPS`
**Prompt builder**: `buildCharRelationshipsPrompt()`

### Purpose
Deepen the lightweight relationship archetypes from the character web into dramatic, story-usable relationships with history, tension, leverage, secrets, and personal dilemmas.

### Additional Context
- `characterKernel`: Stage 1 output
- `tridimensionalProfile`: Stage 2 output
- `agencyModel`: Stage 3 output
- `otherDevelopedCharacters`: Optional array of sibling `SavedDevelopedCharacter` objects (loaded by the service for stage 4 only)

### Stage-Specific Constraint
"Use conflict axis and protagonist arc to ensure every relationship carries thematic weight. Use protagonist ghost to inform what the focal character projects onto others. Use want-need collision to shape leverage dynamics."

### JSON Response Shape

```json
{
  "relationships": [
    {
      "fromCharacter": "{{name}}",
      "toCharacter": "{{name}}",
      "relationshipType": "ALLY",
      "valence": "AMBIVALENT",
      "numericValence": 1,
      "history": "{{how the relationship became what it is now}}",
      "currentTension": "{{present unstable pressure}}",
      "leverage": "{{what one side can use against the other}}"
    }
  ],
  "secrets": ["{{secret the focal character is keeping}}"],
  "personalDilemmas": ["{{dramatic dilemma the focal character is trapped in}}"]
}
```

### Enum Values
- **relationshipType**: `KIN`, `ALLY`, `RIVAL`, `PATRON`, `CLIENT`, `MENTOR`, `SUBORDINATE`, `ROMANTIC`, `EX_ROMANTIC`, `INFORMANT`
- **valence**: `POSITIVE`, `NEGATIVE`, `AMBIVALENT`
- **numericValence**: integer -5 to 5

---

## Stage 5: Textual Presentation

**LLM stage model**: `charPresentation`
**Generation stage**: `GENERATING_CHAR_PRESENTATION`
**Prompt builder**: `buildCharPresentationPrompt()`

### Purpose
Synthesize all prior stages into concrete textual presentation guidance a writer can immediately use: voice register, speech fingerprint, appearance, knowledge boundaries, and conflict priority.

### Additional Context
- `characterKernel`: Stage 1 output
- `tridimensionalProfile`: Stage 2 output
- `agencyModel`: Stage 3 output
- `deepRelationships`: Stage 4 output

### Stage-Specific Constraint
"Use genre frame and tone to calibrate voice register and vocabulary profile. Use protagonist ghost to shape speech patterns that reveal or conceal trauma. Use setting axioms to ground appearance and knowledge boundaries in the world."

### JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "voiceRegister": "FORMAL",
  "speechFingerprint": {
    "catchphrases": ["{{signature phrase}}"],
    "vocabularyProfile": "{{word-choice profile, formality, jargon}}",
    "sentencePatterns": "{{sentence structure and cadence}}",
    "verbalTics": ["{{filler words, interjections}}"],
    "dialogueSamples": ["{{5-10 example lines in character voice}}"],
    "metaphorFrames": "{{conceptual metaphor systems}}",
    "antiExamples": ["{{2-3 lines the character would never say}}"],
    "discourseMarkers": ["{{turn openers, transitions, closers}}"],
    "registerShifts": "{{how voice changes under stress/intimacy/status}}"
  },
  "appearance": "{{physical presentation grounded in prior stages}}",
  "knowledgeBoundaries": "{{what knows, suspects, misreads, cannot know}}",
  "conflictPriority": "{{what wins when goals conflict}}"
}
```

### Enum Values
- **voiceRegister**: `FORMAL`, `NEUTRAL`, `COLLOQUIAL`, `CEREMONIAL`, `TECHNICAL`, `VULGAR`, `POETIC`

---

## Stage Runner Orchestration

The `character-stage-runner.ts` orchestrates all 5 stages:

1. Validates preconditions (prior stages must be complete)
2. Emits generation stage events (`started`/`completed`)
3. Builds the prompt context by spreading `CastPipelineInputs` (`...inputs`) into the stage-specific context, alongside the character's `webContext` and prior stage outputs
4. Calls the appropriate generation function
5. Returns the updated character with the new stage data and updated `completedStages`

### Stage Dependencies

```
Stage 1 (Kernel)         ← webContext + inputs
Stage 2 (Tridimensional) ← webContext + inputs + characterKernel
Stage 3 (Agency)         ← webContext + inputs + characterKernel + tridimensionalProfile
Stage 4 (Relationships)  ← webContext + inputs + characterKernel + tridimensionalProfile + agencyModel + otherDevelopedCharacters?
Stage 5 (Presentation)   ← webContext + inputs + characterKernel + tridimensionalProfile + agencyModel + deepRelationships
```

## Common Prompt Structure

All 5 stages follow the same user message pattern:

1. `Generate a [stage output] for {{characterName}}.`
2. `CHARACTER ROLE IN CAST:` — assignment details from web context
3. `CAST DYNAMICS:` — from web context
4. `RELATIONSHIP ARCHETYPES:` — from web context (if any)
5. Prior stage outputs (stage-specific, increasing with each stage)
6. `CONCEPT ANALYSIS:` or `CONCEPT:` — full typed section or string fallback
7. `THEMATIC KERNEL:` or `STORY KERNEL:` — full typed section or string fallback
8. `USER NOTES:` — if present
9. `FIELD INSTRUCTIONS:` — stage-specific output field descriptions

## Contract Notes

- `CastPipelineInputs` carries both string summaries and typed objects. Typed objects take priority; string summaries are fallback.
- The service's `deriveInputsFromConcept()` loads the concept and kernel from persistence, populating both forms.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts. Each consumer appends its own stage-specific CONSTRAINT line.
- The `otherDevelopedCharacters` context is only loaded for stage 4 (relationships). The service filters out the focal character from the sibling list.
- `completedStages` is a sorted, deduplicated array of `CharacterDevStage` values (1-5).
- Each stage's generation function uses `runLlmStage()` with the appropriate stage model key, schema, and parser.
