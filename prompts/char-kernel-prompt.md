# Character Kernel Prompt (Production Template) — Stage 1

- Prompt builder: `src/llm/prompts/char-kernel-prompt.ts`
- Generation file: `src/llm/char-kernel-generation.ts`
- Schema file: `src/llm/schemas/char-kernel-schema.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts` (`CharacterKernel`)
- Shared context type: `CharacterDevPromptContext` in `char-kernel-prompt.ts`

## Purpose

Generate the character's dramatic kernel: super-objective, opposition, stakes, constraints, and pressure point. This is the foundational stage — all subsequent stages derive from the kernel.

**Pipeline position**: Kernel -> Concept -> Character Web -> **Char Dev Stage 1 (Kernel)** -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Story Preparation

**Why it exists**: The kernel defines what a character wants at the deepest level, what stands in their way, and where they're most vulnerable. Without a clear dramatic kernel, downstream stages (profile, agency, relationships, voice) have no anchor and tend to produce generic, unfocused characters.

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

No prior stage outputs — this is Stage 1.

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available, the prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`, with stage-specific CONSTRAINT lines. When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields.

The shared section builders produce:
- **CONCEPT ANALYSIS**: Full 25-field concept spec organized by group (Narrative Identity, Genre Frame, Protagonist, Protagonist Arc, Conflict Engine, World Architecture)
- **THEMATIC KERNEL**: Full kernel with value spectrum (McKee)

### Stage-Specific Constraints

**Concept CONSTRAINT**: "Use conflict engine and protagonist arc to ground the super-objective in the story's central tension. Use protagonist lie/truth/ghost to shape the character's deepest wants and blind spots. Use pressure source to calibrate opposition."

**Kernel CONSTRAINT**: "Align the super-objective with the value at stake. Use the value spectrum to position the character morally. Use the thematic question to shape the character's core internal conflict."

## Messages Sent To Model

### 1) System Message

```text
You are a character psychologist for interactive branching fiction. Your job is to analyze a character's role within their cast and generate their dramatic kernel: the super-objective that drives them, the opposition they face, the stakes that make it matter, the constraints that limit them, and the pressure point that could break them.

{{CONTENT_POLICY}}

CHARACTER KERNEL DESIGN GUIDELINES:
- The super-objective is the character's DEEPEST want — the thing that drives all their actions, even when they don't realize it.
- Immediate objectives are concrete, near-term goals the character is actively pursuing. They should logically flow from the super-objective but be specific enough to generate scenes.
- Primary opposition is the main force standing between the character and their super-objective. It can be a person, institution, circumstance, or internal conflict.
- Stakes must feel personal and consequential. Abstract stakes ("the world will suffer") are weaker than personal ones ("she'll lose the only person who ever believed in her").
- Constraints are the rules the character plays by — moral codes, physical limits, social obligations, secrets they must keep. These create dramatic friction.
- The pressure point is the specific vulnerability that, when exploited, forces the character to act against their own interests or reveal their true nature. Every interesting character has one.
- Consider how this character's kernel creates dramatic tension with other cast members based on their roles and relationships.
```

### 2) User Message

```text
Generate a character kernel for {{characterName}}.

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

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}

CONSTRAINT: Use conflict engine and protagonist arc to ground the super-objective in the story's central tension. ...
{{else if conceptSummary}}
CONCEPT:
{{conceptSummary}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}

CONSTRAINT: Align the super-objective with the value at stake. ...
{{else if kernelSummary}}
STORY KERNEL:
{{kernelSummary}}
{{/if}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}

CONSTRAINT: Ground the super-objective and opposition in the world's power structures and realities. Use worldbuilding facts to determine what resources, institutions, and forces are available to the character.
{{/if}}

{{#if userNotes}}
USER NOTES:
{{userNotes}}
{{/if}}

FIELD INSTRUCTIONS:
- characterName: Must be "{{characterName}}".
- superObjective: The character's overarching dramatic goal — the deepest want driving all their actions.
- immediateObjectives: Array of concrete near-term goals the character is actively pursuing.
- primaryOpposition: The main force standing between the character and their super-objective.
- stakes: Array of what the character stands to lose or gain.
- constraints: Array of internal or external limitations restricting the character.
- pressurePoint: The specific vulnerability that forces the character to act against their interests when pressed.
- moralLine: The line this character will not cross — including personal costs they refuse to pay, even for their super-objective. 1 sentence.
- worstFear: What would psychologically destroy this character. 1 sentence.
```

## JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "superObjective": "{{deepest want driving all actions}}",
  "immediateObjectives": ["{{concrete near-term goal}}"],
  "primaryOpposition": "{{main force opposing the super-objective}}",
  "stakes": ["{{what the character stands to lose or gain}}"],
  "constraints": ["{{internal or external limitation}}"],
  "pressurePoint": "{{vulnerability that forces action against own interests}}",
  "moralLine": "{{the line this character will not cross}}",
  "worstFear": "{{what would psychologically destroy this character}}"
}
```

## Generation Stage

The Character Kernel runs as the `GENERATING_CHAR_KERNEL` generation stage.

## LLM Stage Configuration

- Stage model key: `charKernel`
- Uses `runLlmStage()` from `llm-stage-runner.ts`

## Contract Notes

- `CastPipelineInputs` carries both string summaries and typed objects. Typed objects take priority; string summaries are fallback.
- The service's `deriveInputsFromConcept()` loads the concept and kernel from persistence, populating both forms.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts. Each consumer appends its own stage-specific CONSTRAINT line.
- `completedStages` is a sorted, deduplicated array of `CharacterDevStage` values (1-5).
- Each stage's generation function uses `runLlmStage()` with the appropriate stage model key, schema, and parser.
