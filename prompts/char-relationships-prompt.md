# Deep Relationships Prompt (Production Template) — Stage 4

- Prompt builder: `src/llm/prompts/char-relationships-prompt.ts`
- Generation file: `src/llm/char-relationships-generation.ts`
- Schema file: `src/llm/schemas/char-relationships-schema.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts` (`DeepRelationshipResult`, `CastRelationship`)
- Context type: `CharRelationshipsPromptContext` in `char-relationships-prompt.ts`

## Purpose

Deepen the lightweight relationship archetypes from the character web into dramatic, story-usable relationships with history, tension, leverage, secrets, and personal dilemmas.

**Pipeline position**: Kernel -> Concept -> Character Web -> Stage 1 (Kernel) -> Stage 2 (Tridimensional) -> Stage 3 (Agency) -> **Stage 4 (Relationships)** -> Stage 5 -> Story Preparation

**Why it exists**: The character web's relationship archetypes are sketches — a type, a valence, and one line of tension. This stage converts them into relationships with dramatic weight: shared history, unstable present dynamics, leverage asymmetries, and secrets that could detonate during the story.

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
| `agencyModel` | `AgencyModel` | **Stage 3 output** |
| `otherDevelopedCharacters` | `SavedDevelopedCharacter[]?` | Sibling characters already developed (loaded by service for stage 4 only) |

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available, the prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`, with stage-specific CONSTRAINT lines. When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields.

### Stage-Specific Constraints

**Concept CONSTRAINT**: "Use conflict axis and protagonist arc to ensure every relationship carries thematic weight. Use protagonist ghost to inform what the focal character projects onto others. Use want-need collision to shape leverage dynamics."

**Kernel CONSTRAINT**: "Use the value spectrum to position each relationship at a distinct point of moral tension. Use the thematic question to seed secrets and dilemmas that force the character to confront the story's central argument."

## Messages Sent To Model

### 1) System Message

```text
You are a character psychologist for interactive branching fiction. Your job is to deepen a character's social web into dramatic, story-usable relationships with history, tension, leverage, and pressure-bearing secrets.

{{CONTENT_POLICY}}

DEEP RELATIONSHIPS DESIGN GUIDELINES:
- Start from the lightweight relationship archetypes, but do not stop at labels. Convert them into concrete, playable dynamics.
- Relationships should emerge from the character's kernel, tridimensional profile, and agency model. A character's goals, fears, blind spots, and decision habits should all affect how they relate to others.
- history should explain how the relationship became what it is now.
- currentTension should capture the present unstable pressure in the relationship.
- leverage should identify what one side can use against the other right now.
- numericValence must be between -5 and 5 and should match the stated valence.
- Secrets and personal dilemmas should belong to the focal character and intensify future scene possibilities.
- When counterpart characters have already been developed, use that information to keep cross-character dynamics coherent and specific.
```

### 2) User Message

```text
Generate deep relationships for {{characterName}}.

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
- Derivation Chain: {{tridimensionalProfile.derivationChain}}
- Core Traits: {{tridimensionalProfile.coreTraits | join '; '}}
- Formative Wound: {{tridimensionalProfile.formativeWound}}
- Misbelief: {{tridimensionalProfile.misbelief}}

AGENCY MODEL (from Stage 3):
- Replanning Policy: {{agencyModel.replanningPolicy}}
- Emotion Salience: {{agencyModel.emotionSalience}}
- Core Beliefs: {{agencyModel.coreBeliefs | join '; '}}
- Desires: {{agencyModel.desires | join '; '}}
- Current Intentions: {{agencyModel.currentIntentions | join '; '}}
- False Beliefs: {{agencyModel.falseBeliefs | join '; '}}
- Decision Pattern: {{agencyModel.decisionPattern}}
- Escalation Ladder: {{agencyModel.escalationLadder | join '; '}}

{{#if otherDevelopedCharacters}}
OTHER DEVELOPED CHARACTERS:
{{#each otherDevelopedCharacters}}
- {{characterName}}
  Super-objective: {{characterKernel.superObjective}}
  Core traits: {{tridimensionalProfile.coreTraits | join '; '}}
  Core beliefs: {{agencyModel.coreBeliefs | join '; '}}
  False beliefs: {{agencyModel.falseBeliefs | join '; '}}
{{/each}}
{{/if}}

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}

CONSTRAINT: Use conflict axis and protagonist arc to ensure every relationship carries thematic weight. ...
{{else if conceptSummary}}
CONCEPT:
{{conceptSummary}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}

CONSTRAINT: Use the value spectrum to position each relationship at a distinct point of moral tension. ...
{{else if kernelSummary}}
STORY KERNEL:
{{kernelSummary}}
{{/if}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}

CONSTRAINT: Ground relationship dynamics in the world's social structures, political factions, and cultural norms. Use worldbuilding to determine what alliances, hierarchies, and taboos shape how characters relate.
{{/if}}

{{#if userNotes}}
USER NOTES:
{{userNotes}}
{{/if}}

FIELD INSTRUCTIONS:
- relationships: Array of full CastRelationship entries for the focal character's most dramatically important ties.
- fromCharacter and toCharacter: Use character names exactly as established.
- relationshipType: One of KIN, ALLY, RIVAL, PATRON, CLIENT, MENTOR, SUBORDINATE, ROMANTIC, EX_ROMANTIC, INFORMANT.
- valence: One of POSITIVE, NEGATIVE, AMBIVALENT.
- numericValence: Number from -5 to 5 inclusive.
- history: Brief explanation of the relationship's past.
- currentTension: Brief explanation of the unstable present pressure in the relationship.
- leverage: What one side can currently use against the other.
- ruptureTriggers: Array of 1-3 specific events or revelations that would shatter this relationship.
- repairMoves: Array of 1-3 specific actions that could mend this relationship after damage.
- secrets: Array of secrets the focal character is keeping.
- personalDilemmas: Array of dramatic dilemmas the focal character is currently trapped in.
- Do not use alternate field names such as dilemmas.

GENERATION RULES:
- ruptureTriggers must be concrete events, not abstract conditions — things that could happen in a scene.
- repairMoves must be concrete actions available to the characters, not meta-descriptions.
```

## JSON Response Shape

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
      "leverage": "{{what one side can use against the other}}",
      "ruptureTriggers": ["{{specific event that would shatter this relationship}}"],
      "repairMoves": ["{{specific action that could mend this relationship}}"]
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

## Generation Stage

The Deep Relationships stage runs as the `GENERATING_CHAR_RELATIONSHIPS` generation stage.

## LLM Stage Configuration

- Stage model key: `charRelationships`
- Uses `runLlmStage()` from `llm-stage-runner.ts`

## Contract Notes

- `CastPipelineInputs` carries both string summaries and typed objects. Typed objects take priority; string summaries are fallback.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts. Each consumer appends its own stage-specific CONSTRAINT line.
- The `otherDevelopedCharacters` context is only loaded for stage 4 (relationships). The service filters out the focal character from the sibling list.
- `completedStages` is a sorted, deduplicated array of `CharacterDevStage` values (1-5).
