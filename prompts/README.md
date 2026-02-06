# LLM Prompts for One More Branch

This folder contains all prompts used by the application for LLM story generation.
The prompts are extracted from the codebase to facilitate external research and improvement.

## File Structure

| File | Purpose |
|------|---------|
| `system-prompt.md` | Base system prompt establishing the storyteller role |
| `content-policy.md` | NC-21 content guidelines included in every prompt |
| `opening-user-prompt.md` | User prompt template for generating story openings |
| `continuation-user-prompt.md` | User prompt template for continuing the story |
| `fallback-output-format.md` | Format instructions appended when structured output is unavailable |
| `json-schema-descriptions.md` | Schema field descriptions that guide LLM output structure |

## Examples Folder

Complete assembled examples showing exactly what gets sent to the API:

| File | Description |
|------|-------------|
| `examples/opening-complete.md` | Full opening request with all components |
| `examples/continuation-complete.md` | Full continuation request with context |
| `examples/ending-complete.md` | Example ending responses (death/victory) |
| `examples/fallback-mode-complete.md` | Request format when structured output unavailable |

## Placeholder Reference

Dynamic values in prompts use `{{PLACEHOLDER}}` syntax:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{CHARACTER_CONCEPT}}` | User-provided character description | "A curious wizard apprentice named Lyra who seeks forbidden knowledge" |
| `{{WORLDBUILDING}}` | Optional world/setting details | "A magical academy floating in the clouds" |
| `{{TONE}}` | Genre/tone descriptor | "dark fantasy with horror elements" |
| `{{STORY_ARC}}` | Overarching goal established on page 1 | "Discover the truth behind the ancient prophecy" |
| `{{GLOBAL_CANON}}` | Accumulated world facts (bulleted) | "- The Kingdom of Valdris rules the north\n- Magic is forbidden by law" |
| `{{ACCUMULATED_STATE}}` | Current character state (bulleted) | "- Hero was wounded in the arm\n- Carrying the Moonstone Pendant" |
| `{{PREVIOUS_NARRATIVE}}` | Previous page's narrative (truncated to 2000 chars) | "You stand before the ancient temple..." |
| `{{SELECTED_CHOICE}}` | The player's choice text | "Enter the dark forest" |

## Prompt Assembly

### For Story Openings (Structured Output Mode)
```
System: [system-prompt.md]
User:   [opening-user-prompt.md with placeholders filled]
```

### For Story Continuations (Structured Output Mode)
```
System: [system-prompt.md]
User:   [continuation-user-prompt.md with placeholders filled]
```

### For Fallback Text Mode
When the model doesn't support structured outputs, append `fallback-output-format.md` to the system prompt.

## Notes for Prompt Research

1. **Structured Output**: The primary path uses JSON schema (see `json-schema-descriptions.md`) to constrain output format, so the prompts themselves don't include format instructions.

2. **Fallback Mode**: When structured output isn't available, `fallback-output-format.md` is appended to teach the LLM the expected text format.

3. **Content Policy**: Always included - this is an adults-only application with no content restrictions.

4. **Second Person**: All narrative should use "you" perspective.

5. **Choice Requirements**: Non-ending pages need 2-5 unique, meaningful choices.
