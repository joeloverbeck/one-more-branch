# JSON Schema Field Descriptions

When using structured outputs (the primary path), the LLM receives a JSON schema that constrains its output format. The **descriptions** in this schema serve as implicit prompt instructions, guiding the LLM on what to generate for each field.

This file documents those descriptions for research purposes.

---

## Schema Structure

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "story_generation",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": { ... },
      "required": ["narrative", "choices", "stateChanges", "canonFacts", "isEnding"],
      "additionalProperties": false
    }
  }
}
```

---

## Field Descriptions

### `narrative` (string, required)

**Description**:
> Vivid prose describing scene, action, dialogue, and outcomes. Minimum 100 words. Write in second person.

**Purpose**: The main story text for the page. This is what the player reads.

**Constraints**:
- Minimum 50 characters (Zod validation)
- Maximum 15,000 characters (Zod validation)
- Should use "you" perspective

---

### `choices` (array of strings, required)

**Description**:
> Array of 2-5 meaningful choices. Use an empty array only for a story ending.

**Purpose**: Player options for what to do next.

**Constraints**:
- Empty array ONLY when `isEnding` is true
- 2-5 choices when `isEnding` is false
- Each choice: 3-300 characters
- No duplicates (case-insensitive)
- Each choice should lead to genuinely different outcomes

---

### `stateChanges` (array of strings, required)

**Description**:
> Events that happened in this scene only.

**Purpose**: Track what changed during THIS scene. Used for branch-isolated state.

**Examples**:
- "Hero was wounded in the arm"
- "Acquired the Moonstone Pendant"
- "Lost 50 gold coins to the thief"
- "Made an enemy of Lord Blackwood"

**Important**: Do NOT repeat state from previous scenes. Only new changes.

---

### `canonFacts` (array of strings, required)

**Description**:
> New permanent world facts that should persist.

**Purpose**: Establish world lore that applies across ALL branches of the story.

**Examples**:
- "The Kingdom of Valdris lies to the north"
- "Captain Mira leads the city guard"
- "Dragons have been extinct for 500 years"
- "The annual Festival of Flames occurs every autumn"

**Important**: Only include facts that should be true in ALL story branches.

---

### `isEnding` (boolean, required)

**Description**:
> True only when the story concludes and choices is empty.

**Purpose**: Signal that this page is a story ending (death, victory, resolution).

**Invariant**: `isEnding === true` ⟺ `choices.length === 0`

---

### `storyArc` (string, optional)

**Description**:
> Main goal/conflict for the story opening page.

**Purpose**: Establish the overarching narrative goal on the first page only.

**Examples**:
- "Defeat the dragon and save the kingdom"
- "Discover who murdered the king"
- "Escape the haunted mansion before dawn"
- "Find the legendary treasure of Captain Blackbeard"

**Usage**: Only generated for opening/first page. Empty or omitted for continuation pages.

---

## How Schema Descriptions Guide Output

The LLM uses these descriptions to understand:

1. **What to generate**: "Vivid prose describing scene, action, dialogue"
2. **How to format**: "Write in second person"
3. **Constraints**: "2-5 meaningful choices", "Minimum 100 words"
4. **When to use**: "Use an empty array only for a story ending"
5. **Scope**: "Events that happened in this scene only"

This approach is cleaner than text-based format instructions because:
- The schema enforces structure (JSON)
- Descriptions guide content
- Zod validation catches violations
- No parsing of text markers needed
