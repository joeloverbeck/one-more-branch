# Continuation Page User Prompt

This prompt is used when generating pages **after** the opening.
It continues the story based on the player's choice.

## Placeholders

- `{{CHARACTER_CONCEPT}}` - Required. User's character description.
- `{{WORLDBUILDING}}` - Optional. If provided, includes worldbuilding section.
- `{{TONE}}` - Required. Genre/tone descriptor.
- `{{STORY_ARC}}` - Optional. The overarching goal/conflict established on page 1.
- `{{GLOBAL_CANON}}` - Optional. Bulleted list of established world facts.
- `{{ACCUMULATED_STATE}}` - Optional. Bulleted list of current character state.
- `{{PREVIOUS_NARRATIVE}}` - Required. Previous page narrative (truncated to ~2000 chars at sentence boundary).
- `{{SELECTED_CHOICE}}` - Required. The player's selected choice text.

---

Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
{{CHARACTER_CONCEPT}}

{{#if WORLDBUILDING}}
WORLDBUILDING:
{{WORLDBUILDING}}

{{/if}}
TONE/GENRE: {{TONE}}

{{#if STORY_ARC}}
STORY ARC:
{{STORY_ARC}}

{{/if}}
{{#if GLOBAL_CANON}}
ESTABLISHED WORLD FACTS:
{{GLOBAL_CANON}}

{{/if}}
{{#if ACCUMULATED_STATE}}
CURRENT STATE:
{{ACCUMULATED_STATE}}

{{/if}}
PREVIOUS SCENE:
{{PREVIOUS_NARRATIVE}}

PLAYER'S CHOICE: "{{SELECTED_CHOICE}}"

Continue the story:
1. Show the direct consequences of the player's choice.
2. Advance the narrative naturally from this decision.
3. Maintain consistency with all established facts and the current state.
4. Present 2-4 new meaningful choices (unless this leads to an ending).

---

## Example with Values Filled

**CHARACTER_CONCEPT**: A curious wizard apprentice named Lyra who seeks forbidden knowledge
**WORLDBUILDING**: A magical academy floating in the clouds
**TONE**: whimsical fantasy with dark undertones
**STORY_ARC**: Discover what lies in the forbidden library beneath the academy
**GLOBAL_CANON**:
- The forbidden library lies beneath the academy
- Professor Grimwald guards the restricted section
**ACCUMULATED_STATE**:
- Found a mysterious key in the dormitory
- Overheard a conversation about ancient texts
**PREVIOUS_NARRATIVE**: You stand before the locked door to the restricted section. The corridor is dimly lit by floating candles, their flames flickering nervously as if sensing your intentions. A faint humming emanates from beyond the door, and you notice arcane symbols etched into the ancient wood.
**SELECTED_CHOICE**: Try to pick the lock with a hairpin

**Rendered Prompt**:

```
Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds

TONE/GENRE: whimsical fantasy with dark undertones

STORY ARC:
Discover what lies in the forbidden library beneath the academy

ESTABLISHED WORLD FACTS:
- The forbidden library lies beneath the academy
- Professor Grimwald guards the restricted section

CURRENT STATE:
- Found a mysterious key in the dormitory
- Overheard a conversation about ancient texts

PREVIOUS SCENE:
You stand before the locked door to the restricted section. The corridor is dimly lit by floating candles, their flames flickering nervously as if sensing your intentions. A faint humming emanates from beyond the door, and you notice arcane symbols etched into the ancient wood.

PLAYER'S CHOICE: "Try to pick the lock with a hairpin"

Continue the story:
1. Show the direct consequences of the player's choice.
2. Advance the narrative naturally from this decision.
3. Maintain consistency with all established facts and the current state.
4. Present 2-4 new meaningful choices (unless this leads to an ending).
```
