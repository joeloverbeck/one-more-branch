# Improvements to Story Architecture

**Status**: ✅ COMPLETED (refined into specs/story-architecture-improvements.md, all 8 tickets implemented)

Your current pipeline is already strong on continuity + state bookkeeping (active threats/constraints/threads, inventory/health separation, protagonistAffect snapshot, “no retcons”), and it’s cleanly modularized into: structure generation (3 acts + 2–4 beats/act) 

03-structure-prompt

- continuation (page writing + state updates + 3 divergent choices) 

02-continuation-prompt

- structure analyst (beat concluded + deviation detection) 

05-analyst-prompt

- and structure rewrite (regenerate remaining beats while preserving completed canon) 

04-structure-rewrite-prompt

What you’re missing (and what professional story craft leans on hard) is explicit “structural moments” (midpoint reversal, act breaks, crisis, climax) and explicit character transformation scaffolding—so the model can’t accidentally deliver a flat sequence of “stuff happens” beats even if tension rises.

## 1) What needs to change / be implemented

### 1.1 Data model upgrades (breaking, non-versioned)

We don't want backward compatibility nor legacy handling: prioritize a clean, robust architecture that stands the test of time, even if it breaks things. We're early in development.

#### 1.1.1 Structure schema additions
Add to top-level structure object:
- `premise: string` (1–2 sentences)
- `themeQuestion: string` (a question the story “argues”)
- `protagonistArc: {`
  - `want: string` (surface goal)
  - `need: string` (internal correction)
  - `lie: string` (false belief driving bad choices)
  - `woundOrGhost: string` (origin of lie)
  - `transformationMarkers: string[]` (3–5 “proof moments” of change)
`}`
- `turningPoints: {`
  - `incitingIncidentBeatId: string`
  - `act1BreakBeatId: string`       // “point of no return”
  - `midpointBeatId: string`        // reframe/reveal/reversal
  - `crisisBeatId: string`          // “dark night / impossible choice”
  - `climaxBeatId: string`
  - `resolutionBeatId: string`
`}`
- `pacingBudget: { targetPagesMin: number, targetPagesMax: number }`
- `structureMode: "three_act" | "five_act" | "sequence" | "story_circle"` (default `"three_act"`)

Add to each beat:
- `id: string` (e.g., "1.2")
- `role: "setup" | "complication" | "turning_point" | "reversal" | "crisis" | "climax" | "resolution"`
- `valueShift: "positive→negative" | "negative→positive" | "positive→positive" | "negative→negative"`
- `irreversibleChange: string` (what becomes impossible afterward)
- `revealOrReframe: string` (required especially for midpoint/turning points)
- `branchRealizations: string[]` (2–4 ways this beat can be satisfied across branches)
- `failureModes: string[]` (1–3 “if player refuses, story does X to keep momentum”)

#### 1.1.2 Continuation response additions (breaking)
Keep current response shape; add optional fields:
- `choiceMeta: Array<{`
  - `choiceText: string` (must match a `choices[]` entry exactly)
  - `intent: "advance_plot" | "deepen_character" | "gain_leverage" | "escape_threat" | "seek_truth" | "ally" | "betray" | "sacrifice"`
  - `costOrRisk: string`
  - `expectedBeatImpact: "advance_current" | "complete_current" | "detour_then_return" | "skip_to_next"`
`}>`
- `sceneTurning: {`
  - `sceneValueShift: (same enum as beat.valueShift)`
  - `newInformation: string` (what the player learns/realizes this page)
  - `pressureEscalation: string` (how stakes tighten this page)
`}`

### 1.2 Prompt upgrades

#### 1.2.1 Structure Prompt (generation) changes
Implement in structure prompt:
- Ask for `structureMode` selection based on tone/genre + desired length.
- Require explicit `turningPoints` mapping with beat IDs.
- Require the midpoint to include a **reframe/reveal** that changes the interpretation of prior events.
- Require Act 1 break to be a **point of no return** (new irreversible situation).
- Require crisis beat to be an **impossible choice** (two bad options / sacrifice).
- Require every beat to include `branchRealizations` (avoid “single-track” plotting).
- Add “silent planning” instruction: *think through turning points and arc internally; output only JSON.*

#### 1.2.2 Continuation Prompt changes
Add a “STRUCTURAL TARGET” header injected at runtime:
- `currentBeatId`, `currentBeatRole`, `nextTurningPointBeatId`, `distanceToNextTurningPoint` (in pages or beats), `protagonistArc (want/need/lie)`.

Add rules:
- Every page must contain a **scene turn** (value shift) and populate `sceneTurning`.
- If `currentBeatRole` is `turning_point` or the beat is the mapped `midpointBeatId`:
  - Must include `revealOrReframe` content (no vague “something changes”).
  - Must end with the protagonist facing **a new interpretation** and **new stakes**.
- Choices must be typed via `choiceMeta` and:
  - At least 1 choice pressures the protagonist’s `lie`.
  - At least 1 choice moves toward the protagonist’s `need` (even if painful).
  - No choice may be “cosmetic”; each must differ in `intent` or `expectedBeatImpact`.

#### 1.2.3 Analyst Prompt changes (progress + pacing)
Extend analyst output schema:
- `pacingIssueDetected: boolean`
- `pacingIssueReason?: string`
- `recommendedAction: "none" | "nudge_within_continuation" | "force_beat_turn" | "trigger_structure_rewrite"`
- `structuralMomentHit?: { type: "inciting" | "act_break" | "midpoint" | "crisis" | "climax" | "resolution", beatId: string }`

New logic:
- Detect “flatline” pacing:
  - If `pagesInCurrentBeat > maxPagesPerBeat` OR `distanceToNextTurningPoint` is growing without meaningful progress → pacing issue.
- Detect “missing midpoint”:
  - If story passes 45–60% of target page budget without midpoint-style reveal/reframe → pacing issue.

### 1.3 Runtime orchestration changes
Add a lightweight “Structure Controller” step per page:
1) After continuation response, run analyst.
2) If `deviationDetected` → call structure rewrite (existing).
3) Else if `pacingIssueDetected`:
   - If `recommendedAction = force_beat_turn`: next continuation injects a stronger directive (“this page must deliver X reveal / irreversible change”).
   - If `recommendedAction = trigger_structure_rewrite`: rewrite remaining beats to pull turning points back into reach.
4) Maintain `pagesInCurrentBeat` counter and reset when beat concludes.

## 2) Invariants that must hold (hard rules)
- **No retcons** of established world facts, character canon, inventory, health, active threats/constraints/threads.
- **Field separation** remains correct:
  - emotions only in `protagonistAffect`, physical conditions only in `health*`, objects only in `inventory*`.
- **Active state** remains “what is true right now,” not history.
- **Structure rewrite** must preserve completed beats exactly (descriptions/objectives/resolutions unchanged).
- **Backward compatibility**:
  - IWe don't support backwards compabitility: focus on clean, robust architecture.

## 3) Tests that should pass

### 3.1 Schema/validation tests
- `structure_parses_and_validates()`
  - turningPoints beat IDs exist in acts/beats.
  - midpoint beat role is `turning_point` or `reversal` AND has non-empty `revealOrReframe`.

### 3.2 Structural correctness tests
- `each_act_has_an_irreversible_change()`
  - Act 1 break, midpoint, crisis, climax beats all have non-empty `irreversibleChange`.

### 3.3 Choice quality tests
- `choices_are_divergent_by_intent()`
  - For each continuation, `choiceMeta.intent` values must not all be identical.
- `choices_include_arc_pressure()`
  - At least one choice intent is `deepen_character` or includes cost targeting the protagonist’s `lie`.

### 3.4 Analyst/controller tests
- `detects_deviation_when_future_beats_invalidated()`
  - Existing behavior remains (deviationDetected true when assumptions break).
- `detects_pacing_issue_when_midpoint_missing()`
  - Simulate page count beyond 60% of budget without midpoint hit → pacingIssueDetected true.
- `controller_triggers_force_beat_turn()`
  - pacingIssueDetected + recommendedAction=force_beat_turn causes next continuation prompt to include mandatory turning-point directive.

### 3.5 Rewrite preservation tests
- `rewrite_preserves_completed_beats_byte_for_byte()`
  - Given completed beats, rewritten structure must include identical text for those beats and must not remap their IDs.

