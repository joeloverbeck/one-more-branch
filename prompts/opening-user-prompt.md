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

Write an engaging opening that:
1. Introduces the protagonist in a compelling scene.
2. Establishes the world and atmosphere matching the tone.
3. Presents an initial situation or hook that draws the player in.
4. Provides 2-4 meaningful choices for what the protagonist might do.

Also determine the overarching goal or conflict for this story (the story arc).

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

Write an engaging opening that:
1. Introduces the protagonist in a compelling scene.
2. Establishes the world and atmosphere matching the tone.
3. Presents an initial situation or hook that draws the player in.
4. Provides 2-4 meaningful choices for what the protagonist might do.

Also determine the overarching goal or conflict for this story (the story arc).
```
