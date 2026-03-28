# CHAUIOVE-004: Improved turn rendering with block styling and tag bar

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-002 (turns render inside `.chat-conversation` pane)

## Problem

Turn rendering currently uses generic `story-card` styling. The spec calls for: (a) improved block styling — action blocks with italic text and a colored left-border accent, speech blocks with delivery qualifiers as small-caps muted text above the quoted speech; (b) distinct visual styles for user vs character turns; (c) a tag bar on character turns showing `speechAct`, `honestyMode`, and `visibleEmotion` as pill badges.

## Assumption Reassessment (2026-03-28)

1. `buildTurnHtml()` in `20-chat-controller.js:117` builds turn HTML with `story-card` class — confirmed.
2. `buildTurnBlockHtml()` at line 103 renders ACTION as `<em>` and SPEECH with `block.delivery` as `<strong>` — confirmed.
3. `turn.plannerOutput.speechAct`, `turn.plannerOutput.honestyMode`, and `turn.turnMeta.visibleEmotion` exist in turn data — needs verification against chat turn model.
4. EJS template also renders turns server-side for initial page load (lines 35-65) — both paths need updating.

## Architecture Check

1. Tag bar data (`plannerOutput`, `turnMeta`) is only present on CHARACTER turns, not USER turns. The rendering code must check `turn.speaker === 'CHARACTER'` before rendering the tag bar.
2. Server-side EJS rendering and client-side `buildTurnHtml()` must produce identical markup. Define the structure once in this ticket, used by both.
3. No new JS files needed — changes fit within `20-chat-controller.js` and `chat.ejs`.

## What to Change

### 1. Turn container classes

Replace `story-card` with `chat-turn` class. Add modifier: `chat-turn--user` or `chat-turn--character` based on speaker.

### 2. Block rendering improvements

**ACTION blocks:**
```html
<div class="chat-block chat-block--action">
  <em>action text</em>
</div>
```
CSS: left-border accent (e.g., 3px solid muted color), padding-left.

**SPEECH blocks:**
```html
<div class="chat-block chat-block--speech">
  <span class="chat-delivery">delivery qualifier</span>
  <p>&ldquo;speech text&rdquo;</p>
</div>
```
CSS: `.chat-delivery` as small-caps, muted color, smaller font.

### 3. Tag bar on character turns

Below the blocks, render a row of pill badges:
```html
<div class="chat-tag-bar">
  <span class="chat-tag chat-tag--speech-act">DEFLECT</span>
  <span class="chat-tag chat-tag--honesty">EVASIVE</span>
  <span class="chat-tag chat-tag--emotion">anxious</span>
</div>
```
Only rendered when `turn.speaker === 'CHARACTER'` and the data exists.

### 4. Update both render paths

- **EJS template** (`chat.ejs`): Update the `turns.forEach` loop for server-side rendering
- **Client JS** (`20-chat-controller.js`): Update `buildTurnHtml()` and `buildTurnBlockHtml()`

### 5. CSS classes

Add `.chat-turn`, `.chat-turn--user`, `.chat-turn--character`, `.chat-block`, `.chat-block--action`, `.chat-block--speech`, `.chat-delivery`, `.chat-tag-bar`, `.chat-tag`, `.chat-tag--speech-act`, `.chat-tag--honesty`, `.chat-tag--emotion`.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — update turn rendering markup
- `public/js/src/20-chat-controller.js` (modify) — update `buildTurnHtml()`, `buildTurnBlockHtml()`
- `public/css/styles.css` (modify) — add chat turn and tag bar CSS classes
- `test/unit/server/views/chat.test.ts` (modify) — update turn markup assertions

## Out of Scope

- Expandable "Character's Inner World" panel (CHAUIOVE-005)
- Sidebar changes (CHAUIOVE-007 through CHAUIOVE-009)
- Input bar changes (CHAUIOVE-003)
- Layout grid changes (CHAUIOVE-002)
- Any server route or service changes

## Acceptance Criteria

### Tests That Must Pass

1. Character turns render with `.chat-turn--character` class and tag bar containing speechAct, honestyMode, visibleEmotion pills
2. User turns render with `.chat-turn--user` class and NO tag bar
3. ACTION blocks render with `.chat-block--action` class and italic text
4. SPEECH blocks render with `.chat-block--speech` class and `.chat-delivery` element for delivery qualifier
5. Tag bar pills gracefully handle missing data (e.g., no `plannerOutput`) — simply omit missing pills
6. Existing suite: `npm test` — no regressions
7. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. `data-chat-turn`, `data-chat-speaker`, `data-turn-number` attributes preserved
2. `appendTurn()` still works for dynamically added turns
3. Auto-scroll to latest turn still works
4. Turn content (text, timestamps, speaker names) unchanged

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: turn markup uses `.chat-turn` classes instead of `story-card`
2. `test/unit/server/views/chat.test.ts` — add: character turn renders tag bar with speech act pill
3. `test/unit/server/views/chat.test.ts` — add: user turn does not render tag bar

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
