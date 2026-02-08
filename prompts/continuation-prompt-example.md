# Continuation Prompt - Production Example

This document shows how the continuation prompt looks when sent to the LLM, with placeholders replaced by realistic example data.

---

## Message Structure

The continuation prompt consists of a sequence of `ChatMessage` objects:
1. **System message** - Role, content policy, and guidelines (same as opening)
2. **Few-shot examples** (optional) - User/assistant pairs demonstrating expected format
3. **User message** - The continuation request with full context

---

## System Message

The system message is identical to the opening prompt. See `opening-prompt-example.md` for the complete system message content.

---

## User Message (Continuation Request)

```
[role: user]

Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

=== STORY STRUCTURE ===
Overall Theme: Uncover the forbidden library's secrets and decide who can be trusted with them

CURRENT ACT: The Discovery (Act 1 of 3)
Objective: Stumble upon the forbidden journal and realize something is hidden beneath the academy
Stakes: Risk expulsion if caught investigating restricted areas

BEATS IN THIS ACT:
  [x] CONCLUDED: Introduction and Hook
    Resolution: Lyra was caught with the journal by Professor Grimwald but escaped using an illness excuse
  [>] ACTIVE: First Investigation
    Objective: Explore the east wing to find the statue of Archmagus Caelan
  [ ] PENDING: Discovery of the Entrance
  [ ] PENDING: First Glimpse Below

REMAINING ACTS:
  - Act 2: The Descent - Explore the forbidden library and uncover its secrets
  - Act 3: The Reckoning - Confront the truth and decide what to do with the knowledge

CURRENT STATE (for beat evaluation):
- Location: East wing corridor, beside the statue of Archmagus Caelan
- Active threats: THREAT_FACULTY_APPROACHING
- Constraints: CONSTRAINT_RESTRICTED_AREA
- Open threads: THREAD_STATUE_MECHANISM, THREAD_FORBIDDEN_LIBRARY, THREAD_JOURNAL_ORIGIN
(Consider these when evaluating beat completion)

=== BEAT EVALUATION ===
After writing the narrative, evaluate whether the ACTIVE beat should be concluded.

CONCLUDE THE BEAT (beatConcluded: true) when ANY of these apply:
1. The beat's objective has been substantively achieved (even if not perfectly)
2. The narrative has moved beyond this beat's scope into territory that matches a PENDING beat
3. Key events from later beats have already occurred (compare against PENDING beats below)
4. The current state shows the beat's goal has been reached

DO NOT CONCLUDE only if:
- This scene is still squarely within the active beat's scope AND
- The objective hasn't been meaningfully advanced

CRITICAL: Evaluate CUMULATIVE progress across all scenes, not just this single page.
Look at the CURRENT STATE above - if the situation has moved past the active beat's description, it should be concluded.

If concluding, provide beatResolution: a brief summary of how the beat was resolved.

REMAINING BEATS TO EVALUATE FOR DEVIATION:
  - 1.2: First Investigation
  - 1.3: Discovery of the Entrance
  - 1.4: First Glimpse Below
  - 2.1: Descend into the library
  - 2.2: Encounter guardians
  - 2.3: Find the Codex
  - 3.1: Escape with knowledge
  - 3.2: Confront the choice
  - 3.3: Final resolution

PROGRESSION CHECK: If the current narrative situation more closely matches a PENDING beat's description than the ACTIVE beat's description, the ACTIVE beat should be marked concluded.

=== BEAT DEVIATION EVALUATION ===
After evaluating beat completion, also evaluate whether the story has DEVIATED from remaining beats.

A deviation occurs when future beats are now impossible or nonsensical because:
- Story direction fundamentally changed
- Core assumptions of upcoming beats are invalid
- Required story elements/goals no longer exist

Evaluate ONLY beats that are not concluded. Never re-evaluate concluded beats.

If deviation is detected, mark:
- deviationDetected: true
- deviationReason: concise reason
- invalidatedBeatIds: invalid beat IDs only
- narrativeSummary: 1-2 sentence current-state summary for rewrite context

If no deviation is detected, mark deviationDetected: false.
Be conservative. Minor variations are acceptable; only mark true deviation for genuine invalidation.


ESTABLISHED WORLD FACTS:
- Celestria Academy floats among the clouds on enchanted foundations
- Professor Grimwald teaches Advanced Transmutation
- Elena is Lyra's roommate
- A forbidden library exists beneath the academy
- The east wing houses portraits of ancient magisters
- Archmagus Caelan's statue has a staff with runes

CHARACTER INFORMATION (permanent traits):
[Elena]
- Lyra's roommate
- Third-year apprentice
- Worries about Lyra's investigations

CURRENT LOCATION:
East wing corridor, beside the statue of Archmagus Caelan

ACTIVE THREATS (dangers that exist NOW):
- THREAT_FACULTY_APPROACHING: A senior faculty member is approaching your position

ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
- CONSTRAINT_RESTRICTED_AREA: You are trespassing in the restricted east wing

OPEN NARRATIVE THREADS (unresolved hooks):
- THREAD_STATUE_MECHANISM: The third rune on the staff may open a hidden passage
- THREAD_FORBIDDEN_LIBRARY: The journal speaks of a library beneath the academy
- THREAD_JOURNAL_ORIGIN: Where did this journal come from and who wrote it?

YOUR INVENTORY:
- Mysterious leather-bound journal with strange symbol
- Standard apprentice spellbook
- Wand of ash wood

YOUR HEALTH:
- You feel fine.

PROTAGONIST'S CURRENT EMOTIONAL STATE:
Primary: FEAR (strong) - A faculty member is approaching and could catch you trespassing
Secondary: EXCITEMENT - The mechanism to the hidden passage is right within reach
Motivation: Find a way to activate the passage or hide before being discovered

SCENE BEFORE LAST:
You slip out of the lecture hall, heart pounding as the heavy doors close behind you. The corridor is empty—most students are in class at this hour. Your fingers tremble slightly as you pull out the journal, its leather cover warm to the touch.

According to the notes you've decoded, the entrance to the forbidden library lies behind the statue of Archmagus Caelan in the east wing. But the east wing is restricted to senior students and faculty only.

PREVIOUS SCENE:
Your footsteps echo too loudly against the marble as you descend toward the east wing. Each step feels like a confession, a declaration of intent that anyone passing might hear and question.

The east wing greets you with silence and dust motes dancing in shafts of pale light. Unlike the bustling corridors of the main academy, these halls feel forgotten, preserved in amber. Portraits of long-dead magisters line the walls, their painted eyes seeming to track your progress.

You find the statue of Archmagus Caelan at the end of the corridor—a stern figure in flowing robes, one hand raised as if casting a spell frozen in time. The journal described a hidden mechanism, something about pressing the third rune on his staff.

As you approach, the journal grows almost hot against your chest. Then you hear it—footsteps. Not echoing from the direction you came, but from a side passage. Someone else is here, in the restricted wing.

You press yourself against the wall beside the statue, heart hammering. Through the shadows, you catch a glimpse of robes. Not student robes—the deep purple of a senior faculty member. They haven't seen you yet, but they're moving in your direction.

The mechanism is right there. You could try to activate it now and hope the passage opens quickly enough to hide you. Or you could wait, watch, see who else has business in this forbidden place.

PLAYER'S CHOICE: "Quickly press the third rune and hope the passage opens before you're discovered"

REQUIREMENTS (follow ALL):
1. Start exactly where the previous scene ended—do NOT recap or summarize what happened
   - Do NOT repeat or rephrase the last sentence of the previous scene
   - Begin with an action, dialogue, or reaction within the next 1-2 beats
2. Show the direct, immediate consequences of the player's choice - the story must react
3. Advance the narrative naturally - time passes, situations evolve, new elements emerge
4. Maintain STRICT consistency with all established facts and the current state
5. Present 3 new meaningful choices unless this naturally leads to an ending (add a 4th only when the situation truly warrants another distinct path)
6. Ensure choices are divergent - each must lead to a genuinely different story path
7. Update protagonistAffect to reflect how the protagonist feels at the END of this scene (this is a fresh snapshot, not inherited from previous scenes)

REMINDER: If the player's choice naturally leads to a story conclusion, make it an ending (empty choices array, isEnding: true). protagonistAffect should capture the protagonist's emotional state at the end of this scene - consider how the events of this scene have affected them.
```

---

## Expected Response Structure

The LLM must respond with a valid JSON object containing these fields:

```json
{
  "narrative": "string - The story text in second person, continuing from where the previous scene ended",
  
  "choices": ["string", "string", "string"],
  
  "currentLocation": "string - Specific location at END of scene",
  
  "threatsAdded": ["THREAT_ID: Description"],
  "threatsRemoved": ["THREAT_ID"],
  
  "constraintsAdded": ["CONSTRAINT_ID: Description"],
  "constraintsRemoved": ["CONSTRAINT_ID"],
  
  "threadsAdded": ["THREAD_ID: Description"],
  "threadsResolved": ["THREAD_ID"],
  
  "newCanonFacts": ["Permanent world facts established"],
  "newCharacterCanonFacts": {
    "Character Name": ["Permanent trait 1", "Permanent trait 2"]
  },
  
  "inventoryAdded": ["Specific item descriptions"],
  "inventoryRemoved": ["Exact text of item being removed"],
  
  "healthAdded": ["Physical condition descriptions"],
  "healthRemoved": ["Exact text of condition being removed"],
  
  "characterStateChangesAdded": [
    { "characterName": "NPC Name", "states": ["What happened in this scene"] }
  ],
  "characterStateChangesRemoved": [
    { "characterName": "NPC Name", "states": ["State no longer true"] }
  ],
  
  "protagonistAffect": {
    "primaryEmotion": "string",
    "primaryIntensity": "mild | moderate | strong | overwhelming",
    "primaryCause": "Brief description",
    "secondaryEmotions": [
      { "emotion": "string", "cause": "string" }
    ],
    "dominantMotivation": "What the protagonist wants most right now"
  },
  
  "isEnding": false,
  
  "beatConcluded": true,
  "beatResolution": "Brief summary of how the beat was resolved (if beatConcluded is true)",
  
  "deviation": {
    "deviationDetected": false,
    "deviationReason": "",
    "invalidatedBeatIds": [],
    "narrativeSummary": ""
  }
}
```

---

## Example Complete Response

```json
{
  "narrative": "Your hand shoots out, fingers finding the third rune on Caelan's staff. The stone is ice-cold, etched deep with symbols that seem to writhe under your touch. You press.\n\nNothing.\n\nThe footsteps are closer now—you can hear the swish of heavy robes, the deliberate pace of someone who belongs here. Panic claws at your throat. You press harder, twist slightly—\n\nA soft click, barely audible. The statue's base shivers, and a section of wall beside it swings inward on silent hinges, revealing a narrow passage lit by pale blue phosphorescence. The air that wafts out smells of dust and something older, something that makes the journal in your pocket pulse with warmth.\n\nYou don't hesitate. You slip through the gap just as the purple-robed figure rounds the corner. In the darkness, you press your back against cold stone, barely breathing, watching through a crack as the faculty member—you can see now it's Librarian Thorne, her silver hair pulled back severely—pauses before the statue.\n\nShe studies it for a long moment. Her hand reaches toward the staff, toward the very rune you just pressed.\n\nThen she turns and walks away, her footsteps fading into silence.\n\nThe passage behind you descends in a gentle spiral, the blue light emanating from crystals embedded in the walls. The journal's warmth has become a steady heat against your chest. Somewhere below, you can hear the faint sound of dripping water.",

  "choices": [
    "Descend the spiral passage immediately while Thorne is gone",
    "Wait and observe the entrance to see if Thorne returns or if others come",
    "Try to find a way to mark or jam the passage so you can return here easily"
  ],

  "currentLocation": "Hidden passage behind Caelan's statue, at the entrance",

  "threatsAdded": [
    "THREAT_THORNE_KNOWS: Librarian Thorne may suspect someone accessed the passage"
  ],
  "threatsRemoved": ["THREAT_FACULTY_APPROACHING"],

  "constraintsAdded": [
    "CONSTRAINT_UNKNOWN_TERRITORY: You have no map or knowledge of what lies below"
  ],
  "constraintsRemoved": ["CONSTRAINT_RESTRICTED_AREA"],

  "threadsAdded": [
    "THREAD_THORNE_INTEREST: Why did Librarian Thorne approach the statue?",
    "THREAD_PASSAGE_DESTINATION: Where does the spiral passage lead?"
  ],
  "threadsResolved": ["THREAD_STATUE_MECHANISM"],

  "newCanonFacts": [
    "The third rune on Caelan's staff opens a hidden passage",
    "The passage is lit by blue phosphorescent crystals",
    "Librarian Thorne has silver hair and knows about the statue"
  ],

  "newCharacterCanonFacts": {
    "Librarian Thorne": [
      "Has silver hair worn severely pulled back",
      "Wears the deep purple robes of senior faculty"
    ]
  },

  "inventoryAdded": [],
  "inventoryRemoved": [],

  "healthAdded": [],
  "healthRemoved": [],

  "characterStateChangesAdded": [
    {
      "characterName": "Librarian Thorne",
      "states": [
        "Approached the statue of Archmagus Caelan",
        "Nearly discovered the hidden passage"
      ]
    }
  ],
  "characterStateChangesRemoved": [],

  "protagonistAffect": {
    "primaryEmotion": "exhilaration",
    "primaryIntensity": "strong",
    "primaryCause": "You found the hidden passage and escaped discovery by a hair's breadth",
    "secondaryEmotions": [
      { "emotion": "curiosity", "cause": "The passage beckons with unknown secrets below" },
      { "emotion": "unease", "cause": "Thorne's interest in the statue suggests you're not the only one who knows" }
    ],
    "dominantMotivation": "Explore the passage and discover what the forbidden library holds"
  },

  "isEnding": false,

  "beatConcluded": true,
  "beatResolution": "Lyra located the statue of Archmagus Caelan, activated the third rune mechanism, and discovered the hidden passage to the forbidden library while narrowly avoiding detection by Librarian Thorne.",

  "deviation": {
    "deviationDetected": false,
    "deviationReason": "",
    "invalidatedBeatIds": [],
    "narrativeSummary": ""
  }
}
```

---

## Key Differences from Opening Prompt

| Aspect | Opening Prompt | Continuation Prompt |
|--------|----------------|---------------------|
| **Context provided** | Character + worldbuilding + tone + structure | All of opening PLUS global canon, character canon, NPC state, inventory, health, active state, previous narrative(s), selected choice |
| **Scene context** | None (first page) | Previous scene + optionally grandparent scene |
| **State removals** | All empty (establishing initial state) | Can remove resolved threats, constraints, threads |
| **Beat evaluation** | Beat concluded typically false | Must evaluate if beat objective achieved |
| **Deviation detection** | Not applicable | Must evaluate if future beats are invalidated |
| **protagonistAffect source** | Fresh creation | Fresh snapshot (not inherited from parent) |
| **Response includes** | `deviation` field not needed | Must include `deviation` object |

---

## Context Sections Explained

### Scene Context (Extended)
```
SCENE BEFORE LAST:
[Truncated to ~1000 chars - grandparent page narrative]

PREVIOUS SCENE:
[Truncated to ~2000 chars - parent page narrative]
```

### Active State Sections
These sections are only included when they have content:

```
CURRENT LOCATION:
East wing corridor, beside the statue of Archmagus Caelan

ACTIVE THREATS (dangers that exist NOW):
- THREAT_FACULTY_APPROACHING: A senior faculty member is approaching your position

ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
- CONSTRAINT_RESTRICTED_AREA: You are trespassing in the restricted east wing

OPEN NARRATIVE THREADS (unresolved hooks):
- THREAD_STATUE_MECHANISM: The third rune on the staff may open a hidden passage
```

### Beat Evaluation Context
The continuation prompt includes beat progression information to help the LLM determine:
1. Whether the active beat should be concluded
2. Whether the story has deviated from planned future beats

```
BEATS IN THIS ACT:
  [x] CONCLUDED: Introduction and Hook
    Resolution: Lyra was caught with the journal...
  [>] ACTIVE: First Investigation
    Objective: Explore the east wing to find the statue
  [ ] PENDING: Discovery of the Entrance
```

---

## Ending Response Example

When a story naturally concludes:

```json
{
  "narrative": "With trembling hands, you close the Codex of Unmaking and speak the words of binding...\n\n\"Welcome, Miss Lyra. Your real education begins now.\"",

  "choices": [],

  "currentLocation": "Academy entrance hall",

  "threatsAdded": [],
  "threatsRemoved": ["THREAT_GRIMWALD_SUSPICION", "THREAT_THORNE_KNOWS"],

  "constraintsAdded": [],
  "constraintsRemoved": ["CONSTRAINT_UNKNOWN_TERRITORY"],

  "threadsAdded": [],
  "threadsResolved": ["THREAD_FORBIDDEN_LIBRARY", "THREAD_JOURNAL_ORIGIN"],

  "newCanonFacts": [
    "A secret order of librarians protects the forbidden library"
  ],

  "newCharacterCanonFacts": {},

  "inventoryAdded": ["Silver librarian's pin"],
  "inventoryRemoved": [],

  "healthAdded": [],
  "healthRemoved": [],

  "characterStateChangesAdded": [
    {
      "characterName": "Professor Grimwald",
      "states": ["Revealed himself as a secret librarian", "Accepted Lyra into the order"]
    }
  ],
  "characterStateChangesRemoved": [],

  "protagonistAffect": {
    "primaryEmotion": "triumph",
    "primaryIntensity": "overwhelming",
    "primaryCause": "You succeeded in binding the Codex and earned your place among the secret librarians",
    "secondaryEmotions": [
      { "emotion": "wonder", "cause": "A whole new world of knowledge awaits" }
    ],
    "dominantMotivation": "Begin the next chapter of your journey as a secret librarian"
  },

  "isEnding": true,

  "beatConcluded": true,
  "beatResolution": "Lyra bound the Codex of Unmaking and was inducted into the secret order of librarians.",

  "deviation": {
    "deviationDetected": false,
    "deviationReason": "",
    "invalidatedBeatIds": [],
    "narrativeSummary": ""
  }
}
```

**Key ending indicators:**
- `choices: []` (empty array)
- `isEnding: true`
- Narrative provides closure
- Open threads are resolved
- Active threats are removed

---

## Notes

- **Grandparent narrative** is optional and only included when available
- **Active state sections** are omitted when empty (e.g., no threats = no threats section)
- **Beat evaluation** requires cumulative assessment across all scenes, not just the current one
- **Deviation detection** is conservative - only mark true deviation for genuine invalidation
- **Character canon vs state** distinction is critical for proper NPC tracking
- All removal fields use **prefix only** (e.g., "THREAT_FIRE"), not the full entry
