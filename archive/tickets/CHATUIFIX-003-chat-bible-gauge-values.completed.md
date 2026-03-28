# CHATUIFIX-003: Fix valence/tension gauge to show chat bible absolute values with dual-marker delta

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None

## Problem

The valence and tension gauges on the chat sidebar display values from `session.relationshipState` (incrementally accumulated from 0), not from `chatBible.relationshipNow` (the LLM's holistic assessment of the actual relationship state). After one turn with a delta of +0.5 valence / +1.5 tension, the gauges show 0.5 and 1.5, while the chat bible says the relationship is at valence=5 and tension=8. The gauges should show the chat bible's absolute values as the primary display, with a ghost marker indicating the previous position to visualize the delta.

### Root Cause

1. `session.relationshipState` starts at `{ valence: 0, tension: 0 }` (see `chat-service.ts:205-209`)
2. After each turn, `applyRelationshipStateUpdate()` adds `suggestedValenceChange`/`suggestedTensionChange` deltas (see `chat-relationship-history.ts:20-28`)
3. The chat bible's `relationshipNow` contains absolute values assessed by the LLM (valence=5, tension=8)
4. The EJS template and JS sidebar both read from `session.relationshipState`, not from `chatBible.relationshipNow`

## Assumption Reassessment (2026-03-28)

1. `src/server/views/pages/chat.ejs:572-573,583,598` — Gauge values sourced from `session.relationshipState.valence` and `.tension`. Confirmed.
2. `public/js/src/20b-chat-sidebar.js:262-291` — `updateRelationshipVisuals()` reads `relationshipState.valence` and `.tension` for gauge rendering. Confirmed.
3. `chats/*/state.json` — `session.relationshipState` has `valence: 0.5, tension: 1.5` while `chatBible.relationshipNow` has `valence: 5, tension: 8`. Confirmed mismatch.
4. `src/models/chat/chat-relationship-history.ts:16-56` and `src/server/routes/chat.ts:58-63` — `relationshipHistory` is built only from accumulated `relationshipState` deltas starting from 0. Confirmed. There is no persisted per-turn `chatBible.relationshipNow` history.
5. `public/js/src/20b-chat-sidebar.js:151-157` — `getGaugeBounds` returns `{ min: -5, max: 5 }` for valence and `{ min: 0, max: 10 }` for tension. These bounds are correct for the chat bible's absolute scale.
6. `src/server/views/pages/chat.ejs` — Bootstrap JSON is rendered via `<script id="chat-ui-bootstrap">`. The bootstrap data must include `chatBible` for the client to access `relationshipNow`. Confirmed `chatBible` is already included in the bootstrap.

## Architecture Check

1. `chatBible.relationshipNow` should be the source of truth for the current displayed relationship state whenever it exists:
   - It reflects the latest holistic assessment, which is what the UI should present as the current state
   - The gauge bounds (-5 to 5 for valence, 0 to 10 for tension) already match the chat bible's scale
2. `relationshipState` should remain the source of truth for deltas:
   - It is what the server persists and what the client currently receives on incremental turn updates
   - It is the only historical relationship timeline currently available
3. True absolute-value history is not available in the current architecture:
   - The app stores only the latest `chatBible`, not historical `relationshipNow` snapshots
   - Replacing sparkline/history with true chat-bible snapshots would require a larger architecture change: persisting or returning relationship snapshots per turn
4. Therefore the robust in-scope design is:
   - Current gauge value: `chatBible.relationshipNow` when present, fallback to `relationshipState`
   - Delta badge: derived from `relationshipState` history, unchanged
   - Ghost marker and sparkline: derived from rebasing the existing delta-based `relationshipHistory` onto the current absolute `chatBible.relationshipNow` value when available
5. No backwards-compatibility shims needed.

## What to Change

### 1. Update EJS template gauge value source

In `src/server/views/pages/chat.ejs`, change the initial gauge value rendering to read from `chatBible.relationshipNow` when available, falling back to `session.relationshipState`:

- Lines 572-573: Summary stats `V:` and `T:` values
- Lines 583, 598: `data-chat-gauge-value` spans for valence and tension

Use pattern: `<%= (session.chatBible?.relationshipNow?.valence ?? session.relationshipState.valence) %>`

### 2. Update client-side sidebar to use current chat bible values and rebased history

In `public/js/src/20b-chat-sidebar.js`:

**a) Modify `updateRelationshipVisuals()`** to accept chatBible as a parameter and read `chatBible.relationshipNow.valence`/`.tension` for the current gauge positioning when available, falling back to `relationshipState` values.

**b) Add ghost marker rendering** in `renderGauge()`:
- After positioning the primary marker at the current value, position a `.chat-gauge__ghost` element at the previous turn's value
- The ghost marker is semi-transparent and smaller than the primary marker
- If there is no previous value (first turn or no history), hide the ghost marker

**c) Rebase sparkline/history data**:
- Do not attempt to read historical chat bible snapshots; they do not exist
- Instead, convert the existing cumulative-delta `relationshipHistory` into an absolute-value display history by offsetting it to the latest `chatBible.relationshipNow` value when available
- Use that rebased history for sparkline rendering and ghost-marker previous-point lookup
- Preserve the raw delta history behavior as fallback when `chatBible.relationshipNow` is unavailable

**d) Update `update()` function** to pass chatBible through to `updateRelationshipVisuals()`.

### 3. Add ghost marker HTML in EJS template

In `src/server/views/pages/chat.ejs`, add a ghost marker span inside each `.chat-gauge`:

```html
<div class="chat-gauge chat-gauge--valence" data-chat-gauge="valence">
  <span class="chat-gauge__track"></span>
  <span class="chat-gauge__ghost"></span>
  <span class="chat-gauge__marker"></span>
</div>
```

Same for the tension gauge.

### 4. Add ghost marker CSS

In `public/css/styles.css`, add styling for `.chat-gauge__ghost`:

```css
.chat-gauge__ghost {
  position: absolute;
  top: 50%;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transform: translate(-50%, -50%);
  transition: left 0.3s ease;
  pointer-events: none;
}
```

### 5. Regenerate app.js

Run `node scripts/concat-client-js.js` after all JS source changes.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/js/src/20b-chat-sidebar.js` (modify)
- `public/css/styles.css` (modify)
- `public/js/app.js` (regenerated — never edit directly)

## Out of Scope

- Changing how `session.relationshipState` is accumulated (it still serves as the delta tracking mechanism)
- Persisting or returning per-turn `chatBible.relationshipNow` snapshots
- Changing the chat bible generation pipeline
- Animated transitions between gauge positions (can be a follow-up)
- Tooltip on ghost marker showing previous value

## Acceptance Criteria

### Tests That Must Pass

1. When `chatBible.relationshipNow` has `valence: 5, tension: 8`, the gauge markers position at those absolute values (not at 0.5 / 1.5)
2. The ghost marker appears at the previous turn's position when history has 2+ points
3. The ghost marker is hidden when there is no previous position (initial state)
4. The delta text badge still shows the per-turn change (e.g., "+0.5")
5. Sparkline reflects the displayed absolute-value trajectory over turns by rebasing the stored delta history onto the current absolute value when chat bible data exists
6. Fallback: when `chatBible` is null or `relationshipNow` is missing, gauges gracefully fall back to `session.relationshipState` values
7. Incremental AJAX updates still render correctly even though the turn response does not include a full historical chat-bible timeline

### Invariants

1. Gauge bounds remain valence: [-5, 5] and tension: [0, 10]
2. The delta badge text continues to show per-turn changes, not absolute values
3. The sparkline shows the same scale as the gauge
4. Client-side rendering after AJAX turn response must update gauges correctly

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — verify the initial rendered summary stats / gauge values prefer `chatBible.relationshipNow` and include ghost-marker hooks
2. `test/unit/client/chat-page/controller.test.ts` — verify bootstrap initialization renders current gauge values from `chatBible.relationshipNow`, while preserving delta text from relationship history
3. `test/unit/client/chat-page/controller.test.ts` — verify ghost marker placement and sparkline rendering use rebased absolute history when chat bible data exists
4. `test/unit/client/chat-page/controller.test.ts` — verify fallback behavior when `chatBible.relationshipNow` is absent

### Commands

1. `node scripts/concat-client-js.js` — regenerate app.js
2. `npm run build` — verify build succeeds
3. `npm run lint` — verify lint passes
4. `npm run typecheck` — verify type checking passes
5. `npm run test:unit -- --coverage=false --runInBand test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts` — focused regression coverage
6. `npm test` — verify existing tests pass
7. Manual: visit `/chat` with existing chat data, verify gauges show the chat-bible absolute values with ghost markers at the rebased previous positions

## Architecture Follow-Up

If we later want exact historical absolute relationship charts, the cleaner long-term architecture is to persist per-turn relationship snapshots as first-class data instead of reconstructing history from deltas. That is intentionally out of scope for this ticket because it would widen persistence, route payloads, and migration/testing scope well beyond a UI bugfix.

## Outcome

- Completion date: 2026-03-28
- Actually changed:
  - Server-rendered relationship summary stats and gauge values now prefer `chatBible.relationshipNow.valence` / `.tension` when available, with fallback to `session.relationshipState`
  - Chat gauges now render a ghost marker for the previous displayed position
  - Client-side relationship history is now rebased onto the current absolute chat-bible values for gauge and sparkline display when available, while retaining raw `relationshipState` history internally for delta tracking and incremental updates
  - Existing server-view and client-controller tests were strengthened to cover the new source-of-truth split, ghost markers, rebased history, and fallback behavior
- Deviations from original plan:
  - Did not switch sparkline/history to true historical chat-bible snapshots because the current architecture does not persist them
  - Implemented rebased display history instead, which is the cleanest in-scope fix without widening persistence or route payload contracts
  - Updated existing test files instead of adding the non-existent `test/unit/public/js/chat-sidebar.test.ts`
- Verification results:
  - `node scripts/concat-client-js.js`
  - `npm run test:unit -- --coverage=false --runInBand test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm test`
