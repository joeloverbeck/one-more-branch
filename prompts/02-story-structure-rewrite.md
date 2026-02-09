# Prompt 2: Story Structure Rewrite

## Purpose

Regenerates the story structure **after the narrative has deviated** from the planned beats. When the analyst detects that future beats are invalidated (e.g., the protagonist killed a key NPC who was required for an upcoming beat), this prompt rebuilds the remaining structure while preserving all completed beats as canon.

## When It Fires

Called by the engine when `deviationDetected: true` from the analyst prompt. Only the invalidated future beats are regenerated; completed beats are preserved exactly as-is.

---

## System Prompt

Uses the same `buildStructureSystemPrompt()` as the structure creation prompt. Same content policy, same structure design guidelines.

---

## User Prompt

### Injected Context Variables

| Variable | Required | Description |
|---|---|---|
| `characterConcept` | Yes | The protagonist's concept/description |
| `worldbuilding` | No | World setting details |
| `tone` | Yes | Tone/genre specification |
| `originalTheme` | Yes | The original story's overallTheme |
| `completedBeats` | Yes | Array of beats already concluded (canon) |
| `currentActIndex` | Yes | 0-indexed act where deviation occurred |
| `currentBeatIndex` | Yes | 0-indexed beat where deviation occurred |
| `deviationReason` | Yes | Why the story deviated from the plan |
| `narrativeSummary` | Yes | Current narrative state summary |

### Completed Beat Format

Each completed beat is displayed as:

```
- Act {actIndex+1}, Beat {beatIndex+1} ({beatId}) [{role}]: "{description}"
    Objective: {objective}
    Resolution: {resolution}
```

### Prompt Template

```
Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: {characterConcept}
World: {worldbuilding}
Tone: {tone}
Original Theme: {originalTheme}

## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)
The following beats have been completed. Their resolutions are permanent and must be respected.

{formatted completed beats}

## CURRENT SITUATION
Deviation occurred at: Act {currentActIndex+1}, Beat {currentBeatIndex+1}
Reason for deviation: {deviationReason}

Current narrative state:
{narrativeSummary}

## YOUR TASK
Generate NEW beats to replace invalidated ones. You are regenerating: {acts to regenerate description}.

REQUIREMENTS (follow ALL):
1. Preserve completed beats exactly--include them in the output with unchanged descriptions, objectives, and roles
2. Maintain thematic coherence with: "{originalTheme}"
3. Build naturally from the current narrative state
4. Follow three-act structure principles (setup, confrontation, resolution)
5. Keep 2-4 beats per act total (including preserved beats)
6. Beats should be flexible milestones, not rigid gates
7. Account for branching narrative paths
8. Design beats with clear dramatic roles:
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
   - Preserve beat roles from completed beats unchanged
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question (may evolve from original)
10. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's remaining scope
```

### Dynamic: "Acts to Regenerate"

Based on `currentActIndex`:
- 0: "remaining beats in Act 1, plus all of Acts 2 and 3"
- 1: "remaining beats in Act 2, plus all of Act 3"
- 2: "remaining beats in Act 3"

---

## Few-Shot Example

When `fewShotMode` is not `'none'`, a user/assistant example pair is injected.

### Few-Shot User

A scenario where a mercenary captain kills her own employer (Lord Vane), invalidating the planned beats that assumed the employer would remain alive.

### Few-Shot Assistant Response

```json
{
  "overallTheme": "Escape a blood-soaked past by completing a contract that lost its purpose, discovering whether redemption requires coin or conscience",
  "premise": "A mercenary captain kills her own employer mid-contract, leaving her to choose between finishing a purposeless extraction or abandoning the only job that could buy her freedom.",
  "pacingBudget": { "targetPagesMin": 20, "targetPagesMax": 40 },
  "acts": [
    {
      "name": "The Last Contract",
      "objective": "Deal with the aftermath of killing the employer and decide whether to continue",
      "stakes": "Failure means dying hunted or penniless",
      "entryCondition": "Already in progress",
      "beats": [
        {
          "description": "A desperate employer offers terms too good to refuse",
          "objective": "Decide whether to take the contract despite warning signs",
          "role": "setup"
        },
        {
          "description": "The true nature of the target is revealed",
          "objective": "Determine if the job is worth the escalating risk",
          "role": "turning_point"
        },
        {
          "description": "Vera must escape before Vane's death is discovered",
          "objective": "Evade pursuit and reach safety to plan the extraction alone",
          "role": "escalation"
        },
        {
          "description": "Without an employer, Vera decides whether to continue for her own reasons",
          "objective": "Commit to the extraction or abandon the contract entirely",
          "role": "turning_point"
        }
      ]
    },
    {
      "name": "Blood Without Coin",
      "objective": "Execute the extraction without a client, managing multiple hunters",
      "stakes": "Capture by Duke Ashford's enemies or death at the hands of those hunting Vane's killer",
      "entryCondition": "Vera commits to extracting Lady Elowen on her own terms",
      "beats": [
        {
          "description": "The journey reveals others hunting Lady Elowen for their own purposes",
          "objective": "Navigate competing interests while maintaining surprise",
          "role": "escalation"
        },
        {
          "description": "Lady Elowen proves to have her own agenda complicating extraction",
          "objective": "Negotiate with the target while keeping the mission viable",
          "role": "escalation"
        },
        {
          "description": "Vera's past catches up as someone from the border wars recognizes her",
          "objective": "Handle the threat without compromising the extraction",
          "role": "turning_point"
        }
      ]
    },
    {
      "name": "The Weight of Freedom",
      "objective": "Complete the extraction and choose what freedom is worth having",
      "stakes": "Becoming a fugitive with no future, having sacrificed everything for nothing",
      "entryCondition": "Lady Elowen is extracted but the path to safety is contested",
      "beats": [
        {
          "description": "Duke Ashford's forces close in, demanding both Vera and his daughter",
          "objective": "Negotiate, fight, or flee--reach a resolution with the Duke",
          "role": "turning_point"
        },
        {
          "description": "The true cost of the contract is revealed in who Vera has become",
          "objective": "Decide what legacy to leave and whether the fishing cottage is still possible",
          "role": "resolution"
        }
      ]
    }
  ]
}
```

Note: The first two beats of Act 1 are **preserved completed beats** (unchanged from the original structure). New beats start from beat 3 onward.

---

## Expected JSON Output

### Schema Name: `story_structure_generation`

Uses the **same schema** as story structure creation. All fields are required, strict mode enabled.

```json
{
  "overallTheme": "string - May evolve slightly from original, or stay the same",
  "premise": "string - 1-2 sentence story hook (may evolve from original)",
  "pacingBudget": {
    "targetPagesMin": "number - Appropriate for remaining story scope",
    "targetPagesMax": "number - Appropriate for remaining story scope"
  },
  "acts": [
    {
      "name": "string - Evocative act title",
      "objective": "string - Main goal for the act",
      "stakes": "string - Consequence of failure",
      "entryCondition": "string - What triggers transition into this act",
      "beats": [
        {
          "description": "string - What should happen (EXACT TEXT for preserved beats)",
          "objective": "string - Protagonist goal (EXACT TEXT for preserved beats)",
          "role": "string - 'setup' | 'escalation' | 'turning_point' | 'resolution'"
        }
      ]
    }
  ]
}
```

### Key Differences from Structure Creation

- Completed beats must be **included unchanged** in the output.
- The `overallTheme` may evolve slightly to accommodate the deviation.
- The `pacingBudget` should reflect remaining story scope, not total scope.
- `entryCondition` for the act where deviation occurred may be "Already in progress".

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

- Prompt builder: `src/llm/prompts/structure-rewrite-prompt.ts`
- System prompt: `src/llm/prompts/system-prompt.ts` (`buildStructureSystemPrompt`)
- JSON schema: `src/llm/schemas/structure-schema.ts` (same schema as creation)
- Types: `src/llm/types.ts` (`StructureRewriteContext`, `StructureRewriteResult`, `CompletedBeat`)
