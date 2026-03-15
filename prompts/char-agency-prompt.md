# Agency Model Prompt (Production Template) — Stage 3

- Prompt builder: `src/llm/prompts/char-agency-prompt.ts`
- Generation file: `src/llm/char-agency-generation.ts`
- Schema file: `src/llm/schemas/char-agency-schema.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts` (`AgencyModel`)
- Context type: `CharAgencyPromptContext` in `char-agency-prompt.ts`

## Purpose

Model the character's decision-making agency: emotion salience, beliefs, desires, intentions, false beliefs, and decision pattern.

**Pipeline position**: Kernel -> Concept -> Character Web -> Stage 1 (Kernel) -> Stage 2 (Tridimensional) -> **Stage 3 (Agency)** -> Stage 4 -> Stage 5 -> Story Preparation

**Why it exists**: A character's profile (what they are) is distinct from their agency (how they decide). This stage bridges who a character is into how they act — giving a writer predictive power over what the character will do next in any situation.

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
| `tridimensionalProfile` | `TridimensionalProfile` | **Stage 2 output** |

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available, the prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`, with stage-specific CONSTRAINT lines. When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields.

### Stage-Specific Constraints

**Concept CONSTRAINT**: "Use conflict engine and value spectrum to calibrate core beliefs and desires. Use protagonist lie to seed false beliefs. Use escape valve to shape what alternatives the character considers when replanning."

**Kernel CONSTRAINT**: "Use the value spectrum to ground core beliefs at a specific moral position. Use the thematic question to shape the character's deepest false belief. Use moral argument to inform the character's decision pattern."

## Messages Sent To Model

### 1) System Message

```text
You are a character psychologist for interactive branching fiction. Your job is to model a character's agency: how strongly emotions steer behavior, what beliefs they act on, what they want right now, which false beliefs distort their choices, and the decision pattern a writer should expect under pressure.

{{CONTENT_POLICY}}

AGENCY MODEL DESIGN GUIDELINES:
- Emotion salience captures HOW MUCH their emotional state changes what they do in the moment.
- Core beliefs are the convictions the character uses to justify action. They should emerge from role, kernel, and tridimensional profile.
- Desires are enduring wants active in the current story situation.
- Current intentions are the concrete actions or near-term pursuits the character is actively trying to carry out now.
- False beliefs are misreadings, blind spots, or incorrect assumptions that create drama and bad decisions.
- Decision pattern explains how this character typically chooses under stress, temptation, uncertainty, or conflict.
- Every field should help a future writer predict this character's next move.
```

### 2) User Message

```text
Generate an agency model for {{characterName}}.

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
- {{fromCharacter}} -> {{toCharacter}}: {{relationshipType}} ({{valence}}) - {{essentialTension}}
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

TRIDIMENSIONAL PROFILE (from Stage 2):
- Physiology: {{tridimensionalProfile.physiology}}
- Sociology: {{tridimensionalProfile.sociology}}
- Psychology: {{tridimensionalProfile.psychology}}
- Core Traits: {{tridimensionalProfile.coreTraits | join '; '}}
- Formative Wound: {{tridimensionalProfile.formativeWound}}
- Protective Mask: {{tridimensionalProfile.protectiveMask}}
- Misbelief: {{tridimensionalProfile.misbelief}}

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}

CONSTRAINT: Use conflict engine and value spectrum to calibrate core beliefs and desires. ...
{{else if conceptSummary}}
CONCEPT:
{{conceptSummary}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}

CONSTRAINT: Use the value spectrum to ground core beliefs at a specific moral position. ...
{{else if kernelSummary}}
STORY KERNEL:
{{kernelSummary}}
{{/if}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}

CONSTRAINT: Calibrate beliefs, knowledge, and false beliefs to world facts. Characters should know and misunderstand things consistent with their position in this specific world.
{{/if}}

{{#if userNotes}}
USER NOTES:
{{userNotes}}
{{/if}}

FIELD INSTRUCTIONS:
- characterName: Must be "{{characterName}}".
- emotionSalience: One of LOW, MEDIUM, HIGH.
- coreBeliefs: Array of the convictions or assumptions this character treats as true.
- desires: Array of enduring wants shaping the character's behavior.
- currentIntentions: Array of immediate, active pursuits this character is trying to carry out now.
- falseBeliefs: Array of incorrect assumptions, blind spots, or misreadings driving conflict.
- decisionPattern: A concise explanation of how this character typically makes choices under pressure.
- focalizationFilter: Object with noticesFirst, systematicallyMisses, misreadsAs — what this character perceives, overlooks, and misinterprets.
- escalationLadder: Array of 3-5 ordered steps showing how this character escalates when blocked, from mildest to most extreme.

GENERATION RULES:
- focalizationFilter must be grounded in the character's wound, training, and social position — not arbitrary.
- escalationLadder must be ordered from mildest to most extreme response. The final step should approach but not cross the moralLine from the kernel.
```

## JSON Response Shape

```json
{
  "characterName": "{{name}}",
  "emotionSalience": "HIGH",
  "coreBeliefs": ["{{conviction the character acts on}}"],
  "desires": ["{{enduring want}}"],
  "currentIntentions": ["{{immediate active pursuit}}"],
  "falseBeliefs": ["{{incorrect assumption driving conflict}}"],
  "decisionPattern": "{{how the character chooses under pressure}}",
  "focalizationFilter": {
    "noticesFirst": "{{what this character perceives first}}",
    "systematicallyMisses": "{{what this character overlooks}}",
    "misreadsAs": "{{what this character misinterprets}}"
  },
  "escalationLadder": ["{{mildest response}}", "{{moderate response}}", "{{most extreme response}}"]
}
```

### Enum Values
- **emotionSalience**: `LOW`, `MEDIUM`, `HIGH`

## Generation Stage

The Agency Model runs as the `GENERATING_CHAR_AGENCY` generation stage.

## LLM Stage Configuration

- Stage model key: `charAgency`
- Uses `runLlmStage()` from `llm-stage-runner.ts`

## Contract Notes

- `CastPipelineInputs` carries both string summaries and typed objects. Typed objects take priority; string summaries are fallback.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts. Each consumer appends its own stage-specific CONSTRAINT line.
- `completedStages` is a sorted, deduplicated array of `CharacterDevStage` values (1-5).
