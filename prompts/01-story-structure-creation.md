# Prompt 1: Story Structure Creation

## Purpose

Generates a three-act story structure **before the first page is written**. This is the narrative blueprint that guides all subsequent page generation. It defines the dramatic arc, acts, beats, stakes, and pacing budget for the entire interactive story.

## When It Fires

Called once at story creation time, before any narrative content is generated. The user has provided a character concept, worldbuilding, and tone/genre.

---

## System Prompt

The system prompt establishes the LLM as an expert interactive fiction storyteller specializing in story structure and dramatic arc design. It is deliberately minimal compared to the writer prompts -- no state/inventory/health management, no choice guidelines, since this prompt only produces a structural plan, not narrative pages.

### Content Policy

Included in the system prompt. NC-21 adults-only policy: all topics, themes, and content are permissible without self-censorship. Explicit content, violence, sexual themes, substance use, and controversial themes are all allowed.

### Structure Design Guidelines

```
- Create compelling three-act dramatic structures.
- Design beats as flexible milestones that allow branching paths.
- Ensure stakes escalate naturally through the narrative.
- Make entry conditions clear but not overly prescriptive.
- Balance setup, confrontation, and resolution across acts.
- Consider pacing suitable for 15-50 page interactive stories.
```

---

## User Prompt

### Injected Context Variables

| Variable | Required | Description |
|---|---|---|
| `characterConcept` | Yes | The protagonist's concept/description |
| `worldbuilding` | No | World setting details |
| `npcs` | No | Available NPC characters (name + description each) |
| `startingSituation` | No | A specific opening situation to honor |
| `tone` | Yes | Tone/genre specification |

### Prompt Template

```
Generate a story structure before the first page.

CHARACTER CONCEPT:
{characterConcept}

WORLDBUILDING:
{worldbuilding}

NPCS (Available Characters):
{formatted NPCs}

STARTING SITUATION:
{startingSituation}

TONE/GENRE: {tone}

REQUIREMENTS (follow ALL):
1. Return exactly 3 acts following setup, confrontation, and resolution.
2. For each act, include 2-4 beats that function as flexible milestones, not rigid gates.
3. Ensure beats are branching-aware so different player choices can still plausibly satisfy them.
4. Reflect the character concept in the protagonist's journey, conflicts, and opportunities.
5. Use worldbuilding details to shape stakes, pressures, and act entry conditions.
6. Calibrate intensity and storytelling style to the specified tone.
7. Design structure pacing suitable for a 15-50 page interactive story.
8. Design beats with clear dramatic roles:
   - At least one beat in Act 1 should be a "turning_point" representing a point of no return
   - The midpoint of the story (typically late Act 1 or mid Act 2) should include a reveal or reversal that reframes prior events
   - Act 3 should include a "turning_point" beat representing a crisis -- an impossible choice or sacrifice
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question the story explores.
10. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's scope.
```

---

## Few-Shot Example

When `fewShotMode` is not `'none'`, a user/assistant example pair is injected before the actual user prompt.

### Few-Shot User

```
Generate a story structure before the first page.

CHARACTER CONCEPT:
A disgraced city guard seeking redemption

WORLDBUILDING:
A plague-ridden port city ruled by merchant houses and secret tribunals

TONE/GENRE: grim political fantasy
```

### Few-Shot Assistant Response

```json
{
  "overallTheme": "Redeem a stained name by exposing the city tribunal's crimes",
  "premise": "A disgraced guard must infiltrate the tribunal that framed her to uncover proof of their corruption before they execute her as a scapegoat.",
  "pacingBudget": { "targetPagesMin": 20, "targetPagesMax": 40 },
  "acts": [
    {
      "name": "Ashes of Trust",
      "objective": "Force the protagonist into a dangerous comeback",
      "stakes": "Failure means execution as a convenient scapegoat",
      "entryCondition": "The protagonist is blamed for a public murder",
      "beats": [
        {
          "description": "A former ally offers proof of a frame-up in exchange for protection",
          "objective": "Decide whether to trust an ally tied to the tribunal",
          "role": "setup"
        },
        {
          "description": "The protagonist steals sealed court ledgers from a guarded archive",
          "objective": "Secure evidence before the tribunal can destroy it",
          "role": "turning_point"
        }
      ]
    },
    {
      "name": "Knives in Council",
      "objective": "Expose the network behind the frame-up while hunted",
      "stakes": "Failure lets the conspirators tighten martial law",
      "entryCondition": "The stolen ledgers reveal a list of compromised officials",
      "beats": [
        {
          "description": "Rival houses demand proof before committing support",
          "objective": "Win backing without revealing all leverage",
          "role": "escalation"
        },
        {
          "description": "The protagonist is cornered into a public hearing rigged by enemies",
          "objective": "Survive the hearing and force hidden evidence into the open",
          "role": "turning_point"
        }
      ]
    },
    {
      "name": "The Broken Seal",
      "objective": "Resolve the conspiracy and define what redemption costs",
      "stakes": "Failure dooms the city to permanent authoritarian rule",
      "entryCondition": "Key conspirators are identified and vulnerable",
      "beats": [
        {
          "description": "A final alliance fractures over how far justice should go",
          "objective": "Choose between revenge and legitimate accountability",
          "role": "turning_point"
        },
        {
          "description": "The protagonist confronts the tribunal leadership at the old harbor court",
          "objective": "End the conspiracy while preserving a future worth protecting",
          "role": "resolution"
        }
      ]
    }
  ]
}
```

---

## Expected JSON Output

### Schema Name: `story_structure_generation`

Strict mode is enabled (`additionalProperties: false`). All fields are required.

```json
{
  "overallTheme": "string - The overarching thematic statement of the story",
  "premise": "string - 1-2 sentence story hook capturing the core dramatic question",
  "pacingBudget": {
    "targetPagesMin": "number - Minimum target page count for the full story (10-80)",
    "targetPagesMax": "number - Maximum target page count for the full story (10-80)"
  },
  "acts": [
    {
      "name": "string - Evocative act title",
      "objective": "string - Main goal for the act",
      "stakes": "string - Consequence of failure",
      "entryCondition": "string - What triggers transition into this act",
      "beats": [
        {
          "description": "string - What should happen in this beat",
          "objective": "string - Specific protagonist goal for the beat",
          "role": "string - One of: 'setup' | 'escalation' | 'turning_point' | 'resolution'"
        }
      ]
    }
  ]
}
```

### Constraints

- `acts` must contain **exactly 3** items.
- Each act must have **2-4 beats**.
- Beat `role` is an enum: `"setup"`, `"escalation"`, `"turning_point"`, `"resolution"`.
- Act 1 must have at least one `turning_point` beat.
- Act 3 must have a `turning_point` beat (crisis) and typically ends with a `resolution` beat.
- The story midpoint should include a reveal or reversal.

---

## Message Structure

```
[
  { role: "system",    content: <structure system prompt> },
  { role: "user",      content: <few-shot user example> },       // optional
  { role: "assistant", content: <few-shot assistant response> },  // optional
  { role: "user",      content: <actual user prompt> }
]
```

---

## Source Files

- Prompt builder: `src/llm/prompts/structure-prompt.ts`
- System prompt: `src/llm/prompts/system-prompt.ts` (`buildStructureSystemPrompt`)
- JSON schema: `src/llm/schemas/structure-schema.ts`
- Types: `src/llm/types.ts` (no dedicated result type -- result is parsed into `StoryStructure` from `src/models/story-arc.ts`)
