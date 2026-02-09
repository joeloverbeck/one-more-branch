# Prompt 4: Continuation Page Writing

## Purpose

Generates **subsequent pages** of the interactive story after the opening. This is the main narrative generation prompt, called every time the player makes a choice. It receives the full accumulated story state and produces the next scene with new choices.

## When It Fires

Called every time a player selects a choice on a non-ending page (after the opening page). This is the most frequently used prompt in the system.

---

## System Prompt

Identical to the opening page system prompt:

1. **System Intro**: Expert interactive fiction storyteller and Dungeon Master role.
2. **Content Policy**: NC-21 adults-only, no restrictions.
3. **Storytelling Guidelines**: Second person, protagonist-voiced narration, emotional prose, show-don't-tell.
4. **Ending Guidelines**: Earned endings, no choices when concluded.

---

## User Prompt

### Data & State Rules (Embedded in User Message)

Same shared sections as opening, plus continuation-specific sections:

#### Shared Sections

1. **Active State Tracking**: Location, threats, constraints, threads with PREFIX_ID format.
2. **Inventory Management**: `inventoryAdded`/`inventoryRemoved`.
3. **Health Management**: Physical conditions only.
4. **Field Separation**: Clear delineation of field purposes.
5. **Protagonist Affect**: Emotional state snapshot at end of scene.

#### Continuation-Specific Sections

6. **Continuity Rules**: Do not contradict established world facts, character information, NPC state, inventory, health, or active state. Retcons are forbidden. Includes a consistency verification checklist.
7. **Character Canon vs State**: Clear distinction -- canon is permanent traits true in ANY playthrough; state is situational events from THIS playthrough's choices.
8. **Active State Quality**: Examples of good/bad threats, constraints, threads. Removal quality guidance (remove when resolved, use prefix only).
9. **Canon Quality**: Examples of good/bad world canon and character canon. Rule: if true regardless of choices, it's canon; if choice-dependent, it's state.

#### Optional: Strict Choice Guidelines

Same as opening (when `choiceGuidance === 'strict'`).

### Injected Context Variables

| Variable | Required | Description |
|---|---|---|
| `characterConcept` | Yes | The protagonist's concept/description |
| `worldbuilding` | No | World setting details |
| `npcs` | No | Available NPC characters |
| `tone` | Yes | Tone/genre specification |
| `structure` | No | Story structure with beat status |
| `accumulatedStructureState` | No | Beat progressions, current act/beat index |
| `pacingNudge` | No | Pacing directive from analyst (if pacing issue detected) |
| `globalCanon` | Yes | Established world facts (array of strings) |
| `globalCharacterCanon` | Yes | Character information (object: name -> facts[]) |
| `accumulatedCharacterState` | Yes | NPC current state (object: name -> states[]) |
| `activeState` | Yes | Current location, threats, constraints, threads |
| `accumulatedInventory` | Yes | Current inventory items |
| `accumulatedHealth` | Yes | Current health conditions |
| `parentProtagonistAffect` | No | Previous page's emotional state |
| `previousNarrative` | Yes | Full narrative text of the previous page |
| `grandparentNarrative` | No | Full narrative text of the page before previous |
| `selectedChoice` | Yes | The player's chosen action text |

### Dynamically Composed Sections

The prompt assembles these sections only when the relevant data exists:

- **STORY STRUCTURE**: Current act, beat status (`[x] CONCLUDED`, `[>] ACTIVE`, `[ ] PENDING`), remaining acts. Only present if structured stories are enabled.
- **PACING DIRECTIVE**: Injected when the analyst detected a pacing issue. Tells the writer to push the story forward.
- **ESTABLISHED WORLD FACTS**: Bullet list of global canon.
- **CHARACTER INFORMATION**: Grouped by character name with permanent traits.
- **NPC CURRENT STATE**: Grouped by character name with branch-specific events.
- **CURRENT LOCATION**: Where the protagonist currently is.
- **ACTIVE THREATS**: Dangers that exist NOW.
- **ACTIVE CONSTRAINTS**: Limitations affecting protagonist NOW.
- **OPEN NARRATIVE THREADS**: Unresolved hooks.
- **YOUR INVENTORY**: Items currently possessed.
- **YOUR HEALTH**: Current physical conditions (defaults to "You feel fine." if empty).
- **PROTAGONIST'S CURRENT EMOTIONAL STATE**: Formatted affect from previous page.
- **SCENE BEFORE LAST**: Grandparent narrative (if available, for better context).
- **PREVIOUS SCENE**: The full text of the parent page.
- **PLAYER'S CHOICE**: The exact text of what the player chose.

### Prompt Template (Requirements Section)

```
REQUIREMENTS (follow all):
1. Start exactly where the previous scene ended--do NOT recap or summarize what happened
   - Do NOT repeat or rephrase the last sentence of the previous scene
   - Begin with an action, dialogue, or reaction within the next 1-2 beats
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain consistency with all established facts and the current state
5. Present 3 new meaningful choices unless this naturally leads to an ending (add a 4th only when truly warranted)
6. Ensure choices are divergent - each must lead to a genuinely different story path
7. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (fresh snapshot)

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true).
```

---

## Few-Shot Examples

### Minimal Mode (1 example)

Continuation example: Lyra heading to the east wing to find the statue of Archmagus Caelan. Demonstrates proper consequence-showing, consistency, state tracking, and divergent choices.

### Standard Mode (2 examples)

1. Continuation example (same as minimal)
2. Ending example: Lyra performing the binding ritual to seal the Codex. Demonstrates proper ending with empty choices, `isEnding: true`, threat/constraint/thread resolution.

### Example Response (Continuation)

```json
{
  "narrative": "[Scene showing consequences of choice, advancing narrative, ~400-800 words]",
  "choices": [
    "Quickly press the third rune and hope the passage opens before you're discovered",
    "Hide behind the statue and wait to see who the faculty member is",
    "Use an illusion to make yourself appear invisible and observe"
  ],
  "currentLocation": "East wing corridor, beside the statue of Archmagus Caelan",
  "threatsAdded": [
    "THREAT_FACULTY_APPROACHING: A senior faculty member is approaching your position"
  ],
  "threatsRemoved": [],
  "constraintsAdded": [
    "CONSTRAINT_RESTRICTED_AREA: You are trespassing in the restricted east wing"
  ],
  "constraintsRemoved": ["CONSTRAINT_CLASS_IN_SESSION"],
  "threadsAdded": [
    "THREAD_STATUE_MECHANISM: The third rune on the staff may open a hidden passage"
  ],
  "threadsResolved": [],
  "newCanonFacts": [
    "The east wing houses portraits of ancient magisters",
    "Archmagus Caelan's statue has a staff with runes"
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

### Example Response (Ending)

```json
{
  "narrative": "[Conclusive scene with closure, ~600-1000 words]",
  "choices": [],
  "currentLocation": "Academy entrance hall, reunited with Professor Grimwald",
  "threatsAdded": [],
  "threatsRemoved": ["THREAT_GRIMWALD_SUSPICION", "THREAT_FACULTY_APPROACHING"],
  "constraintsAdded": [],
  "constraintsRemoved": ["CONSTRAINT_RESTRICTED_AREA"],
  "threadsAdded": [],
  "threadsResolved": ["THREAD_FORBIDDEN_LIBRARY", "THREAD_JOURNAL_ORIGIN"],
  "newCanonFacts": [
    "The Codex of Unmaking can be bound by those who know the ritual",
    "A secret order of librarians protects the forbidden library's true contents"
  ],
  "newCharacterCanonFacts": [],
  "inventoryAdded": [],
  "inventoryRemoved": [],
  "healthAdded": [],
  "healthRemoved": [],
  "characterStateChangesAdded": [],
  "characterStateChangesRemoved": [],
  "isEnding": true,
  "beatConcluded": true,
  "beatResolution": "You bound the Codex of Unmaking and secured Professor Grimwald's alliance to protect the library."
}
```

---

## Expected JSON Output

### Schema Name: `writer_generation`

Same schema as the opening prompt. Strict mode enabled. All fields required.

```json
{
  "narrative": "string - Vivid prose in second person. Minimum 100 words.",

  "choices": ["string[] - 2-4 choices if isEnding=false; 0 if isEnding=true. Typically 3."],

  "currentLocation": "string - Where protagonist is at END of scene. Empty string if unchanged.",

  "threatsAdded": ["string[] - Format: 'THREAT_ID: Description'"],
  "threatsRemoved": ["string[] - Prefix only: 'THREAT_ID'"],
  "constraintsAdded": ["string[] - Format: 'CONSTRAINT_ID: Description'"],
  "constraintsRemoved": ["string[] - Prefix only: 'CONSTRAINT_ID'"],
  "threadsAdded": ["string[] - Format: 'THREAD_ID: Description'"],
  "threadsResolved": ["string[] - Prefix only: 'THREAD_ID'"],

  "newCanonFacts": ["string[] - Permanent world facts introduced THIS scene"],

  "newCharacterCanonFacts": [
    {
      "characterName": "string",
      "facts": ["string[] - Permanent character traits"]
    }
  ],

  "inventoryAdded": ["string[] - Items gained. Be specific."],
  "inventoryRemoved": ["string[] - EXACT text of lost items"],
  "healthAdded": ["string[] - Physical conditions gained"],
  "healthRemoved": ["string[] - EXACT text of healed conditions"],

  "characterStateChangesAdded": [
    {
      "characterName": "string",
      "states": ["string[] - Situational events THIS playthrough"]
    }
  ],
  "characterStateChangesRemoved": [
    {
      "characterName": "string",
      "states": ["string[] - EXACT text of resolved NPC states"]
    }
  ],

  "protagonistAffect": {
    "primaryEmotion": "string",
    "primaryIntensity": "'mild' | 'moderate' | 'strong' | 'overwhelming'",
    "primaryCause": "string",
    "secondaryEmotions": [
      { "emotion": "string", "cause": "string" }
    ],
    "dominantMotivation": "string"
  },

  "isEnding": "boolean - true only when story concludes (choices must be empty)"
}
```

### Continuation-Specific Notes

- Unlike the opening, "removed" arrays CAN be non-empty (threats resolved, constraints lifted, threads answered, items used, conditions healed).
- `inventoryRemoved` and `healthRemoved` must use **exact text** from existing entries.
- `threatsRemoved`, `constraintsRemoved`, `threadsResolved` use **prefix only** (e.g., `"THREAT_FIRE"`, not the full description).
- `protagonistAffect` is a **fresh snapshot**, not inherited from the previous page.
- When `isEnding === true`, `choices` must be an empty array.

---

## Message Structure

```
[
  { role: "system",    content: <creative system prompt> },
  { role: "user",      content: <few-shot continuation example user> },     // optional
  { role: "assistant", content: <few-shot continuation example response> }, // optional
  { role: "user",      content: <few-shot ending example user> },           // optional (standard mode)
  { role: "assistant", content: <few-shot ending example response> },       // optional (standard mode)
  { role: "user",      content: <data rules + full context + requirements> }
]
```

---

## Source Files

- Prompt builder: `src/llm/prompts/continuation-prompt.ts`
- System prompt builder: `src/llm/prompts/system-prompt-builder.ts` (`buildContinuationSystemPrompt`, `composeContinuationDataRules`)
- Shared sections: `src/llm/prompts/sections/shared/`
- Continuation sections: `src/llm/prompts/sections/continuation/` (continuity-rules, continuation-quality-criteria)
- Context builders: `src/llm/prompts/continuation/` (context-sections, active-state-sections, story-structure-section)
- JSON schema: `src/llm/schemas/writer-schema.ts`
- Few-shot data: `src/llm/few-shot-data.ts`
- Types: `src/llm/types.ts` (`ContinuationContext`, `GenerationResult`, `WriterResult`)
