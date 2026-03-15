# Character Decomposer Prompt (Production Template)

- Source: `src/llm/prompts/character-decomposer-prompt.ts`
- Generation file: `src/llm/character-decomposer.ts`
- Schema file: `src/llm/schemas/character-decomposer-schema.ts`
- Shared contract: `src/llm/entity-decomposition-contract.ts` (speech fields, agency principles)
- Model types: `src/models/standalone-decomposed-character.ts` (`StandaloneDecomposedCharacter`), `src/models/decomposed-character.ts` (`SpeechFingerprint`)

## Purpose

Single-character decomposition — converts one raw character description into a structured, machine-friendly attribute object. Operates in isolation with no story context or other characters. The output is a `StandaloneDecomposedCharacter` (no `thematicStance` or `protagonistRelationship`) that is later contextualized by the character contextualizer.

**Pipeline position**: Character Dev Pipeline (stages 1-5) OR raw input -> **Character Decomposer** (per-character) -> Character Contextualizer -> Structure Generator

**Why it exists**: Decomposing characters one at a time enables parallel execution and prevents cross-contamination between character profiles. Each character gets maximum attention from the LLM. The speech fingerprint is the most important output — characters must be identifiable by voice alone.

## Context Provided

| Context Field | Type | Description |
|---|---|---|
| `characterName` | `string` | The character's name |
| `characterDescription` | `string` | Raw prose description of the character |

## Messages Sent To Model

### 1) System Message

```text
You are a Character Decomposer for an interactive branching story engine. Your job is to convert a single raw character description into a structured, machine-friendly attribute object.

{{CONTENT_POLICY}}

You are decomposing ONE character in isolation — no story context, no other characters.

DECOMPOSITION PRINCIPLES:

1. SPEECH FINGERPRINT EXTRACTION: This is the MOST IMPORTANT output. Extract or infer:
   - Catchphrases, vocabulary profile, sentence patterns, verbal tics
   - Dialogue samples (5-10 lines), metaphor frames, anti-examples (2-3 lines)
   - Discourse markers, register shifts

2. TRAIT DECOMPOSITION: Extract 3-5 core personality traits as concise labels.

3. KNOWLEDGE BOUNDARIES: Explicitly state what this character knows and does NOT know.

4. FALSE BELIEFS: Identify sincere misconceptions that should influence reasoning. Empty array if none.

5. SECRETS KEPT: Identify things actively concealed from others. Empty array if none.

6. PRESERVE NUANCE: Do not flatten complex characters into stereotypes.

7. INFER MISSING DETAILS: If speech patterns aren't explicit, INFER from background, personality, and social context.

8-10. Agency principles (decision pattern, core beliefs, conflict priority).

11-14. Deep psychology (moral line, worst fear, formative wound, misbelief, stress variants, focalization filter, escalation ladder).

15-19. Material grounding (immediate objectives, constraints, desires, current intentions, sociology).
```

### 2) User Message

```text
Decompose the following character description into a structured attribute object.

CHARACTER NAME: {{characterName}}

CHARACTER DESCRIPTION:
{{characterDescription}}

INSTRUCTIONS:
1. Extract or infer a complete speech fingerprint — this is the most important output
2. Every field must reflect the character's unique identity — no generic filler
3. For decision patterns and core beliefs: if not explicit, infer from behavior, background, and personality
4. Core beliefs should read like statements the character would actually think or say
5. For false beliefs: identify sincere misconceptions from character background and context
6. For secrets: identify truths the character actively hides from others
7. If the description is sparse, INFER richly from what is implied
8. superObjective: Identify the single deepest dramatic drive
9. stakes: List 2-4 concrete things the character stands to lose or gain
10. pressurePoint: Identify the one vulnerability that could force action against self-interest
11. personalDilemmas: Identify 1-3 competing loyalties or values creating internal conflict
12. emotionSalience: Assess emotional expressiveness (LOW/MEDIUM/HIGH). null if uncertain
13-19. Deep psychology fields (moralLine, worstFear, formativeWound, misbelief, stressVariants, focalizationFilter, escalationLadder)
20-24. Material grounding fields (immediateObjectives, constraints, desires, currentIntentions, sociology)
```

## JSON Response Shape

```json
{
  "name": "{{character name}}",
  "coreTraits": ["{{trait1}}", "{{trait2}}", "{{trait3}}"],
  "superObjective": "{{single deepest dramatic drive}}",
  "stakes": ["{{what character stands to lose or gain}}"],
  "pressurePoint": "{{vulnerability forcing action against self-interest}}",
  "personalDilemmas": ["{{competing loyalty or value}}"],
  "emotionSalience": "{{LOW|MEDIUM|HIGH|null}}",
  "knowledgeBoundaries": "{{what they know and don't know}}",
  "appearance": "{{brief physical description}}",
  "decisionPattern": "{{how they decide under pressure}}",
  "coreBeliefs": ["{{operational belief}}"],
  "conflictPriority": "{{which value/goal wins when conflicted}}",
  "falseBeliefs": ["{{sincere misconception}}"],
  "secretsKept": ["{{actively concealed truth}}"],
  "immediateObjectives": ["{{tactical goal being actively pursued}}"],
  "constraints": ["{{external limitation on options}}"],
  "desires": ["{{concrete want beyond super-objective}}"],
  "currentIntentions": ["{{active plan being executed}}"],
  "sociology": "{{class, family, economic situation, social world}}",
  "speechFingerprint": {
    "catchphrases": ["{{signature phrase}}"],
    "vocabularyProfile": "{{formality, word preferences, jargon}}",
    "sentencePatterns": "{{sentence structure description}}",
    "verbalTics": ["{{filler words, interjections}}"],
    "dialogueSamples": ["{{example line in character voice}}"],
    "metaphorFrames": "{{conceptual metaphor lens}}",
    "antiExamples": ["{{line this character would never say}}"],
    "discourseMarkers": ["{{turn opener/topic-shift/closer}}"],
    "registerShifts": "{{how speech changes by context}}"
  }
}
```

- `emotionSalience` is nullable: `anyOf: [{ type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] }, { type: 'null' }]`.
- `superObjective`, `stakes`, `pressurePoint`, `personalDilemmas`, and `emotionSalience` are spread conditionally in the parser — only set when non-empty.
- Speech fingerprint fields use `SPEECH_SCHEMA_FIELDS` and `SPEECH_REQUIRED_FIELDS` from `entity-decomposition-contract.ts`.

## Generation Stage

The Character Decomposer runs as part of the `DECOMPOSING_ENTITIES` generation stage (when used in the split decomposition pipeline).

## LLM Stage Configuration

- Stage model key: `characterDecomposer`
- Uses `withRetry()` + `withModelFallback()` directly (not `runLlmStage()`)

## Contract Notes

- Output is `CharacterDecompositionResult` containing a `StandaloneDecomposedCharacter` (minus `id` and `createdAt`, which are added by the persistence layer).
- No `thematicStance` or `protagonistRelationship` — those are added by the character contextualizer.
- The `rawDescription` field is set from `context.characterDescription` by the parser (not from LLM output).
- Speech fingerprint parsing uses `SPEECH_STRING_FIELDS` and `SPEECH_ARRAY_FIELDS` from the shared contract.
