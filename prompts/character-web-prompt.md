# Character Web Prompt (Production Template)

- Source: `src/llm/prompts/character-web-prompt.ts`
- Generator source: `src/llm/character-web-generation.ts`
- Output schema source: `src/llm/schemas/character-web-schema.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts` (`CastRoleAssignment`, `RelationshipArchetype`, `CastPipelineInputs`)

## Purpose

The Character Web prompt is the first LLM call in the character-building pipeline. It designs the full cast architecture for a story: assigning dramatic roles to each character, sketching lightweight relationship archetypes between character pairs, and producing a cast dynamics summary that describes the dramatic pressure system the cast creates.

**Pipeline position**: Kernel -> Concept -> **Character Web** -> Character Dev Stages (1-5) -> Story Preparation (Entity Decomposition -> Structure -> Pages)

**Why it exists**: Stories need a deliberate cast design where every character serves a specific dramatic function. Without explicit role assignment and relationship sketching, LLM-generated casts tend toward generic archetypes with redundant functions. The character web ensures each character creates unique dramatic friction.

## Context Provided

| Context Field | Type | Description |
|---|---|---|
| `kernelSummary` | `string?` | Compact text summary of the story kernel (fallback when typed object unavailable) |
| `conceptSummary` | `string?` | Compact text summary of the concept spec (fallback when typed object unavailable) |
| `userNotes` | `string?` | Free-text user notes for cast design guidance |
| `worldbuilding` | `string` | Raw worldbuilding prose (geography, cultures, factions, history, magic, technology). Empty string if none provided. |
| `storyKernel` | `StoryKernel?` | Full typed kernel object (~10 fields + valueSpectrum) |
| `conceptSpec` | `ConceptSpec?` | Full typed concept spec (~25 fields) |

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available (derived from the source concept and its linked kernel), the prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`:

**CONCEPT ANALYSIS section** (from ConceptSpec) includes:
- Narrative Identity: oneLineHook, elevatorParagraph, playerFantasy, whatIfQuestion, ironicTwist
- Genre Frame: genreFrame, genreSubversion
- Protagonist: role, coreCompetence, coreFlaw, actionVerbs
- Protagonist Arc (Weiland): protagonistLie, protagonistTruth, protagonistGhost, wantNeedCollisionSketch
- Conflict Engine: coreConflictLoop, conflictAxis, conflictType, pressureSource, stakesPersonal, stakesSystemic, deadlineMechanism, incitingDisruption, escapeValve
- World Architecture: settingAxioms, constraintSet, keyInstitutions, settingScale

**THEMATIC KERNEL section** (from StoryKernel) includes:
- dramaticThesis, valueAtStake, opposingForce, directionOfChange, conflictAxis, dramaticStance, thematicQuestion, moralArgument
- Value Spectrum (McKee): positive, contrary, contradictory, negationOfNegation

**Cast-specific CONSTRAINT**: "Use conflict engine to assign cast roles that create maximum dramatic friction. Use protagonist arc to design foils and mirrors. Use genre frame to calibrate character archetypes. Use value spectrum to distribute moral positions across the cast."

When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields for backward compatibility.

## Messages Sent To Model

### 1) System Message

```text
You are a cast architect for interactive branching fiction. Your job is to analyze the story's thematic foundation and design a character web: assigning cast roles with dramatic functions, sketching lightweight relationship archetypes between characters, and summarizing the cast dynamics that will drive the story.

{{CONTENT_POLICY}}

CHARACTER WEB DESIGN GUIDELINES:
- Every character must serve a clear story function relative to the protagonist.
- Every character must be a being with agency — capable of intention, decision-making, and purposeful action. Locations, environmental features, abstract forces, and inanimate objects are worldbuilding elements, NOT characters. A non-human entity (sentient artifact, supernatural being, AI) qualifies only if it can independently make decisions and act on them.
- isProtagonist must be true for exactly one character.
- narrativeRole is a one-sentence description of what this character DOES in the story — their dramatic purpose.
- conflictRelationship is a one-sentence description of how this character creates, escalates, or resolves conflict for the protagonist.
- Relationship archetypes are LIGHTWEIGHT: a type, a valence, and one line of essential tension. These are not full relationship profiles — they're dramatic sketches.
- essentialTension captures the core dramatic friction in the relationship in a single sentence.
- castDynamicsSummary is a paragraph describing how the cast as a whole creates dramatic pressure, what alliances and oppositions exist, and what fault lines could produce interesting branching.
- Aim for 3-8 characters total depending on story complexity.
- Every pair of characters with a meaningful dramatic relationship should have a relationship archetype entry.
```

### 2) User Message

```text
Generate a character web for the following story setup.

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}

CONSTRAINT: Use conflict engine to assign cast roles that create maximum dramatic friction. ...
{{else if conceptSummary}}
CONCEPT:
{{conceptSummary}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}

CONSTRAINT: Use value spectrum to position each cast member at a distinct moral coordinate. ...
{{else if kernelSummary}}
STORY KERNEL:
{{kernelSummary}}
{{/if}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}

CONSTRAINT: Ground character names, social positions, and occupations in the worldbuilding. Use world facts to determine what kinds of characters are plausible and what roles exist in this setting.
{{/if}}

{{#if userNotes}}
USER NOTES:
{{userNotes}}
{{/if}}

FIELD INSTRUCTIONS:
- assignments: Array of cast role assignments (each must be a being with agency). Each must have:
  - characterName (a being with agency — never a location, object, or environmental feature), isProtagonist, storyFunction, characterDepth, narrativeRole, conflictRelationship
- relationshipArchetypes: Array of relationship sketches between character pairs. Each must have:
  - fromCharacter, toCharacter, relationshipType, valence, essentialTension
- castDynamicsSummary: A paragraph describing overall cast dynamics, alliances, oppositions, and dramatic fault lines.
```

## JSON Response Shape

```json
{
  "assignments": [
    {
      "characterName": "{{name}}",
      "isProtagonist": true,
      "storyFunction": "CATALYST",
      "characterDepth": "ROUND",
      "narrativeRole": "{{one sentence — dramatic purpose}}",
      "conflictRelationship": "{{one sentence — conflict creation/resolution}}"
    }
  ],
  "relationshipArchetypes": [
    {
      "fromCharacter": "{{name}}",
      "toCharacter": "{{name}}",
      "relationshipType": "ALLY",
      "valence": "AMBIVALENT",
      "essentialTension": "{{one sentence — core dramatic friction}}"
    }
  ],
  "castDynamicsSummary": "{{paragraph describing cast dynamics}}"
}
```

### Enum Values

- **storyFunction**: `ANTAGONIST`, `RIVAL`, `ALLY`, `MENTOR`, `CATALYST`, `OBSTACLE`, `FOIL`, `TRICKSTER`, `INNOCENT`
- **characterDepth**: `FLAT`, `ROUND`
- **relationshipType**: `KIN`, `ALLY`, `RIVAL`, `PATRON`, `CLIENT`, `MENTOR`, `SUBORDINATE`, `ROMANTIC`, `EX_ROMANTIC`, `INFORMANT`
- **valence**: `POSITIVE`, `NEGATIVE`, `AMBIVALENT`

## Response Validation

The parser (`character-web-generation.ts`) validates:
- `assignments` must be a non-empty array
- Each assignment must have a non-empty `characterName` (must be a being with agency — the prompt explicitly excludes locations, objects, and environmental features), boolean `isProtagonist`, valid `storyFunction` and `characterDepth` enums, and string `narrativeRole` and `conflictRelationship`
- `relationshipArchetypes` must be an array (may be empty)
- Each archetype is validated via `isRelationshipArchetype()` type guard (checks enum values)
- `castDynamicsSummary` must be a non-empty string

The service layer (`character-web-service.ts`) additionally validates:
- Exactly one assignment must have `isProtagonist === true`

## Generation Stage

The Character Web runs as the `GENERATING_CHARACTER_WEB` generation stage.

```
GENERATING_CHARACTER_WEB started
GENERATING_CHARACTER_WEB completed
```

## LLM Stage Configuration

- Stage model key: `characterWeb`
- Prompt type: `characterWeb`
- Uses `runLlmStage()` from `llm-stage-runner.ts`

## Downstream Usage

The character web output is persisted as a `SavedCharacterWeb` and feeds into:
- **Character Dev Pipeline** (stages 1-5): Each character's `webContext` (assignment + archetypes + dynamics summary) is passed to all 5 development stage prompts
- **Story Preparation**: Via `toDecomposedCharacters()`, fully developed characters are converted to `DecomposedCharacter[]` for the entity decomposition/structure pipeline. Characters not yet fully developed fall back to a web-only conversion.

## Contract Notes

- `CastPipelineInputs` carries both string summaries (`kernelSummary`, `conceptSummary`), typed objects (`storyKernel`, `conceptSpec`), and `worldbuilding` (raw prose, empty string if not provided). Typed objects take priority; string summaries are fallback.
- The service's `deriveInputsFromConcept()` loads the concept and kernel from persistence, populating both string summaries and typed objects.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts.
