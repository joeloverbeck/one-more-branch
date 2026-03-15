# Tridimensional Profile Prompt (Production Template) — Stage 2

- Prompt builder: `src/llm/prompts/char-tridimensional-prompt.ts`
- Generation file: `src/llm/char-tridimensional-generation.ts`
- Schema file: `src/llm/schemas/char-tridimensional-schema.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts` (`TridimensionalProfile`)
- Context type: `CharTridimensionalPromptContext` in `char-tridimensional-prompt.ts`

## Purpose

Build a three-dimensional character profile using Lajos Egri's method: physiology (body), sociology (environment), psychology (mind). Each dimension must be derived logically from the kernel.

**Pipeline position**: Kernel -> Concept -> Character Web -> Stage 1 (Kernel) -> **Stage 2 (Tridimensional)** -> Stage 3 -> Stage 4 -> Stage 5 -> Story Preparation

**Why it exists**: Egri's method ensures character depth isn't decorative — every physical, social, and psychological detail serves the drama.

## Context Provided

| Context Field | Type | Description |
|---|---|---|
| `kernelSummary` | `string?` | Compact text summary of the story kernel (fallback) |
| `conceptSummary` | `string?` | Compact text summary of the concept spec (fallback) |
| `userNotes` | `string?` | Free-text user notes |
| `worldbuilding` | `string` | Raw worldbuilding prose (geography, cultures, factions, history, magic, technology). Empty string if none provided. |
| `webContext` | `CharacterWebContext` | Character's role assignment, archetypes, cast dynamics |
| `storyKernel` | `StoryKernel?` | Full typed kernel (~10 fields + valueSpectrum) |
| `conceptSpec` | `ConceptSpec?` | Full typed concept spec (~25 fields) |
| `characterKernel` | `CharacterKernel` | **Stage 1 output** |

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available, the prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`, with stage-specific CONSTRAINT lines. When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields.

### Stage-Specific Constraints

**Concept CONSTRAINT**: "Use genre frame and world architecture to ground physiology and sociology in the setting. Use setting axioms to determine what physical and social traits are possible. Use setting scale to calibrate the character's social reach."

**Kernel CONSTRAINT**: "Use the dramatic stance to calibrate the character's psychological tone. Use the value spectrum to inform their moral standards and personal premise."

## Messages Sent To Model

### 1) System Message

```text
You are a character psychologist for interactive branching fiction. Your job is to build a three-dimensional character profile using Lajos Egri's method: physiology (body), sociology (environment), and psychology (mind). Each dimension must be derived logically from the character's kernel — their super-objective, opposition, stakes, constraints, and pressure point — combined with their role in the cast.

{{CONTENT_POLICY}}

TRIDIMENSIONAL PROFILE DESIGN GUIDELINES:
- PHYSIOLOGY: The character's body — age, sex, height, weight, posture, appearance, defects, heredity, health. Choose physical traits that CREATE DRAMATIC FRICTION with their objectives or role. A spy with a conspicuous scar. A warrior with a chronic injury. A seducer with an unsettling feature.
- SOCIOLOGY: The character's environment — class, occupation, education, home life, religion, race, nationality, political affiliation, community standing, amusements, hobbies. These shape HOW the character pursues their super-objective and WHAT they consider acceptable.
- PSYCHOLOGY: The character's mind — moral standards, personal premise, ambition, frustrations, temperament, attitude toward life, complexes, extrovert/introvert/ambivert, abilities, qualities, IQ. The psychology must LOGICALLY FOLLOW from the physiology and sociology — it is the product of the other two dimensions interacting.
- CORE TRAITS: 5-8 defining traits that emerge from the three dimensions. These are the behavioral tendencies a writer would need to portray this character consistently.
- Every detail must serve the drama. No arbitrary traits — each physical, social, and psychological detail should create tension, reveal character, or enable/constrain action.
```

### 2) User Message

```text
Generate a tridimensional profile for {{characterName}}.

CHARACTER ROLE IN CAST:
- Name: {{characterName}}
- Is Protagonist: {{isProtagonist}}
- Story Function: {{storyFunction}}
- Character Depth: {{characterDepth}}
- Narrative Role: {{narrativeRole}}
- Conflict Relationship: {{conflictRelationship}}

CAST DYNAMICS:
{{castDynamicsSummary}}

{{#if relationshipArchetypes}}
RELATIONSHIP ARCHETYPES:
{{#each relationshipArchetypes}}
- {{fromCharacter}} → {{toCharacter}}: {{relationshipType}} ({{valence}}) — {{essentialTension}}
{{/each}}
{{/if}}

CHARACTER KERNEL (from Stage 1):
- Super-Objective: {{characterKernel.superObjective}}
- Immediate Objectives: {{characterKernel.immediateObjectives | join '; '}}
- Primary Opposition: {{characterKernel.primaryOpposition}}
- Stakes: {{characterKernel.stakes | join '; '}}
- Constraints: {{characterKernel.constraints | join '; '}}
- Pressure Point: {{characterKernel.pressurePoint}}
- Moral Line: {{characterKernel.moralLine}}
- Worst Fear: {{characterKernel.worstFear}}

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}

CONSTRAINT: Use genre frame and world architecture to ground physiology and sociology in the setting. ...
{{else if conceptSummary}}
CONCEPT:
{{conceptSummary}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}

CONSTRAINT: Use the dramatic stance to calibrate the character's psychological tone. ...
{{else if kernelSummary}}
STORY KERNEL:
{{kernelSummary}}
{{/if}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}

CONSTRAINT: Ground sociology in the worldbuilding — class systems, occupations, cultural norms, and institutions must reflect the world as described. Use world geography, climate, and resources to inform physiology where relevant.
{{/if}}

{{#if userNotes}}
USER NOTES:
{{userNotes}}
{{/if}}

FIELD INSTRUCTIONS:
- characterName: Must be "{{characterName}}".
- physiology: The character's physical dimension — body, appearance, health, heredity. Choose traits that create dramatic friction.
- sociology: The character's environmental dimension — class, occupation, education, community. These shape how they pursue their super-objective.
- psychology: The character's mental dimension — morals, temperament, complexes, abilities. Must logically follow from physiology + sociology.
- coreTraits: Array of 5-8 defining behavioral traits that emerge from the three dimensions.
- formativeWound: The defining early experience that shaped this character's defenses. 1-2 sentences.
- protectiveMask: The persona this character projects to hide or compensate for their wound. 1 sentence.
- misbelief: The false conclusion the character drew from their wound that distorts their worldview. 1 sentence.

GENERATION RULES:
- formativeWound must generate the protectiveMask and misbelief as logical consequences.
```

## JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "physiology": "{{body — age, appearance, health, heredity}}",
  "sociology": "{{environment — class, occupation, education, community}}",
  "psychology": "{{mind — morals, temperament, complexes, abilities}}",
  "coreTraits": ["{{trait1}}", "{{trait2}}", "...5-8 traits"],
  "formativeWound": "{{defining early experience that shaped defenses}}",
  "protectiveMask": "{{persona projected to hide or compensate for wound}}",
  "misbelief": "{{false conclusion drawn from wound}}"
}
```

## Generation Stage

The Tridimensional Profile runs as the `GENERATING_CHAR_TRIDIMENSIONAL` generation stage.

## LLM Stage Configuration

- Stage model key: `charTridimensional`
- Uses `runLlmStage()` from `llm-stage-runner.ts`

## Contract Notes

- `CastPipelineInputs` carries both string summaries and typed objects. Typed objects take priority; string summaries are fallback.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts. Each consumer appends its own stage-specific CONSTRAINT line.
- `completedStages` is a sorted, deduplicated array of `CharacterDevStage` values (1-5).
