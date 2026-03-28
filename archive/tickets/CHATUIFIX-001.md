# CHATUIFIX-001: Enlarge chat message textarea

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The original ticket diagnosis was incorrect. The visible problem on the chat page (`/chat`) was not textarea height but textarea width: the message field was not filling the available middle grid column, leaving most of the composer row empty.

## Assumption Reassessment (2026-03-28)

1. `src/server/views/pages/chat.ejs:947-954` — textarea has `rows="1"` and `maxlength="2000"`. Confirmed.
2. `public/css/styles.css:1088-1092` — `.chat-input-form__composer` already uses `grid-template-columns: auto minmax(0, 1fr) auto`, so the middle track is designed to flex. Confirmed.
3. `public/css/styles.css:1156-1160` previously did not give `.chat-input-form__message textarea` an explicit `width: 100%`, so the textarea could render at its intrinsic width instead of filling the available grid track.
4. `public/js/src/20-chat-controller.js:156-173` owns vertical auto-resize only. It was not the source of the width bug.
4. Existing tests already cover this area:
   - `test/unit/server/views/chat.test.ts` asserts the rendered textarea includes `rows="1"`.
   - `test/unit/client/chat-page/controller.test.ts` exercises textarea auto-resize and expects reset to `46px`.
   - `test/unit/server/public/css.test.ts` can cover the width-filling CSS contract directly.

## Architecture Check

1. The correct fix is CSS-driven layout: the grid defines the available composer width and the textarea must explicitly fill its grid column.
2. JS should continue to own vertical auto-resize only. Width should stay declarative in CSS.
3. A small `min-width: 0` safeguard on the grid item keeps the middle column shrinkable in constrained layouts.
3. No backwards-compatibility shims or aliasing should be introduced.

## What to Change

### 1. Make the textarea fill the available composer width

In `public/css/styles.css`, add `width: 100%` and `box-sizing: border-box` to `.chat-input-form__message textarea`, and add `min-width: 0` to `.chat-input-form__message` so the textarea reliably fills the flexible middle grid track.

### 3. Align the chat controller with the rendered sizing rules

Update `public/js/src/20-chat-controller.js` so textarea auto-resize uses the textarea's rendered `min-height` / `max-height` instead of duplicating `46` / `168` in JS. This keeps the initial size and runtime resizing behavior in sync.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)
- `src/server/views/pages/chat.ejs` (no change required after reassessment; remains `rows="1"`)
- `public/js/src/20-chat-controller.js` (modify)
- `public/js/app.js` (generated via `npm run concat:js`)
- `test/unit/server/views/chat.test.ts` (no net behavior change; remains `rows="1"`)
- `test/unit/client/chat-page/controller.test.ts` (modify)
- `test/unit/server/public/css.test.ts` (modify)

## Out of Scope

- Character counter display
- Markdown preview

## Acceptance Criteria

### Tests That Must Pass

1. The textarea fills the available middle grid column in the chat composer
2. The textarea still renders with `rows="1"` and the original minimum height contract
3. Client auto-resize still grows up to the existing cap and resets back to the minimum after submit
4. Relevant unit tests pass, plus project lint/build validation

### Invariants

1. The textarea must fill the flexible middle grid track instead of using intrinsic width
2. The textarea must not exceed `max-height: 168px` (prevents input bar from dominating the viewport)
3. The grid layout of API key / textarea / Send button must remain properly aligned
4. The chat controller must not maintain a divergent hardcoded minimum height from the stylesheet

## Test Plan

### New/Modified Tests

1. Keep `test/unit/server/views/chat.test.ts` asserting `rows="1"` on the chat message textarea
2. Update `test/unit/client/chat-page/controller.test.ts` to assert the controller resets the textarea to the stylesheet minimum height after submit
3. Add or strengthen a client test to verify the controller derives resize bounds from rendered styles rather than stale hardcoded values
4. Add a stylesheet test that asserts the chat composer textarea explicitly fills its grid column

### Commands

1. `npm run test:unit -- --runInBand test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint`
3. `npm run build`
4. `npm test`

## Outcome

- Completion date: 2026-03-28
- What changed:
  - Corrected the original diagnosis: the issue was width, not height.
  - Ensured the chat composer textarea fills the middle grid column by adding explicit width-filling CSS and a grid-item `min-width: 0` safeguard.
  - Removed the controller's stale hardcoded minimum-height dependency by deriving resize bounds from the rendered textarea styles.
  - Kept the original `rows="1"` / `min-height: 46px` vertical sizing contract.
  - Updated tests to cover the width-filling CSS contract and the controller's resize-floor behavior.
- Deviations from the original plan:
  - The original ticket's height-based premise was wrong. After reviewing the rendered UI, the implementation was corrected to address width instead.
  - The controller refinement stayed in scope because it removes duplicated vertical sizing constants and keeps JS aligned with CSS.
  - Targeted verification used `npx jest --runInBand test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts test/unit/server/public/css.test.ts` because the repo's `npm run test:unit -- ...` invocation still expands to the full unit suite.
- Verification results:
  - `npx jest --runInBand test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts test/unit/server/public/css.test.ts` passed
  - `npm run lint` passed
  - `npm run build` passed
  - `npm test` passed
