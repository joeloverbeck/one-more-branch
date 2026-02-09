# Prompt 3: Opening Page Writing

## Purpose

Generates the **first page** of the interactive story. This is the narrative entry point that establishes the protagonist, world, atmosphere, initial state, inventory, health, threats, constraints, narrative threads, and the first set of player choices.

## When It Fires

Called once after story structure creation (or without a structure if structured stories are disabled). This is the first narrative content the player sees.

---

## System Prompt

The system prompt combines:

1. **System Intro**: Establishes the LLM as an expert interactive fiction storyteller and Dungeon Master.
2. **Content Policy**: NC-21 adults-only. No restrictions. No self-censorship.
3. **Storytelling Guidelines**: Prose style rules including:
   - Second person perspective ("you"), written as if the protagonist's own mind narrates
   - Diction, observations, and internal reactions matched to protagonist personality
   - Emotional state colors the prose naturally
   - Show character through action, not exposition
   - Keep scenes focused and forward-moving
4. **Ending Guidelines**: How to handle endings (earned, meaningful, no choices when concluded).

### Optional: Chain of Thought

When enabled, appends reasoning instructions:
- Consider character motivations and emotional state
- Plan how this scene advances toward the story arc
- Brainstorm 3-4 potential choices, select best 3 (4th only if truly warranted)
- Verify each choice is in-character, consequential, and divergent
- Output format: `<thinking>` tags then `<output>` tags

---

## User Prompt

### Data & State Rules (Embedded in User Message)

The user message begins with a large block of data/state rules. These are placed in the **user message** (not system) to separate creative persona from schema rules. The rules include:

#### Shared Sections (used by both opening and continuation)

1. **Active State Tracking**: How to track location, threats (PREFIX_ID format), constraints, and narrative threads.
2. **Inventory Management**: `inventoryAdded`/`inventoryRemoved` rules.
3. **Health Management**: Physical conditions only (emotions go in `protagonistAffect`).
4. **Field Separation**: Clear delineation of which data belongs in which field.
5. **Protagonist Affect**: Emotional state snapshot at end of scene (not accumulated).

#### Opening-Specific Sections

6. **Establishment Rules**: This is the FIRST page -- establishing initial state, not maintaining continuity. Character concept is the primary source of truth. All "removed" arrays must be empty.
7. **Character Canon Guidance**: How to extract canon facts from character concept and worldbuilding. Only add permanent traits supported by the provided context.
8. **Active State Quality**: Examples of good/bad initial threats, constraints, threads. Opening-specific reminders (all removal arrays empty).
9. **Canon Quality**: Examples of good/bad world canon and character canon. Only establish canon directly supported by provided context.

#### Optional: Strict Choice Guidelines

When `choiceGuidance === 'strict'`, appends detailed choice requirements:
- IN-CHARACTER, CONSEQUENTIAL, DIVERGENT, ACTIONABLE, BALANCED, VERB-FIRST, SCENE-HOOKING
- Forbidden choice patterns (passive, too similar, meta-choices)
- Divergence enforcement (each choice must change a different story element)

### Injected Context Variables

| Variable | Required | Description |
|---|---|---|
| `characterConcept` | Yes | The protagonist's concept/description |
| `worldbuilding` | No | World setting details |
| `npcs` | No | Available NPC characters with introduction guidance |
| `startingSituation` | No | A specific opening situation that takes precedence |
| `tone` | Yes | Tone/genre specification |
| `structure` | No | Story structure (overallTheme, current act/beat) |

### Prompt Template (Requirements Section)

```
REQUIREMENTS (follow all):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 3 meaningful choices leading to genuinely DIFFERENT story directions (add a 4th only when truly warranted)
5. Establish starting inventory based on the character concept
6. If the character concept implies starting physical conditions, use healthAdded
7. Capture the protagonist's emotional state at the END of this scene in protagonistAffect
8. Set the initial LOCATION clearly (currentLocation field)
9. Establish any starting THREATS using threatsAdded
10. Establish any starting CONSTRAINTS using constraintsAdded
11. Plant narrative THREADS using threadsAdded

OPENING PAGE STATE:
Since this is the first page, you are ESTABLISHING the initial state, not modifying previous state:
- threatsRemoved, constraintsRemoved, threadsResolved should all be EMPTY arrays
- currentLocation should be set to wherever the scene ends
- Use the PREFIX_ID: description format for all added entries
```

---

## Few-Shot Examples

When `fewShotMode` is not `'none'`, example pairs are injected.

### Minimal Mode (1 example)

Opening example only: A wizard apprentice (Lyra) discovering a forbidden journal in a floating academy.

### Standard Mode

Same as minimal for opening prompts.

### Example Response (Opening)

```json
{
  "narrative": "[Long-form narrative prose in second person, ~500-800 words, establishing character, world, and initial conflict]",
  "choices": [
    "Hide the journal and apologize, claiming you were taking notes",
    "Use a minor illusion spell to make the journal appear to be your textbook",
    "Excuse yourself claiming sudden illness and slip away to investigate"
  ],
  "currentLocation": "Advanced Transmutation lecture hall, back row",
  "threatsAdded": [
    "THREAT_GRIMWALD_SUSPICION: Professor Grimwald is watching you closely"
  ],
  "threatsRemoved": [],
  "constraintsAdded": [
    "CONSTRAINT_CLASS_IN_SESSION: You are in the middle of a lecture"
  ],
  "constraintsRemoved": [],
  "threadsAdded": [
    "THREAD_FORBIDDEN_LIBRARY: The journal speaks of a library beneath the academy",
    "THREAD_JOURNAL_ORIGIN: Where did this journal come from and who wrote it?"
  ],
  "threadsResolved": [],
  "newCanonFacts": [
    "Celestria Academy floats among the clouds on enchanted foundations",
    "Professor Grimwald teaches Advanced Transmutation",
    "Elena is Lyra's roommate",
    "A forbidden library exists beneath the academy"
  ],
  "newCharacterCanonFacts": [],
  "inventoryAdded": [],
  "inventoryRemoved": [],
  "healthAdded": [],
  "healthRemoved": [],
  "characterStateChangesAdded": [],
  "characterStateChangesRemoved": [],
  "isEnding": false,
  "beatConcluded": false,
  "beatResolution": ""
}
```

---

## Expected JSON Output

### Schema Name: `writer_generation`

Strict mode enabled (`additionalProperties: false`). All fields required.

```json
{
  "narrative": "string - Vivid prose in second person. Minimum 100 words.",

  "choices": ["string[] - 2-4 choices if isEnding=false; exactly 0 if isEnding=true. Typically 3. Each is a separate array element."],

  "currentLocation": "string - Where the protagonist is at END of scene",

  "threatsAdded": ["string[] - Format: 'THREAT_ID: Description'. Empty array if none."],
  "threatsRemoved": ["string[] - MUST BE EMPTY for opening page"],
  "constraintsAdded": ["string[] - Format: 'CONSTRAINT_ID: Description'. Empty array if none."],
  "constraintsRemoved": ["string[] - MUST BE EMPTY for opening page"],
  "threadsAdded": ["string[] - Format: 'THREAD_ID: Description'. Empty array if none."],
  "threadsResolved": ["string[] - MUST BE EMPTY for opening page"],

  "newCanonFacts": ["string[] - Permanent world-building facts established in this scene"],

  "newCharacterCanonFacts": [
    {
      "characterName": "string",
      "facts": ["string[] - Permanent character traits from the concept"]
    }
  ],

  "inventoryAdded": ["string[] - Items the protagonist starts with. Be specific."],
  "inventoryRemoved": ["string[] - MUST BE EMPTY for opening page"],
  "healthAdded": ["string[] - Physical conditions only. Empty unless concept implies them."],
  "healthRemoved": ["string[] - MUST BE EMPTY for opening page"],

  "characterStateChangesAdded": [
    {
      "characterName": "string",
      "states": ["string[]"]
    }
  ],
  "characterStateChangesRemoved": ["MUST BE EMPTY for opening page"],

  "protagonistAffect": {
    "primaryEmotion": "string - e.g., 'fear', 'curiosity', 'determination'",
    "primaryIntensity": "string - 'mild' | 'moderate' | 'strong' | 'overwhelming'",
    "primaryCause": "string - What's causing this emotion (brief, scene-specific)",
    "secondaryEmotions": [
      {
        "emotion": "string",
        "cause": "string"
      }
    ],
    "dominantMotivation": "string - What the protagonist most wants right now"
  },

  "isEnding": "boolean - false for opening pages (story just started)"
}
```

### Opening-Specific Invariants

- All "removed" fields must be **empty arrays**: `threatsRemoved`, `constraintsRemoved`, `threadsResolved`, `inventoryRemoved`, `healthRemoved`, `characterStateChangesRemoved`.
- `isEnding` should be `false` (story just started).
- `currentLocation` must be set (establishing where the story begins).
- `inventoryAdded` should reflect the character's background and profession.
- `healthAdded` only if the character concept explicitly mentions conditions.

---

## Message Structure

```
[
  { role: "system",    content: <creative system prompt (persona + content policy + storytelling + ending guidelines)> },
  { role: "user",      content: <few-shot user example> },       // optional
  { role: "assistant", content: <few-shot assistant response> },  // optional
  { role: "user",      content: <data rules + context + requirements> }
]
```

---

## Source Files

- Prompt builder: `src/llm/prompts/opening-prompt.ts`
- System prompt builder: `src/llm/prompts/system-prompt-builder.ts` (`buildOpeningSystemPrompt`, `composeOpeningDataRules`)
- Shared sections: `src/llm/prompts/sections/shared/` (narrative-core, state-tracking, protagonist-affect)
- Opening sections: `src/llm/prompts/sections/opening/` (establishment-rules, opening-quality-criteria)
- JSON schema: `src/llm/schemas/writer-schema.ts`
- Few-shot data: `src/llm/few-shot-data.ts`
- Types: `src/llm/types.ts` (`OpeningContext`, `GenerationResult`, `WriterResult`)
