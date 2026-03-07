# NPC Intelligence Prompt (Production Template)

- Source: `src/llm/prompts/npc-intelligence-prompt.ts`
- Output schema source: `src/llm/schemas/npc-intelligence-schema.ts`
- Types: `src/llm/npc-intelligence-types.ts` (`NpcIntelligenceResult`, `NpcIntelligenceContext`, `DetectedRelationshipShift`)

## Pipeline Position

The NPC intelligence evaluator runs in parallel with the structure evaluator, promise tracker, and prose quality evaluator as part of the 4-way split analyst system:

**Pipeline position**: Planner -> Lorekeeper -> Writer -> **[Structure Evaluator | Promise Tracker | Prose Quality | NPC Intelligence]** (parallel) -> Agenda Resolver

Progress stage: `EVALUATING_NPC_INTELLIGENCE` (display name: `PROFILING`)

The NPC intelligence evaluator runs for **both opening and continuation pages**. It focuses solely on NPC behavioral consistency, relationship shifts, knowledge asymmetry, and dramatic irony opportunities. It does NOT evaluate tone, thematic charge, narrative focus, story structure, beat completion, deviation, pacing, or narrative promises — those are handled by other evaluators.

## Messages Sent To Model

### 1) System Message

```text
You are an NPC intelligence evaluator for interactive fiction. Your SINGLE responsibility is to evaluate NPC behavioral consistency, relationship shifts, knowledge asymmetry, and dramatic irony opportunities.

You do NOT evaluate tone, thematic charge, narrative focus, or prose quality. Those are handled by another evaluator.
You do NOT evaluate story structure, beat completion, deviation, pacing, or narrative promises. Those are handled by other evaluators.

NPC AGENDA COHERENCE:
- If NPC agendas are provided, evaluate whether NPC behavior in the scene aligns with their stated goals and fears.
- Set npcCoherenceAdherent to true if all NPCs who appear or act in the scene behave consistently with their agendas.
- Set npcCoherenceAdherent to false if any NPC acts contrary to their stated goal or fear without narrative justification.
- When npcCoherenceAdherent is false, write a brief npcCoherenceIssues description naming the NPC and explaining the inconsistency.
- When npcCoherenceAdherent is true or no NPC agendas are provided, set npcCoherenceIssues to an empty string.

NPC-PROTAGONIST RELATIONSHIP SHIFTS:
- If NPC relationships are provided, evaluate whether the scene caused any significant relationship changes.
- Only flag shifts that are meaningful — not every interaction is a shift.
- For each detected shift, provide the NPC name, a 1-2 sentence description of the change, a suggested valence change (-3 to +3), and a new dynamic label if the dynamic itself changed (empty string if unchanged).
- Empty array when no significant relationship shifts occurred or no relationships are provided.

INFORMATION ASYMMETRY DETECTION:
- Emit knowledgeAsymmetryDetected as an array of per-character observations grounded in scene evidence.
- Each entry must include: characterName, knownFacts, falseBeliefs, secrets.
- Use the protagonist's actual name (provided above) as characterName, NEVER use generic labels like "Protagonist" or "the protagonist".
- Use [] for knownFacts/falseBeliefs/secrets when no evidence exists for that bucket.
- Only include characters with meaningful updates or clearly evidenced knowledge state in this scene.
- Emit dramaticIronyOpportunities as concrete opportunities created by knowledge gaps in this scene.
- Return dramaticIronyOpportunities as [] when no clear dramatic irony opportunity is present.
```

### 2) User Message

```text
{{spineSection}}{{genreConventionsSection}}{{npcAgendasSection}}{{npcRelationshipsSection}}PROTAGONIST: {{protagonistName}}

NARRATIVE TO EVALUATE:
{{narrative}}
```

Optional sections are conditionally included:

- **Spine Section**: Full story spine context (when spine is available)
- **Genre Conventions Section**: Genre-level atmospheric constraints (when genreFrame is present)
- **NPC Agendas Section**: Current NPC goals and fears (when accumulatedNpcAgendas exists and is non-empty)
- **NPC Relationships Section**: NPC-protagonist relationships with dynamic, valence, and tension (when accumulatedNpcRelationships exists and is non-empty)

## JSON Response Shape

```json
{
  "npcCoherenceAdherent": true,
  "npcCoherenceIssues": "",
  "relationshipShiftsDetected": [
    {
      "npcName": "exact NPC name",
      "shiftDescription": "what changed, 1-2 sentences",
      "suggestedValenceChange": 1,
      "suggestedNewDynamic": ""
    }
  ],
  "knowledgeAsymmetryDetected": [
    {
      "characterName": "character name",
      "knownFacts": ["fact"],
      "falseBeliefs": ["false belief"],
      "secrets": ["secret"]
    }
  ],
  "dramaticIronyOpportunities": [
    "concrete opportunity created by knowledge gaps"
  ]
}
```

### Field Descriptions

- `npcCoherenceAdherent`: Whether NPCs in the scene acted consistently with their stated agendas and fears. Defaults to `true` when no NPC agendas are provided.
- `npcCoherenceIssues`: When `npcCoherenceAdherent` is `false`, briefly names the NPC and explains the inconsistency. Empty string when coherent or no agendas.
- `relationshipShiftsDetected`: Array of NPC-protagonist relationship shifts observed in this scene. Only flag significant changes, not routine interactions. Each shift includes: `npcName` (exact NPC name), `shiftDescription` (what changed, 1-2 sentences), `suggestedValenceChange` (clamped to -3..+3; positive = warmer, negative = colder), and `suggestedNewDynamic` (new dynamic label if the relationship dynamic itself changed, empty string if dynamic unchanged). These signals are forwarded to the Agenda Resolver to materialize into relationship mutations. Empty array if no shifts detected.
- `knowledgeAsymmetryDetected`: Array of per-character information-asymmetry observations evidenced by this scene. Each entry includes: `characterName`, `knownFacts` (things the character learned or confirmed), `falseBeliefs` (things the character believes incorrectly), `secrets` (information the character now knows that others don't). Use empty arrays for buckets without evidence. Only include characters with meaningful updates. Empty array when no meaningful asymmetries are observed.
- `dramaticIronyOpportunities`: Array of concrete dramatic irony opportunities surfaced by this scene — situations where player/protagonist knowledge gaps create opportunities for tension, revelation, or consequence. Empty array when no clear opportunity exists.

## Context Provided

| Context Field | Description |
|---|---|
| `narrative` | The narrative text to evaluate |
| `protagonistName` | Protagonist's full name (from decomposedCharacters[0].name) |
| `accumulatedNpcAgendas` | Optional current NPC agendas (goals, fears) |
| `accumulatedNpcRelationships` | Optional NPC-protagonist relationships (dynamic, valence, tension) |
| `spine` | Optional StorySpine for spine section |
| `genreFrame` | Optional GenreFrame for genre conventions section |

## Notes

- This stage was split from the original scene quality evaluator to isolate NPC intelligence (theory-of-mind reasoning) from prose judgment (literary evaluation).
- Prompt logging uses `promptType: 'npcIntelligence'` via `runLlmStage(...)`.
- Model routing uses stage key `npcIntelligence` in `getStageModel(...)`.
