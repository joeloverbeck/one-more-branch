# Opening Page User Prompt

This prompt is used when generating the **first page** of a new story.
It introduces the protagonist and establishes the story arc.

## Placeholders

- `{{CHARACTER_CONCEPT}}` - Required. User's character description.
- `{{WORLDBUILDING}}` - Optional. If provided, includes worldbuilding section.
- `{{TONE}}` - Required. Genre/tone descriptor.

---

Create the opening scene for a new interactive story.

CHARACTER CONCEPT:
{{CHARACTER_CONCEPT}}

{{#if WORLDBUILDING}}
WORLDBUILDING:
{{WORLDBUILDING}}

{{/if}}
TONE/GENRE: {{TONE}}

REQUIREMENTS (follow ALL):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 2-4 meaningful choices leading to genuinely DIFFERENT story directions
5. Determine the overarching goal or conflict for this story (the story arc)

REMINDER: Each choice must be something this specific character would genuinely consider.

---

## Example with Values Filled

**CHARACTER_CONCEPT**: A curious wizard apprentice named Lyra who seeks forbidden knowledge
**WORLDBUILDING**: A magical academy floating in the clouds where students learn elemental magic
**TONE**: whimsical fantasy with dark undertones

**Rendered Prompt**:

```
Create the opening scene for a new interactive story.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

REQUIREMENTS (follow ALL):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 2-4 meaningful choices leading to genuinely DIFFERENT story directions
5. Determine the overarching goal or conflict for this story (the story arc)

REMINDER: Each choice must be something this specific character would genuinely consider.
```
