# Entity Decomposer Prompt (Production Template)

- Source: `src/llm/prompts/entity-decomposer-prompt.ts`
- Orchestration: `src/llm/entity-decomposer.ts`
- Types: `src/llm/entity-decomposer-types.ts`
- Output schema source: `src/llm/schemas/entity-decomposer-schema.ts`
- Model types: `src/models/decomposed-character.ts`, `src/models/decomposed-world.ts`

## Purpose

The Entity Decomposer is a one-time LLM call at story creation (after structure generation) that converts raw character descriptions and worldbuilding prose into structured, machine-friendly attribute objects. The structured output is persisted in `story.json` and used by downstream prompts (planner, lorekeeper, writer) instead of raw prose dumps.

**Pipeline position**: Structure Generator -> **Entity Decomposer** -> First Page Generation

**Why it exists**: Research demonstrates that raw prose dumps degrade LLM performance. Speech patterns, verbal tics, and linguistic fingerprints buried in prose paragraphs get lost. Domain-tagged atomic facts are easier to filter and reason about than monolithic worldbuilding text. The decomposed structure makes each character identifiable by voice alone.

## Messages Sent To Model

### 1) System Message

```text
You are an Entity Decomposer for an interactive branching story engine. Your job is to convert raw character descriptions and worldbuilding prose into structured, machine-friendly attribute objects.

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

DECOMPOSITION PRINCIPLES:

1. SPEECH FINGERPRINT EXTRACTION: This is the MOST IMPORTANT output. Each character must be identifiable by voice alone without dialogue attribution. Extract or infer:
   - Catchphrases: Signature phrases they would repeat based on personality and background
   - Vocabulary profile: Formality level, word preferences, jargon usage, archaic vs modern
   - Sentence patterns: Short/terse vs ornate, questions vs declarations, imperative vs passive
   - Verbal tics: Filler words, interjections, habitual speech markers
   - Dialogue samples: Write 5-10 example lines showing their unique voice in action (invented or extracted from provided descriptions/dialogue)

2. TRAIT DECOMPOSITION: Extract 3-5 core personality traits as concise labels. These should be the traits that most influence behavior and dialogue.

3. KNOWLEDGE BOUNDARIES: Explicitly state what each character knows and does NOT know. This prevents information leaking between characters during generation.

4. RELATIONSHIP MAPPING: Capture relationships WITH CONTEXT - not just "knows X" but the emotional quality and history of the relationship.

5. WORLDBUILDING ATOMIZATION: Break worldbuilding prose into atomic facts with domain tags and scope annotations. Each fact should be a single, self-contained proposition.

6. PRESERVE NUANCE: Do not flatten complex characters into stereotypes. If the description contains contradictions or complexity, preserve that in the decomposition.

7. INFER MISSING DETAILS: If the raw description implies speech patterns but doesn't state them explicitly, INFER them from the character's background, personality, and social context. A grizzled sailor speaks differently from a court diplomat.
```

### 2) User Message

```text
Decompose the following character descriptions and worldbuilding into structured attribute objects.

CHARACTER CONCEPT (protagonist):
{{characterConcept}}

{{#if npcs.length}}
NPC DEFINITIONS:
{{formattedNpcs}}
{{/if}}

{{#if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}
{{/if}}

{{#if tone}}
TONE/GENRE: {{tone}}
{{/if}}

INSTRUCTIONS:
1. The FIRST character in the output array MUST be the protagonist (from CHARACTER CONCEPT)
2. Remaining characters follow in NPC definition order
3. For speech fingerprints: if the description explicitly describes how someone talks, use that. If not, INFER speech patterns from their personality, background, social class, and the story's tone/genre
4. For worldbuilding facts: decompose into atomic propositions. If no worldbuilding is provided, return an empty worldFacts array
5. Every character MUST have a distinct speech fingerprint - no two characters should sound alike
```

## JSON Response Shape

```json
{
  "characters": [
    {
      "name": "{{character name}}",
      "speechFingerprint": {
        "catchphrases": ["{{signature phrase}}"],
        "vocabularyProfile": "{{formality, word preferences, jargon}}",
        "sentencePatterns": "{{sentence structure description}}",
        "verbalTics": ["{{filler words, interjections}}"],
        "dialogueSamples": ["{{example line in character voice}}"]
      },
      "coreTraits": ["{{trait1}}", "{{trait2}}", "{{trait3}}"],
      "motivations": "{{what drives this character}}",
      "relationships": ["{{relationship with context}}"],
      "knowledgeBoundaries": "{{what they know and don't know}}",
      "appearance": "{{brief physical description}}"
    }
  ],
  "worldFacts": [
    {
      "domain": "{{geography|magic|society|faction|history|technology|custom}}",
      "fact": "{{single atomic worldbuilding proposition}}",
      "scope": "{{where/when this fact applies}}"
    }
  ]
}
```

- `characters[0]` is always the protagonist (from CHARACTER CONCEPT); subsequent entries are NPCs in definition order.
- `worldFacts` is an empty array when no worldbuilding is provided.
- `domain` is a strict enum; invalid values are defaulted to `custom` by the response transformer.
- World facts with empty `fact` text are filtered out by the response transformer.
- Missing optional arrays in `speechFingerprint` (catchphrases, verbalTics, dialogueSamples) default to `[]`.

## Response Transformation

The entity decomposer (`entity-decomposer.ts`) applies the following post-processing:

1. **Character mapping**: Each LLM character is mapped to a `DecomposedCharacter` with `rawDescription` set to:
   - `characterConcept` for index 0 (protagonist)
   - Matching NPC description for index > 0 (matched by array order, falling back to `''`)
2. **Speech fingerprint defaults**: Missing or undefined arrays default to `[]`.
3. **Domain validation**: World fact domains not in the valid enum are defaulted to `'custom'`.
4. **Empty fact filtering**: World facts with empty or whitespace-only `fact` text are removed.
5. **Character validation**: Throws if `characters` array is empty (must include at least the protagonist) or if any character has an empty `name`.

## Context Provided

| Context Field | Description |
|---|---|
| `characterConcept` | Protagonist concept (raw prose) |
| `worldbuilding` | Full worldbuilding text (raw prose, may be empty) |
| `tone` | Tone/genre string |
| `npcs` | All NPC definitions (name + description pairs) |

## Downstream Usage

The decomposed output is stored on the `Story` object and propagated to downstream prompts:

- **Planner** (opening + continuation): Receives `DecomposedCharacter[]` as `CHARACTERS (structured profiles)` and `DecomposedWorld` as `WORLDBUILDING (structured)` with domain-tagged facts, instead of raw prose. Falls back to raw when decomposed data is absent.
- **Lorekeeper**: Receives `DecomposedCharacter[]` as `CHARACTERS (structured profiles with speech fingerprints)` with full speech fingerprints for voice synthesis. Falls back to raw NPC definitions when absent. Receives domain-tagged `DecomposedWorld` facts instead of raw worldbuilding. The lorekeeper's TWO-SOURCE SYNTHESIS principle guides merging decomposed structure (initial scaffold) with runtime canon facts (gameplay discoveries).
- **Writer** (opening + continuation): Receives the protagonist's `SpeechFingerprint` as a dedicated `PROTAGONIST SPEECH FINGERPRINT` section for voice consistency. NPC speech data arrives via the Story Bible (curated by lorekeeper).

## Generation Stage

The Entity Decomposer runs as the `DECOMPOSING_ENTITIES` generation stage, emitted during story creation between structure generation and first page generation.

```
STRUCTURING_STORY started
STRUCTURING_STORY completed
DECOMPOSING_ENTITIES started
DECOMPOSING_ENTITIES completed
PLANNING_PAGE started
...
```

The frontend displays this stage as "STUDYING" in the spinner UI with Sims-style humor phrases themed around character analysis and world study.

## Backward Compatibility

- Raw fields (`characterConcept`, `worldbuilding`, `npcs`) remain untouched on the Story object.
- `decomposedCharacters` and `decomposedWorld` are optional fields on Story.
- All downstream prompt builders check for decomposed data first, fall back to raw.
- Existing stories created before this feature continue to work without re-generation.
