# Spec: Content Packets Pipeline Improvements

**Status**: COMPLETED
**Archived**: 2026-03-25

## Problem Statement

The content packets pipeline (Taste Distiller -> Sparkstormer -> Content Packeter -> Content Evaluator) generates vivid premise seeds for branching interactive fiction. An external review identified significant gaps validated against narrative theory research:

1. **Aesthetic-only taste profiling**: The Taste Distiller captures what the user likes aesthetically (collision patterns, tone blend, scene appetites) but not *how they want to interact* with stories. Choice-poetics research (Mawhorter, Ashwell, Murray) shows that player engagement modes and value tensions are distinct axes of taste that aesthetic profiling alone cannot capture.

2. **Sparks lack agency grounding**: Sparkstormer produces "charged fragments" that can be atmospheric and vivid but imply nothing about protagonist position, desire, or opposition. This forces the Packeter to invent interactive structure from pure mood, which is too much deferred work.

3. **Evaluator optimization mismatch**: The Evaluator scores 8 dimensions but never scores *taste alignment* — the primary product goal. Computational creativity research (Boden) confirms that novelty without relevance is insufficient; both must be scored. Additionally, `antiGenericity` conflates surface novelty with structural originality, and `conceptUtility` is too vague to be actionable.

4. **Missing content kinds**: The `ContentKind` enum lacks PLACE and SECRET — two categories fundamental to interactive fiction (Jenkins: environmental storytelling; information asymmetry drives IF engagement).

5. **Optional viewpoint**: The Packeter's `viewpointPressure` is optional, but protagonist position is mandatory for interactive fiction seeds where player agency depends on having a position from which to act.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Engagement mode representation | Free-form strings, not fixed enum | Richer expression; ROLEPLAY/INVESTIGATIVE/etc. taxonomy is ChatGPT's synthesis, not established research. Free-form avoids false precision |
| Choice mechanics in packets | Excluded (premise-seeds-only) | The story engine already has ChoiceType (11 types), PrimaryDelta (12 types), and full choice generation. Duplicating this in content packets adds complexity without value |
| Force dynamics field | Excluded | Talmy's cognitive linguistics framework has no published application to narrative conflict modeling. Risk of confusing the LLM |
| Spark hybridization (relax 1:1) | Excluded | Engineering complexity + traceability cost outweigh recombination benefits at this pipeline stage |
| Novelty mode (Boden) | Prompt-level diversity constraint, not per-spark field | Reduces schema bloat while still encouraging combinational/exploratory/transformational variety |
| antiGenericity split | surfaceFreshness + deepOriginality | A packet can be superficially legible but structurally unprecedented. Single score conflates these distinct qualities |
| conceptUtility replacement | causalSpecificity | "Could you build a story from this?" is sharper than "Is this useful?" — forces evaluation of mechanism specificity |
| Ontology normalization | Documentation, not schema renames | humanAnchors/humanAnchor/humanAche are related but distinct concepts; renaming would break saved data and obscure intentional distinctions |

## Research Basis

| Concept | Source | Application |
|---------|--------|-------------|
| Choice-poetics | Peter Mawhorter (UC Santa Cruz), Sam Kabo Ashwell ("Bestiary of Player Agency"), Janet Murray | engagementModes, playerRole, playerPosition — players need a position from which to act |
| Computational creativity types | Margaret Boden (combinational, exploratory, transformational) | Sparkstormer portfolio constraints — force novelty diversity |
| Environmental storytelling | Henry Jenkins ("Game Design as Narrative Architecture") | PLACE content kind — navigable narrative architectures |
| Player motivation | Bartle types, Self-Determination Theory (Deci/Ryan), Yee's Motivations | engagementModes design — grounded in motivation research, but free-form rather than fixed taxonomy |
| Multi-critic generation | Multi-agent story generation research (2024-2025) | tasteAlignment scoring — targeted critique improves selection without killing coherence |

---

## Stage 1: Taste Distiller

### New Fields on `TasteProfile`

#### `engagementModes: readonly string[]` (3-5 items)

Free-form strings describing how the user wants to interact with stories.

**Examples**: "inhabit a morally compromised role and navigate the consequences", "investigate hidden systems and piece together the truth", "protect something fragile against overwhelming odds"

**Prompt guidance**: "What kinds of agency does the user crave? How do they want to inhabit the story — as investigator, protector, transgressor, optimizer, expresser? Describe each mode as a concrete activity, not a label."

**Distinct from existing fields**: `sceneAppetites` captures scene *types* (e.g., "tense negotiations", "body horror reveals"); `engagementModes` captures the player's *role* in those scenes (e.g., "negotiate from a position of hidden weakness").

#### `valueTensions: readonly string[]` (3-6 items)

Thematic conflict pairs the user is drawn to.

**Examples**: "loyalty vs survival", "truth vs stability", "justice vs mercy", "identity vs belonging"

**Prompt guidance**: "What ethical or thematic tensions recur across the exemplars? These are value collisions the user wants to inhabit, not plot elements. Express as 'X vs Y' pairs."

**Distinct from existing fields**: `collisionPatterns` captures what *elements* collide (e.g., "sacred ritual meets industrial bureaucracy"); `valueTensions` captures what *values* are in conflict (e.g., "duty vs desire"). Maps to the project's existing `ConflictAxis` enum at taste level.

#### `deepPatterns: readonly string[]` (3-6 items)

Abstract relational formulas describing structural movements beneath surface plots.

**Examples**: "private grief becomes public ritual", "bureaucracy forces intimacy to disguise itself as procedure", "the protector discovers they are the source of the threat"

**Prompt guidance**: "What relational formulas repeat beneath the surface of the exemplars? These are patterns of transformation, revelation, or reversal — not genre tags or plot elements. Each should describe a structural movement: 'X becomes/reveals/forces Y.'"

**Distinct from existing fields**: `collisionPatterns` captures static juxtapositions; `deepPatterns` captures *dynamic transformations* — how elements change in relation to each other.

### Prompt Tweaks

- Add to rules: "surfaceDoNotRepeat is a soft penalty, not a sacred blacklist. Avoiding superficial recycling is important, but an absolute ban can accidentally kill the very deep pattern the user loves."
- Update output requirements to include the 3 new fields with item count guidance.

### Files to Modify

| File | Change |
|------|--------|
| `src/models/content-generation-contracts.ts` | Add 3 fields to `TasteProfile` interface |
| `src/llm/schemas/content-taste-distiller-schema.ts` | Add 3 properties to JSON schema, add to required array |
| `src/llm/prompts/content-taste-distiller-prompt.ts` | Add field descriptions to RULES and OUTPUT REQUIREMENTS sections |
| `src/models/saved-content-packet.ts` | Add 3 fields to `SavedTasteProfile` interface; update `isSavedTasteProfile` guard |
| `prompts/content-taste-distiller-prompt.md` | Update JSON response shape and notes |

---

## Stage 2: Sparkstormer

### New Fields on `ContentSpark`

#### `playerRole: string`

Who the player would be in this spark's world.

**Examples**: "the newly appointed inspector", "the sibling who stayed behind", "the translator caught between two factions"

**Prompt guidance**: "Every spark must imply a protagonist position. Who would the player be in this world? Not a generic hero — a specific person with a specific relationship to the spark's tension."

#### `want: string`

The urgent desire or drive implied by the spark.

**Examples**: "to expose the cover-up before the evidence is destroyed", "to find the missing sibling before the ritual completes", "to earn enough to leave without betraying the community"

**Prompt guidance**: "What does the player-as-this-character urgently want? This is the narrative engine — without desire, there is no story."

#### `counterforce: string`

Who or what resists the want.

**Examples**: "the institution that benefits from silence", "the community that views leaving as betrayal", "the timer built into the ritual itself"

**Prompt guidance**: "What opposes the want? Name the specific force — person, institution, system, or condition — that makes the desire difficult or dangerous to pursue."

#### `deepPatternRef: string`

Reference to one of the taste profile's `deepPatterns` by text (approximate match, not exact ID).

**Prompt guidance**: "Each spark must be grounded in one of the taste profile's deep patterns. Name the deep pattern this spark instantiates. This prevents random-cool-idea drift."

### ContentKind Expansion

Add to `CONTENT_KIND_VALUES`:
- `'PLACE'` — spatial/environmental premise. Navigable narrative architecture where the setting itself is the source of tension, mystery, or meaning.
- `'SECRET'` — information-asymmetry premise. Hidden knowledge, conspiracies, revelations, or epistemic imbalances that drive interactive engagement.

### Prompt-Level Portfolio Constraints

Add to the sparkstormer prompt (not schema fields):

1. **Kind cap**: "No more than 4 sparks of the same contentKind. Spread across the full taxonomy."
2. **Taste stretch**: "20-30% of sparks should be 'taste stretch' — ideas that fit the user's deep patterns but extend them into unfamiliar territory. These prevent mode collapse."
3. **Deep pattern diversity**: "Spread sparks across multiple deepPatterns from the taste profile. Do not let all sparks reference the same deep pattern."
4. **Novelty diversity**: "Include a mix of novelty types: combinational (novel combinations of existing elements), exploratory (pushing within a conceptual space to find new possibilities), and transformational (breaking a conceptual assumption entirely)."

### Files to Modify

| File | Change |
|------|--------|
| `src/models/content-taxonomy.ts` | Add `'PLACE'`, `'SECRET'` to `CONTENT_KIND_VALUES` |
| `src/models/content-generation-contracts.ts` | Add 4 fields to `ContentSpark` interface |
| `src/llm/schemas/content-sparkstormer-schema.ts` | Add 4 required properties; contentKind enum auto-updates from `CONTENT_KIND_VALUES` |
| `src/llm/prompts/content-sparkstormer-prompt.ts` | Add field descriptions + portfolio constraints to prompt |
| `src/llm/content-sparkstormer-generation.ts` | Update response transformer to parse new fields |
| `prompts/content-sparkstormer-prompt.md` | Update JSON response shape and notes |

### Note on Source Artifacts

`ContentPacketSourceArtifact` in `content-generation-contracts.ts` may need updating to carry new spark fields (`playerRole`, `want`, `counterforce`, `deepPatternRef`) into origin tracing. Evaluate whether these fields add value in the saved artifact context or if the existing `summary` field suffices.

---

## Stage 3: Content Packeter

### Replace `viewpointPressure` with `playerPosition`

**Before**: `viewpointPressure?: string` (optional field in `ContentPacketContext`)

**After**: `playerPosition: string` (mandatory field in `ContentPacketContext`)

**Description**: The protagonist's position, perspective, and stake. Describes who the player is, what they know, and why their position creates tension.

**Examples**: "You are the only inspector who knows the institution is complicit, but your family depends on its survival", "You are the translator caught between two factions, each of whom believes you are loyal to them"

**Prompt guidance**: "playerPosition is mandatory. It must describe who the player is, what they know or don't know, and why their position is inherently pressured. Generic positions like 'you are an adventurer' should be rejected."

### Prompt Tweaks

Add to interactionVerbs guidance: "interactionVerbs must be story-specific. Generic verbs like 'explore', 'fight', 'talk' should be rejected unless the packet makes them unusually concrete — e.g., 'fight' is too generic but 'fight to keep the clinic open against the zoning board' is specific."

### Backward Compatibility

Existing saved packets have `viewpointPressure` (optional). Add a persistence upcaster in the `parseEntity` hook (the project already uses this pattern for `SavedConcept` upcasting):

```typescript
// In the content-packet repository's parseEntity hook:
if ('viewpointPressure' in context && !('playerPosition' in context)) {
  context.playerPosition = context.viewpointPressure ?? 'Unspecified protagonist position';
  delete context.viewpointPressure;
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/models/content-generation-contracts.ts` | `ContentPacketContext`: replace `viewpointPressure?: string` with `playerPosition: string`; update `cloneContentPacketContext`, `isContentPacketContext` |
| `src/llm/schemas/content-packeter-schema.ts` | Add `playerPosition` to required; remove `viewpointPressure` property |
| `src/llm/schemas/content-one-shot-schema.ts` | Same change for one-shot path |
| `src/llm/prompts/content-packeter-prompt.ts` | Update prompt text |
| `src/llm/prompts/content-one-shot-prompt.ts` | Update prompt text |
| `src/models/saved-content-packet.ts` | Update `isSavedContentPacket` validation; add persistence upcaster |
| `prompts/content-packeter-prompt.md` | Update JSON response shape |

---

## Stage 4: Content Evaluator

### Score Dimension Changes

**Remove:**
- `antiGenericity` — replaced by two more precise dimensions
- `conceptUtility` — replaced by a sharper measure

**Add:**
- `tasteAlignment` (0-5)
- `causalSpecificity` (0-5)
- `surfaceFreshness` (0-5)
- `deepOriginality` (0-5)

**Final score dimensions (10 total):**

| Dimension | Anchored Rubric |
|-----------|----------------|
| `imageCharge` | 0 = abstract/generic, no visual. 3 = one clear image, competent but not arresting. 5 = searing, specific, instantly unforgettable |
| `humanAche` | 0 = no human stake inside the weirdness. 3 = recognizable emotion, but conventional. 5 = gut-level resonance, makes you wince or ache |
| `socialLoadBearing` | 0 = isolated gimmick, no social machinery. 3 = implies some social consequence. 5 = reshapes institutions, incentives, or power structures |
| `branchingPressure` | 0 = no dilemma, player has nothing to decide. 3 = one clear choice point. 5 = every option costs something real, multiple pressure vectors |
| `surfaceFreshness` | 0 = stock genre imagery, seen a hundred times. 3 = recognizable but with a distinctive twist. 5 = never-seen-before surface, can't be mistaken for anything else |
| `deepOriginality` | 0 = standard narrative formula underneath (hero's journey, revenge plot). 3 = familiar structure with one unusual element. 5 = structurally unprecedented, the pattern itself is the invention |
| `sceneBurst` | 0 = one-note, abstract, implies nothing concrete. 3 = 2-3 distinct scenes visible. 5 = rich with implied moments, 5+ scenes practically write themselves |
| `structuralIrony` | 0 = straightforward, no contradiction. 3 = mild irony or tension. 5 = the solution is the problem, the cure is the disease |
| `tasteAlignment` | 0 = no connection to the taste profile's patterns, modes, or tensions. 3 = plausible match but could fit many profiles. 5 = feels tailor-made — instantiates deep patterns, engagement modes, and value tensions from this specific profile |
| `causalSpecificity` | 0 = too abstract or decorative to build a story from. 3 = workable with effort, mechanisms are present but vague. 5 = mechanisms are so specific they practically generate scenes and choices on their own |

### New Field: `redundancyCluster`

Add `redundancyCluster: string | null` to `ContentEvaluation`.

If this packet is substantively redundant with another in the batch, the evaluator names the `contentId` it overlaps with. This enables portfolio-level overlap detection without adding a separate pipeline stage.

**Prompt guidance**: "If two packets cover essentially the same territory — similar anomaly, similar social engine, similar emotional core — mark the weaker one with the contentId of the stronger one in redundancyCluster. If the packet is sufficiently distinct, set redundancyCluster to null."

### Make `tasteProfile` Mandatory

Change `ContentEvaluatorContext.tasteProfile` from optional to required:

```typescript
// Before:
readonly tasteProfile?: TasteProfile;
// After:
readonly tasteProfile: TasteProfile;
```

This is required for `tasteAlignment` scoring. The evaluator prompt must instruct: "When scoring tasteAlignment, cross-reference the taste profile's deepPatterns, engagementModes, valueTensions, collisionPatterns, and sceneAppetites."

### Backward Compatibility

Existing saved evaluations use the old score dimensions (antiGenericity, conceptUtility). The persistence upcaster for `SavedContentPacket` should handle this by setting `evaluation` to `undefined` when old score dimensions are detected, allowing optional re-evaluation.

### Files to Modify

| File | Change |
|------|--------|
| `src/models/content-generation-contracts.ts` | Update `ContentEvaluationScores` (remove 2, add 4), `ContentEvaluation` (+redundancyCluster), `ContentEvaluatorContext` (tasteProfile mandatory), `isContentEvaluationScores` |
| `src/llm/schemas/content-evaluator-schema.ts` | Update `SCORE_DIMENSIONS`, add redundancyCluster to schema |
| `src/llm/prompts/content-evaluator-prompt.ts` | Full rubric rewrite with anchored exemplars for all 10 dimensions |
| `src/llm/content-evaluator-generation.ts` | Update response transformer for new score fields + redundancyCluster |
| `prompts/content-evaluator-prompt.md` | Update JSON response shape, rubric, and notes |

---

## Pipeline-Level: Ontology Documentation

The following terms are related but intentionally distinct. Add clarifying comments to prompt docs:

| Term | Stage | Meaning |
|------|-------|---------|
| `humanAnchors` | Distiller | *Types* of emotional grounding the user craves (plural, taste-level) |
| `humanAnchor` | Packeter | *Specific* emotional grounding for this packet (singular, instance-level) |
| `humanAche` | Evaluator | *Intensity score* for emotional depth in a packet (0-5 metric) |
| `choicePressure` | Packeter | What forces meaningful choices in this packet (descriptive field) |
| `branchingPressure` | Evaluator | Score for how much the packet forces meaningful choices (0-5 metric) |

These are not renamed — the distinctions are intentional and renaming would break saved data.

---

## UI Changes

### Server-Side Presenter (`src/server/presenters/content-packet-card.ts`)

1. **`CONTENT_PACKET_CONTEXT_FIELD_REGISTRY`**: Replace `{ key: 'viewpointPressure', label: 'Viewpoint Pressure' }` with `{ key: 'playerPosition', label: 'Player Position' }`

2. **`EVALUATION_SCORE_FIELD_REGISTRY`**: Replace with updated dimensions:
   - Remove: `{ key: 'antiGenericity', label: 'Anti-Genericity' }`, `{ key: 'conceptUtility', label: 'Concept Utility' }`
   - Add: `{ key: 'surfaceFreshness', label: 'Surface Freshness' }`, `{ key: 'deepOriginality', label: 'Deep Originality' }`, `{ key: 'tasteAlignment', label: 'Taste Alignment' }`, `{ key: 'causalSpecificity', label: 'Causal Specificity' }`

3. **`buildEvaluationDetails`**: Render `redundancyCluster` — if non-null, show as a detail row below score bars (e.g., "Overlaps with: pkt-05")

4. **`ContentPacketEvaluationDetails` interface**: Add `readonly redundancyCluster: string | null`

### Client-Side JS (`public/js/src/11-content-packets.js`)

1. **`TASTE_PROFILE_FIELDS` array**: Add 3 entries:
   ```javascript
   { key: 'engagementModes', label: 'Engagement Modes' },
   { key: 'valueTensions', label: 'Value Tensions' },
   { key: 'deepPatterns', label: 'Deep Patterns' },
   ```

2. **`renderEvaluationSection`**: Add rendering for `redundancyCluster` — if present and non-null, show as a note below the score bars

3. After editing, regenerate `public/js/app.js` via `node scripts/concat-client-js.js`

### EJS Template (`src/server/views/pages/content-packets.ejs`)

No changes needed — the template is data-driven via the card view model.

### Files to Modify

| File | Change |
|------|--------|
| `src/server/presenters/content-packet-card.ts` | Context field registry, evaluation score registry, redundancyCluster display, interface update |
| `public/js/src/11-content-packets.js` | TASTE_PROFILE_FIELDS +3, renderEvaluationSection +redundancyCluster |
| `public/js/app.js` | Regenerated via concat script |

---

## Complete File Manifest

| File | Change Summary |
|------|---------------|
| `src/models/content-taxonomy.ts` | +PLACE, +SECRET to CONTENT_KIND_VALUES |
| `src/models/content-generation-contracts.ts` | TasteProfile +3, ContentSpark +4, ContentPacketContext viewpointPressure->playerPosition, ContentEvaluationScores -2/+4, ContentEvaluation +redundancyCluster, ContentEvaluatorContext tasteProfile mandatory |
| `src/models/saved-content-packet.ts` | SavedTasteProfile +3, guards updated, persistence upcaster for viewpointPressure->playerPosition and old evaluation scores |
| `src/llm/schemas/content-taste-distiller-schema.ts` | +3 schema properties |
| `src/llm/schemas/content-sparkstormer-schema.ts` | +4 required properties, expanded contentKind |
| `src/llm/schemas/content-packeter-schema.ts` | viewpointPressure->playerPosition (required) |
| `src/llm/schemas/content-evaluator-schema.ts` | SCORE_DIMENSIONS updated, +redundancyCluster |
| `src/llm/schemas/content-one-shot-schema.ts` | viewpointPressure->playerPosition |
| `src/llm/prompts/content-taste-distiller-prompt.ts` | +field descriptions, +surfaceDoNotRepeat softening |
| `src/llm/prompts/content-sparkstormer-prompt.ts` | +field descriptions, +portfolio constraints |
| `src/llm/prompts/content-packeter-prompt.ts` | +playerPosition, +interactionVerbs guidance |
| `src/llm/prompts/content-evaluator-prompt.ts` | Full rubric rewrite with anchored exemplars |
| `src/llm/prompts/content-one-shot-prompt.ts` | playerPosition update |
| `src/llm/content-sparkstormer-generation.ts` | Response transformer for new fields |
| `src/llm/content-evaluator-generation.ts` | Response transformer for new scores + redundancyCluster |
| `src/server/presenters/content-packet-card.ts` | Field registries updated, +redundancyCluster display |
| `public/js/src/11-content-packets.js` | +taste profile fields, +redundancyCluster rendering |
| `public/js/app.js` | Regenerated |
| `prompts/content-taste-distiller-prompt.md` | Doc update |
| `prompts/content-sparkstormer-prompt.md` | Doc update |
| `prompts/content-packeter-prompt.md` | Doc update |
| `prompts/content-evaluator-prompt.md` | Doc update |
| Test files | Mock updates for new/changed fields |

## Verification Plan

1. `npm run typecheck` — all types compile cleanly
2. `npm run lint` — no lint errors
3. `npm test` — all existing tests pass (mocks updated for new fields)
4. `npm run build` — successful build
5. Manual test via localhost:3000/content-packets:
   - Full pipeline: taste profile shows engagementModes, valueTensions, deepPatterns
   - Sparks include playerRole, want, counterforce, deepPatternRef
   - PLACE and SECRET content kinds appear in spark output
   - Packets show mandatory playerPosition (not optional viewpointPressure)
   - Evaluation scores show tasteAlignment, causalSpecificity, surfaceFreshness, deepOriginality (not conceptUtility, not antiGenericity)
   - redundancyCluster appears when packets overlap
   - Quick path (one-shot): packets show playerPosition
6. Backward compatibility: load existing saved packets without errors; old evaluations gracefully handled
