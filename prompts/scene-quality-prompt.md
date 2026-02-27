# Scene Quality Prompt (Production Template)

- Source: `src/llm/prompts/scene-quality-prompt.ts`
- Output schema source: `src/llm/schemas/scene-quality-schema.ts`

## Pipeline Position

The scene quality evaluator runs in parallel with the structure evaluator and promise tracker as part of the split analyst system:

**Pipeline position**: Planner -> Lorekeeper -> Writer -> **[Structure Evaluator | Promise Tracker | Scene Quality]** (parallel) -> Agenda Resolver

Progress stage: `ASSESSING_QUALITY` (display name: `APPRAISING`)

The scene quality evaluator runs for **both opening and continuation pages**. It focuses solely on quality metrics and does not evaluate story structure, beat completion, deviation, pacing, or narrative promises.

## Messages Sent To Model

### 1) System Message

```text
You are a scene quality evaluator for interactive fiction. Your SINGLE responsibility is to evaluate narrative quality, tone adherence, thematic coherence, and NPC consistency.

You do NOT evaluate story structure, beat completion, deviation, pacing, or narrative promises. Those are handled by other evaluators.

TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}

TONE EVALUATION:
- Set toneAdherent to true if the narrative's mood, vocabulary, and emotional register match the target tone.
- Set toneAdherent to false if the narrative drifts toward a different genre feel (e.g., grimdark when tone should be comedic).
- When toneAdherent is false, write a brief toneDriftDescription explaining what feels off and what the tone should be instead.
- When toneAdherent is true, set toneDriftDescription to an empty string.

THEMATIC CHARGE CLASSIFICATION:
- If THEMATIC KERNEL context is present, classify scene-level thematic valence:
  - THESIS_SUPPORTING: scene consequences/actions support the thesis-direction answer to the thematic question.
  - ANTITHESIS_SUPPORTING: scene consequences/actions support the antithesis-direction answer.
  - AMBIGUOUS: evidence is mixed, unresolved, or equally supports both sides.
- Set thematicCharge to exactly one enum value.
- Set thematicChargeDescription to 1-2 sentences citing concrete scene evidence.
- If THEMATIC KERNEL context is absent, default to thematicCharge = AMBIGUOUS with a concise neutral description.

NARRATIVE FOCUS CLASSIFICATION:
- Classify scene focus as exactly one:
  - DEEPENING: primarily develops existing conflicts, promises, relationships, or known constraints.
  - BROADENING: primarily introduces new factions, mysteries, goals, locations, or major scope expansions.
  - BALANCED: meaningfully deepens existing threads while adding limited new elements.
- Prefer DEEPENING when uncertain between DEEPENING and BALANCED.
- Prefer BALANCED when uncertain between BALANCED and BROADENING.

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
- Use [] for knownFacts/falseBeliefs/secrets when no evidence exists for that bucket.
- Only include characters with meaningful updates or clearly evidenced knowledge state in this scene.
- Emit dramaticIronyOpportunities as concrete opportunities created by knowledge gaps in this scene.
- Return dramaticIronyOpportunities as [] when no clear dramatic irony opportunity is present.
```

The tone block is injected between the role intro and the evaluation rules.

### 2) User Message

```text
{{spineSection}}{{genreConventionsSection}}{{thematicKernelSection}}{{npcAgendasSection}}{{npcRelationshipsSection}}
NARRATIVE TO EVALUATE:
{{narrative}}
```

Optional sections are conditionally included:

- **Spine Section**: Full story spine context (when spine is available)
- **Genre Conventions Section**: Genre-level atmospheric constraints (when genreFrame is present)
- **Thematic Kernel Section**: Thematic question and antithesis (when either is present)
- **NPC Agendas Section**: Current NPC goals and fears (when accumulatedNpcAgendas exists and is non-empty)
- **NPC Relationships Section**: NPC-protagonist relationships with dynamic, valence, and tension (when accumulatedNpcRelationships exists and is non-empty)

## JSON Response Shape

```json
{
  "toneAdherent": {{true|false}},
  "toneDriftDescription": "{{string, empty when toneAdherent is true}}",
  "thematicCharge": "{{THESIS_SUPPORTING|ANTITHESIS_SUPPORTING|AMBIGUOUS}}",
  "thematicChargeDescription": "{{1-2 sentences with scene evidence}}",
  "narrativeFocus": "{{DEEPENING|BROADENING|BALANCED}}",
  "npcCoherenceAdherent": {{true|false}},
  "npcCoherenceIssues": "{{string, empty when coherent or no agendas}}",
  "relationshipShiftsDetected": [
    {
      "npcName": "{{exact NPC name}}",
      "shiftDescription": "{{what changed, 1-2 sentences}}",
      "suggestedValenceChange": "{{-3 to +3}}",
      "suggestedNewDynamic": "{{new dynamic label or empty string}}"
    }
  ],
  "knowledgeAsymmetryDetected": [
    {
      "characterName": "{{character name}}",
      "knownFacts": ["{{fact}}"],
      "falseBeliefs": ["{{false belief}}"],
      "secrets": ["{{secret}}"]
    }
  ],
  "dramaticIronyOpportunities": [
    "{{concrete opportunity created by knowledge gaps}}"
  ]
}
```

### Field Descriptions

- `toneAdherent`: Whether the narrative prose matches the target tone in mood, vocabulary, and emotional register. Defaults to `true`.
- `toneDriftDescription`: When `toneAdherent` is `false`, briefly describes what feels off and what the tone should be instead. Empty string when adherent.
- `thematicCharge`: Scene-level thematic valence relative to the thematic kernel. One of: THESIS_SUPPORTING (scene outcomes support the thesis direction), ANTITHESIS_SUPPORTING (scene outcomes support the antithesis direction), or AMBIGUOUS (evidence is mixed or unresolved). Defaults to AMBIGUOUS.
- `thematicChargeDescription`: 1-2 sentences explaining the thematicCharge classification with concrete scene evidence.
- `narrativeFocus`: Scene-level depth-vs-breadth focus. DEEPENING develops existing threads/relationships/conflicts; BROADENING introduces new elements or expands scope; BALANCED does both meaningfully without strong dominance. Defaults to BALANCED.
- `npcCoherenceAdherent`: Whether NPCs in the scene acted consistently with their stated agendas and fears. Defaults to `true` when no NPC agendas are provided.
- `npcCoherenceIssues`: When `npcCoherenceAdherent` is `false`, briefly names the NPC and explains the inconsistency (e.g., "Algar pursued reconciliation when his stated fear is vulnerability"). Empty string when coherent or no agendas.
- `relationshipShiftsDetected`: Array of NPC-protagonist relationship shifts observed in this scene. Only flag significant changes, not routine interactions. Each shift includes: `npcName` (exact NPC name), `shiftDescription` (what changed, 1-2 sentences), `suggestedValenceChange` (clamped to -3..+3; positive = warmer, negative = colder), and `suggestedNewDynamic` (new dynamic label if the relationship dynamic itself changed, empty string if dynamic unchanged). These signals are forwarded to the Agenda Resolver to materialize into relationship mutations. Empty array if no shifts detected.
- `knowledgeAsymmetryDetected`: Array of per-character information-asymmetry observations evidenced by this scene. Each entry includes: `characterName`, `knownFacts` (things the character learned or confirmed), `falseBeliefs` (things the character believes incorrectly), `secrets` (information the character now knows that others don't). Use empty arrays for buckets without evidence. Only include characters with meaningful updates or clearly evidenced knowledge state in this scene. Empty array when no meaningful asymmetries are observed.
- `dramaticIronyOpportunities`: Array of concrete dramatic irony opportunities surfaced by this scene—situations where player/protagonist knowledge gaps create opportunities for tension, revelation, or consequence. Each entry should name the knowledge gap and the potential dramatic impact. Empty array when no clear opportunity exists.
