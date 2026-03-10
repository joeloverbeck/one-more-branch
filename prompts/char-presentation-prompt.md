# Textual Presentation Prompt (Production Template) — Stage 5

- Prompt builder: `src/llm/prompts/char-presentation-prompt.ts`
- Generation file: `src/llm/char-presentation-generation.ts`
- Schema file: `src/llm/schemas/char-presentation-schema.ts`
- Stage runner: `src/llm/character-stage-runner.ts`
- Service: `src/services/character-web-service.ts`
- Shared section builders: `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- Model types: `src/models/character-pipeline-types.ts` (`TextualPresentation`, `SpeechFingerprint`)
- Context type: `CharPresentationPromptContext` in `char-presentation-prompt.ts`

## Purpose

Synthesize all prior stages into concrete textual presentation guidance a writer can immediately use: voice register, speech fingerprint, appearance, knowledge boundaries, and conflict priority.

**Pipeline position**: Kernel -> Concept -> Character Web -> Stage 1 (Kernel) -> Stage 2 (Tridimensional) -> Stage 3 (Agency) -> Stage 4 (Relationships) -> **Stage 5 (Presentation)** -> Story Preparation

**Why it exists**: A character can be deeply developed internally but still feel generic in prose if the writer lacks specific voice and appearance guidance. This stage converts the accumulated psychological and social profile into writer-ready directives — speech patterns, vocabulary, physical tells, and knowledge limits.

## Context Provided

| Context Field | Type | Description |
|---|---|---|
| `kernelSummary` | `string?` | Compact text summary of the story kernel (fallback) |
| `conceptSummary` | `string?` | Compact text summary of the concept spec (fallback) |
| `userNotes` | `string?` | Free-text user notes |
| `webContext` | `CharacterWebContext` | Character's role assignment, archetypes, cast dynamics |
| `storyKernel` | `StoryKernel?` | Full typed kernel (~10 fields + valueSpectrum) |
| `conceptSpec` | `ConceptSpec?` | Full typed concept spec (~25 fields) |
| `characterKernel` | `CharacterKernel` | **Stage 1 output** |
| `tridimensionalProfile` | `TridimensionalProfile` | **Stage 2 output** |
| `agencyModel` | `AgencyModel` | **Stage 3 output** |
| `deepRelationships` | `DeepRelationshipResult` | **Stage 4 output** |

### Context Enrichment (ConceptSpec + StoryKernel)

When typed `conceptSpec` and `storyKernel` objects are available, the prompt builds curated sections using shared section builders from `concept-kernel-sections.ts`, with stage-specific CONSTRAINT lines. When typed objects are unavailable, the prompt falls back to `kernelSummary` and `conceptSummary` string fields.

### Stage-Specific Constraints

**Concept CONSTRAINT**: "Use genre frame and tone to calibrate voice register and vocabulary profile. Use protagonist ghost to shape speech patterns that reveal or conceal trauma. Use setting axioms to ground appearance and knowledge boundaries in the world."

**Kernel CONSTRAINT**: "Use the dramatic stance to set the overall voice tone (comic, romantic, tragic, ironic). Use the value spectrum to inform what the character argues for in dialogue."

## Messages Sent To Model

### 1) System Message

```text
You are a character psychologist for interactive branching fiction. Your job is to synthesize a character's full build into textual presentation guidance a writer can immediately use: voice register, speech fingerprint, appearance, knowledge boundaries, and conflict priority.

{{CONTENT_POLICY}}

TEXTUAL PRESENTATION DESIGN GUIDELINES:
- Voice register is the broad tonal lane the character defaults to: formal, neutral, colloquial, ceremonial, technical, vulgar, or poetic.
- Speech fingerprint must be specific enough that a writer can reliably produce distinct dialogue without drifting into generic voice.
- Dialogue samples should sound like this exact character in action, not generic exposition.
- Anti-examples should define the edges of the voice by showing lines this character would never say in this way.
- Appearance should emphasize details that a writer can surface naturally in scene, especially details that reinforce role, psychology, status, or tension.
- Knowledge boundaries must clearly separate what this character knows, suspects, misreads, and cannot know.
- Conflict priority must state what wins when loyalties, fears, duties, desires, and survival pressures collide.
- Every field should synthesize the prior stages. Do not invent a presentation layer that ignores the kernel, profile, agency, or relationship pressures.
```

### 2) User Message

```text
Generate textual presentation guidance for {{characterName}}.

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

TRIDIMENSIONAL PROFILE (from Stage 2):
- Physiology: {{tridimensionalProfile.physiology}}
- Sociology: {{tridimensionalProfile.sociology}}
- Psychology: {{tridimensionalProfile.psychology}}
- Derivation Chain: {{tridimensionalProfile.derivationChain}}
- Core Traits: {{tridimensionalProfile.coreTraits | join '; '}}

AGENCY MODEL (from Stage 3):
- Replanning Policy: {{agencyModel.replanningPolicy}}
- Emotion Salience: {{agencyModel.emotionSalience}}
- Core Beliefs: {{agencyModel.coreBeliefs | join '; '}}
- Desires: {{agencyModel.desires | join '; '}}
- Current Intentions: {{agencyModel.currentIntentions | join '; '}}
- False Beliefs: {{agencyModel.falseBeliefs | join '; '}}
- Decision Pattern: {{agencyModel.decisionPattern}}

DEEP RELATIONSHIPS (from Stage 4):
Relationships:
{{#each deepRelationships.relationships}}
- {{fromCharacter}} -> {{toCharacter}}: {{relationshipType}} ({{valence}}, {{numericValence}})
  History: {{history}}
  Current Tension: {{currentTension}}
  Leverage: {{leverage}}
{{/each}}
Secrets: {{deepRelationships.secrets | join '; '}}
Personal Dilemmas: {{deepRelationships.personalDilemmas | join '; '}}

{{#if conceptSpec}}
CONCEPT ANALYSIS (use to ground character decomposition):
  {{... full concept analysis section ...}}

CONSTRAINT: Use genre frame and tone to calibrate voice register and vocabulary profile. ...
{{else if conceptSummary}}
CONCEPT:
{{conceptSummary}}
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (philosophical foundation — let it shape character depth):
  {{... full kernel grounding section ...}}

CONSTRAINT: Use the dramatic stance to set the overall voice tone (comic, romantic, tragic, ironic). ...
{{else if kernelSummary}}
STORY KERNEL:
{{kernelSummary}}
{{/if}}

{{#if userNotes}}
USER NOTES:
{{userNotes}}
{{/if}}

FIELD INSTRUCTIONS:
- characterName: Must be "{{characterName}}".
- voiceRegister: One of FORMAL, NEUTRAL, COLLOQUIAL, CEREMONIAL, TECHNICAL, VULGAR, POETIC.
- speechFingerprint.catchphrases: Array of signature repeated phrases.
- speechFingerprint.vocabularyProfile: The character's word-choice profile, level of formality, jargon, and diction habits.
- speechFingerprint.sentencePatterns: Typical sentence structure and cadence.
- speechFingerprint.verbalTics: Array of filler words, habitual interjections, or repeated speech markers.
- speechFingerprint.dialogueSamples: Array of 5-10 example lines that sound authentically like this character.
- speechFingerprint.metaphorFrames: The metaphor systems or conceptual frames this character uses.
- speechFingerprint.antiExamples: Array of 2-3 lines that define how this character does NOT sound.
- speechFingerprint.discourseMarkers: Array of turn openers, transitions, self-corrections, and closers.
- speechFingerprint.registerShifts: How the voice changes under stress, intimacy, public pressure, or status shifts.
- appearance: Brief physical presentation guidance grounded in prior stages.
- knowledgeBoundaries: What the character knows, suspects, misreads, and cannot know.
- conflictPriority: State what wins when the character's goals conflict.
```

## JSON Response Shape

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

## Generation Stage

The Textual Presentation stage runs as the `GENERATING_CHAR_PRESENTATION` generation stage.

## LLM Stage Configuration

- Stage model key: `charPresentation`
- Uses `runLlmStage()` from `llm-stage-runner.ts`

## Contract Notes

- `CastPipelineInputs` carries both string summaries and typed objects. Typed objects take priority; string summaries are fallback.
- Shared section builders in `concept-kernel-sections.ts` are reused by the entity-decomposer, character web, and all 5 character dev stage prompts. Each consumer appends its own stage-specific CONSTRAINT line.
- `completedStages` is a sorted, deduplicated array of `CharacterDevStage` values (1-5).
- This is the final character development stage. After completion, the character is ready for downstream story preparation (entity decomposition, structure generation).
