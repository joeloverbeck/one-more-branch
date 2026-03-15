# Spine Foundation Prompt (Production Template)

- Source: `src/llm/prompts/spine-foundation-prompt.ts`
- Output schema source: `src/llm/schemas/spine-foundation-schema.ts`
- Generator source: `src/llm/spine-generator.ts`
- Stage execution: `src/llm/spine-generator.ts` uses internal `fetchStage()` helper with `withRetry()` and `withModelFallback()`
- Model selection: Per-stage via `getStageModel('spineFoundation')` from `src/config/stage-model.ts` (default: falls back to `config.llm.defaultModel`)

## Pipeline Position

This is **Stage 1 of 3** in the multi-stage spine pipeline. It runs **before entity decomposition and structure generation**, as the first LLM call in story creation. It generates 5-6 thematic foundations that establish the bedrock choices (conflict axis, character arc trajectory, protagonist's deepest fear, tonal direction) for the story.

**Pipeline position**: **Spine Foundation (Stage 1)** -> Spine Arc Engine (Stage 2) -> Spine Synthesis (Stage 3) -> Entity Decomposer -> Structure -> Planner -> Lorekeeper -> Writer -> Analyst -> Agenda Resolver

The foundation operates at the THEMATIC level only. It does NOT determine plot patterns, opposition sources, need/want, antagonistic forces, or dramatic questions -- those come in Stages 2 and 3. Its job is to establish the emotional and philosophical DNA of the story.

When a `conceptSpec` is provided (from the `/concepts` page), the prompt includes a CONCEPT ANALYSIS section with conflict engine fields and protagonist arc grounding. When a concept provides a `conflictAxis`, all foundations are locked to that exact value (divergence must come from other fields). Similarly, when a `storyKernel` is provided, the kernel's `conflictAxis` is locked and its `dramaticThesis` constrains the `thematicPremise`.

When `contentPreferences` is provided (from `ConceptSeeds`), a CONTENT PREFERENCES section is included.

## Messages Sent To Model

### 1) System Message

```text
You are a story architect specializing in thematic foundation design for interactive branching fiction. Your task is to generate 5-6 DIVERGENT thematic foundations -- the bedrock choices (conflict axis, character arc trajectory, protagonist's deepest fear, and tonal direction) that will anchor the entire story.

You work at the THEMATIC level only. You do NOT determine plot patterns, opposition sources, need/want, antagonistic forces, or dramatic questions -- those come in later stages. Your job is to establish the emotional and philosophical DNA of the story.

TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
[standard content policy]

FOUNDATION DESIGN GUIDELINES:
- conflictAxis: THE root thematic choice. It determines the philosophical tension that permeates every scene.
- characterArcType: The trajectory of transformation. POSITIVE_CHANGE (grows), FLAT (tests existing belief), DISILLUSIONMENT (learns hard truth), FALL (loses way), CORRUPTION (becomes what they opposed).
- protagonistDeepestFear: Following Truby's backward-design principle, start with the fear. This is the emotional engine -- it determines WHY the character resists change and shapes everything downstream (need, want, antagonistic force).
- toneFeel: 3-5 atmospheric adjectives describing HOW the story FEELS -- sensory, emotional, rhythmic qualities. Do NOT repeat genre labels.
- toneAvoid: 3-5 tonal anti-patterns the story must never drift toward.
- thematicPremise: An Egri-style one-line premise (e.g., "Ruthless ambition leads to self-destruction"). This guides later stages but is NOT stored on the final spine.
```

### 2) User Message

```text
Generate 5-6 thematic foundations for the following story setup.

CHARACTER CONCEPT:
{{characterConcept}}

{{#if decomposedWorld}}
WORLDBUILDING:
{{decomposedWorld formatted as structured world facts}}
{{else if worldbuilding}}
WORLDBUILDING:
{{worldbuilding}}
{{/if}}

{{#if decomposedCharacters.length}}
CHARACTERS (Pre-Decomposed Profiles):
{{decomposedCharacters formatted as standalone summaries}}
{{else if npcs.length}}
NPCS (Available Characters):
{{formattedNpcs}}
{{/if}}

{{#if startingSituation}}
STARTING SITUATION:
{{startingSituation}}
{{/if}}

{{#if contentPreferences}}
CONTENT PREFERENCES (user creative direction -- incorporate into foundation design):
{{contentPreferences}}
{{/if}}

{{#if conceptSpec}}
CONCEPT ANALYSIS (from upstream concept generation -- use as grounding):
[Narrative Identity, Protagonist, Conflict Engine, Protagonist Arc Grounding fields]
CONSTRAINT: The protagonistDeepestFear should connect to the ghost -- the wound that makes letting go of the lie terrifying.
{{/if}}

{{#if storyKernel}}
THEMATIC KERNEL (the spine's philosophical foundation):
[kernel fields including dramaticThesis, conflictAxis, dramaticStance, thematicQuestion]
CONSTRAINT: The thematicPremise should operationalize the kernel's dramaticThesis.
When kernel specifies conflictAxis, ALL foundations MUST use that exact value.
{{/if}}

TONE/GENRE: {{tone}}

{{#if lockedConflictAxis}}
CONFLICT AXIS LOCK: All foundations MUST use conflictAxis "{{lockedConflictAxis}}". Diverge on ALL other fields instead.
{{/if}}

DIVERGENCE CONSTRAINTS:
- Generate 5-6 foundations (prefer 6).
- Minimum 4 distinct conflictAxis values across all foundations (unless locked by concept/kernel).
- Minimum 3 distinct characterArcType values across all foundations.
- No two foundations may share BOTH the same conflictAxis AND characterArcType.
- Each foundation must feel like the seed of a genuinely different story direction.

FIELD INSTRUCTIONS:
- conflictAxis: The thematic tension axis (INDIVIDUAL_VS_SYSTEM, TRUTH_VS_STABILITY, DUTY_VS_DESIRE, FREEDOM_VS_SAFETY, KNOWLEDGE_VS_INNOCENCE, POWER_VS_MORALITY, LOYALTY_VS_SURVIVAL, IDENTITY_VS_BELONGING, JUSTICE_VS_MERCY, PROGRESS_VS_TRADITION).
- characterArcType: The character arc trajectory (POSITIVE_CHANGE, FLAT, DISILLUSIONMENT, FALL, CORRUPTION).
- protagonistDeepestFear: The fear that drives the protagonist to resist transformation. Following Truby's backward-design: start here, everything else follows. One sentence specific to THIS character.
- toneFeel: 3-5 atmospheric adjectives. NOT genre labels. Ask: "If I were inside this story, what would I feel on my skin, in my gut, in my pulse?"
- toneAvoid: 3-5 tonal anti-patterns the story must NEVER drift toward.
- thematicPremise: Egri-style one-line premise. When a kernel exists, operationalize its dramaticThesis.

OUTPUT SHAPE:
- foundations: array of 5-6 foundation objects, each containing all fields above
```

## JSON Response Shape

```json
{
  "foundations": [
    {
      "conflictAxis": "{{INDIVIDUAL_VS_SYSTEM|TRUTH_VS_STABILITY|DUTY_VS_DESIRE|FREEDOM_VS_SAFETY|KNOWLEDGE_VS_INNOCENCE|POWER_VS_MORALITY|LOYALTY_VS_SURVIVAL|IDENTITY_VS_BELONGING|JUSTICE_VS_MERCY|PROGRESS_VS_TRADITION}}",
      "characterArcType": "{{POSITIVE_CHANGE|FLAT|DISILLUSIONMENT|FALL|CORRUPTION}}",
      "protagonistDeepestFear": "{{fear that drives the protagonist to resist transformation}}",
      "toneFeel": ["{{atmospheric adjective 1}}", "{{atmospheric adjective 2}}", "{{atmospheric adjective 3}}"],
      "toneAvoid": ["{{tonal anti-pattern 1}}", "{{tonal anti-pattern 2}}", "{{tonal anti-pattern 3}}"],
      "thematicPremise": "{{Egri-style one-line premise}}"
    }
  ]
}
```

- The `foundations` array must contain 5-6 objects. The parser rejects responses outside that range.
- `thematicPremise` is scaffolding for Stage 2 (Arc Engine) -- it is NOT stored on the final `StorySpine`.
- The `conflictAxis` enum includes 10 values (the full `ConflictAxis` set), vs the old single-stage spine which only had 8.
- When a concept or kernel locks `conflictAxis`, all foundations share that value and divergence comes from `characterArcType`, `protagonistDeepestFear`, `toneFeel`/`toneAvoid`, and `thematicPremise`.
- The foundation output is passed as locked input to Stage 2 (Arc Engine Elaboration).
