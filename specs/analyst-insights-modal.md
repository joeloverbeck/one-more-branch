# Analyst Insights Modal

**Status**: ACTIVE
**Priority**: Enhancement
**Scope**: UI feature — expose analyst result data to the player via a modal on the play page

## Overview

Every page generation produces an `AnalystResult` (stored on `Page.analystResult`) containing rich data about beat progress, narrative momentum, pacing, foreshadowing, and thread payoff quality. This data is currently invisible to the player. This spec adds a "Story Insights" button on the play page that opens a modal displaying curated analyst data, with the primary goal of letting players gauge how close they are to completing the current story beat.

## Data Source

`AnalystResult` interface (`src/llm/analyst-types.ts`):

```typescript
interface AnalystResult {
  beatConcluded: boolean;
  beatResolution: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  narrativeSummary: string;
  pacingIssueDetected: boolean;
  pacingIssueReason: string;
  recommendedAction: PacingRecommendedAction;
  sceneMomentum: SceneMomentum;
  objectiveEvidenceStrength: ObjectiveEvidenceStrength;
  commitmentStrength: CommitmentStrength;
  structuralPositionSignal: StructuralPositionSignal;
  entryConditionReadiness: EntryConditionReadiness;
  objectiveAnchors: string[];
  anchorEvidence: string[];
  completionGateSatisfied: boolean;
  completionGateFailureReason: string;
  toneAdherent: boolean;
  toneDriftDescription: string;
  narrativePromises: NarrativePromise[];
  threadPayoffAssessments: ThreadPayoffAssessment[];
  rawResponse: string;
}
```

### Curated Fields (shown in modal)

| Field | Purpose in Modal |
|-------|-----------------|
| `sceneMomentum` | Momentum badge |
| `objectiveEvidenceStrength` | Beat progress gauge segment |
| `commitmentStrength` | Beat progress gauge segment |
| `structuralPositionSignal` | Beat progress gauge segment |
| `entryConditionReadiness` | Beat progress gauge segment |
| `completionGateSatisfied` | Gate status indicator |
| `completionGateFailureReason` | Explains what's still needed |
| `pacingIssueDetected` | Conditional pacing alert |
| `pacingIssueReason` | Pacing alert details |
| `recommendedAction` | Pacing alert action label |
| `narrativePromises` | Foreshadowing section |
| `threadPayoffAssessments` | Thread payoff section |
| `toneAdherent` | Conditional tone warning |
| `toneDriftDescription` | Tone warning details |

### Excluded Fields (not shown)

- `beatConcluded`, `beatResolution` — engine internals for structure progression
- `deviationDetected`, `deviationReason`, `invalidatedBeatIds` — deviation triggers structure rewrites the player experiences organically
- `narrativeSummary` — the player just read the narrative
- `objectiveAnchors`, `anchorEvidence` — too granular, exposes prompt engineering
- `rawResponse` — debug data

## UI Design

### Trigger Button

Location: Inline with the "What do you do?" heading (`<h3>` in `.choices-section`), right-aligned.

```
[What do you do?]                    [🔍 Story Insights]
```

- The `<h3>` becomes a flex container with `justify-content: space-between`
- Button uses a small icon + text label ("Story Insights")
- On mobile (<600px): icon only, no text label
- Only rendered when `analystResult` is non-null (opening pages may lack analyst data)
- Also rendered on ending pages (before the ending banner), since they still have analyst results

### Modal Overlay

Reuses existing `.modal` CSS pattern (dark semi-transparent backdrop, centered content panel). Modal content width: `min(92vw, 600px)` (wider than API key modal's 420px to accommodate gauge).

#### Modal Layout

```
┌─────────────────────────────────────────────────┐
│ Story Insights                              [✕] │
├─────────────────────────────────────────────────┤
│                                                 │
│  BEAT PROGRESS                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Objective Evidence    [███░░░░░░] Weak    │   │
│  │ Commitment           [██████░░░] Explicit │   │
│  │ Entry Readiness      [████░░░░░] Partial  │   │
│  │ Structural Position  [██░░░░░░░] Within   │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  Completion Gate: Not yet                       │
│  "objectiveEvidenceStrength is WEAK_IMPLICIT    │
│   rather than CLEAR_EXPLICIT..."                │
│                                                 │
│  Momentum: [MAJOR PROGRESS]  (green badge)      │
│                                                 │
│  ─── Narrative Promises ───                     │
│  [FORESHADOWING] HIGH                           │
│  "Jon committed felony assault..."              │
│                                                 │
│  [UNRESOLVED_EMOTION] HIGH                      │
│  "Ane witnessed Jon's capacity..."              │
│                                                 │
│  ─── Thread Payoffs ───                         │
│  [WELL_EARNED] ✓                                │
│  Thread: "Prevent risk: The men's attention..." │
│  "The threat was resolved through visceral..."  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Beat Progress Gauge

Four horizontal bar segments, each mapping an analyst signal to a fill percentage:

| Signal | Source Field | Levels → Fill % |
|--------|-------------|-----------------|
| Objective Evidence | `objectiveEvidenceStrength` | NONE=0%, WEAK_IMPLICIT=33%, CLEAR_EXPLICIT=100% |
| Commitment | `commitmentStrength` | NONE=0%, TENTATIVE=25%, EXPLICIT_REVERSIBLE=60%, EXPLICIT_IRREVERSIBLE=100% |
| Entry Readiness | `entryConditionReadiness` | NOT_READY=0%, PARTIAL=50%, READY=100% |
| Structural Position | `structuralPositionSignal` | WITHIN_ACTIVE_BEAT=20%, BRIDGING_TO_NEXT_BEAT=60%, CLEARLY_IN_NEXT_BEAT=100% |

Fill color gradient per bar: 0-33% red/crimson, 34-66% amber/gold, 67-100% green/teal (using existing CSS custom properties where possible).

Below the gauge: completion gate status line.
- Gate satisfied: "Completion Gate: **Satisfied** ✓" (green text)
- Gate not satisfied: "Completion Gate: **Not yet** — {completionGateFailureReason}" (amber text)

### Momentum Badge

A colored pill/badge below the gauge:

| Value | Color | Label |
|-------|-------|-------|
| STASIS | gray (`#6b7280`) | Stasis |
| INCREMENTAL_PROGRESS | blue (`#3b82f6`) | Incremental Progress |
| MAJOR_PROGRESS | green (`#10b981`) | Major Progress |
| REVERSAL_OR_SETBACK | amber (`#f59e0b`) | Reversal |
| SCOPE_SHIFT | purple (`#8b5cf6`) | Scope Shift |

### Conditional Sections

**Pacing Alert** (only if `pacingIssueDetected === true`):
- Warning-styled box (amber/orange border)
- Shows `pacingIssueReason`
- Shows `recommendedAction` as a badge (none/nudge/rewrite)

**Narrative Promises** (only if `narrativePromises.length > 0`):
- Section header: "Narrative Promises"
- Each promise shows:
  - Type badge: CHEKHOV_GUN, FORESHADOWING, DRAMATIC_IRONY, UNRESOLVED_EMOTION
  - Urgency badge: LOW (gray), MEDIUM (amber), HIGH (red)
  - Description text

**Thread Payoff Assessments** (only if `threadPayoffAssessments.length > 0`):
- Section header: "Thread Payoffs"
- Each assessment shows:
  - Satisfaction badge: RUSHED (red), ADEQUATE (amber), WELL_EARNED (green)
  - Thread text (truncated to ~80 chars with tooltip for full text)
  - Reasoning text

**Tone Warning** (only if `toneAdherent === false`):
- Warning-styled section
- Shows `toneDriftDescription`

### Modal Interactions

- **Open**: Click "Story Insights" button
- **Close**: Click X button, click outside modal, press Escape key
- **Scroll**: Modal content scrolls internally if it overflows viewport height
- **No backdrop blur**: Use same dark overlay as existing modals (`rgba(8, 13, 31, 0.82)`)

## Data Flow

### Initial Page Load (GET /play/:storyId)

The `page` object is already passed to the EJS template (`src/server/routes/play.ts:253`). The `page.analystResult` field is available in EJS scope.

**Implementation**: Serialize `page.analystResult` as a JSON `<script>` block in the EJS template:

```html
<script type="application/json" id="analyst-data">
  <%- JSON.stringify(page.analystResult) %>
</script>
```

This avoids large data attributes on DOM elements and handles special characters safely.

### AJAX Choice Response (POST /play/:storyId/choice)

Currently the JSON response (`src/server/routes/play.ts:345-367`) does **not** include `analystResult`.

**Implementation**: Add `analystResult` to the response JSON:

```typescript
return res.json({
  success: true,
  page: {
    // ... existing fields ...
    analystResult: result.page.analystResult,
  },
  // ... existing fields ...
});
```

### Client JS

The client JS reads analyst data from either:
1. The `<script id="analyst-data">` block on initial page load
2. The `page.analystResult` field in the AJAX choice response

When new analyst data arrives via AJAX, the stored data is updated. If the modal is currently open, its content is re-rendered with the new data.

## File Changes

### Server-Side

| File | Change |
|------|--------|
| `src/server/routes/play.ts` | Add `analystResult` to POST choice response JSON |
| `src/server/views/pages/play.ejs` | Add analyst data script block, add insights button HTML, add modal HTML skeleton |

### Client-Side

| File | Change |
|------|--------|
| `public/js/src/05b-analyst-modal.js` (new) | Modal rendering, show/hide, gauge logic, content updates |
| `public/js/src/09-controllers.js` | Read initial analyst data, pass AJAX analyst data to modal module, re-render button on AJAX updates |
| `public/css/styles.css` | New styles for insights button, gauge bars, momentum badges, promise/payoff sections |

After editing client JS files, regenerate `app.js`:
```bash
node scripts/concat-client-js.js
```

## CSS Classes (new)

```
.insights-btn               - The trigger button
.insights-modal              - Modal overlay (extends .modal)
.insights-modal-content      - Content panel (extends .modal-content, wider)
.insights-header             - Modal header with title + close button
.insights-close-btn          - Close X button

.beat-gauge                  - Gauge container
.beat-gauge__row             - Single gauge bar row
.beat-gauge__label           - Bar label text
.beat-gauge__track           - Bar background track
.beat-gauge__fill            - Colored fill portion
.beat-gauge__level           - Level text label

.momentum-badge              - Colored momentum pill
.momentum-badge--stasis      - Gray variant
.momentum-badge--incremental - Blue variant
.momentum-badge--major       - Green variant
.momentum-badge--reversal    - Amber variant
.momentum-badge--scope-shift - Purple variant

.completion-gate             - Gate status line
.completion-gate--satisfied  - Green checkmark variant
.completion-gate--pending    - Amber variant with reason text

.pacing-alert                - Pacing warning box
.promise-list                - Narrative promises section
.promise-item                - Single promise
.promise-type-badge          - Promise type pill
.promise-urgency-badge       - Urgency pill
.payoff-list                 - Thread payoff section
.payoff-item                 - Single payoff assessment
.payoff-satisfaction-badge   - Satisfaction level pill
.tone-warning                - Tone drift warning box
```

## Responsive Behavior

### Desktop (>=1100px)
- Modal width: `min(92vw, 600px)`, centered
- Button shows icon + "Story Insights" text

### Tablet (600-1099px)
- Modal width: `min(92vw, 600px)`, centered
- Button shows icon + "Story Insights" text

### Mobile (<600px)
- Modal width: full screen with padding
- Button shows icon only (text label hidden via media query)
- Gauge bars stack vertically if needed

## Testing Requirements

### Unit Tests
- Gauge percentage mapping functions (enum value → fill %)
- Modal content rendering with various analyst result states (null, all fields present, minimal fields)
- Conditional section visibility (pacing alert shows only when `pacingIssueDetected`)

### Integration Tests
- POST /play/:storyId/choice response includes `analystResult`
- GET /play/:storyId page includes analyst data script block

### Client Tests
- Modal opens on button click
- Modal closes on X, outside click, Escape
- Modal content updates on AJAX page navigation
- Button hidden when `analystResult` is null

## Edge Cases

- **Opening page (page 1)**: May have `analystResult: null` if it's the very first page (no analyst runs on structure generation). Button should be hidden.
- **Ending pages**: Have analyst results but no choices section. The button should be placed in the ending banner area or above it.
- **Navigating to previously explored pages**: These load existing page data (no new generation). The analyst result should still be available from the stored page JSON.
- **Very long `completionGateFailureReason`**: Text should wrap within the modal. No truncation needed — the modal scrolls.
- **Empty `narrativePromises` and `threadPayoffAssessments`**: Both sections hidden. Modal shows only gauge + momentum + gate status.

## Non-Goals

- This spec does NOT add historical analyst result tracking (comparing across pages)
- This spec does NOT modify the analyst prompt or result structure
- This spec does NOT add analyst insights to the story overview/home page
- This spec does NOT expose deviation/rewrite information (players experience this organically)
