# CHAUIOVE-004: Improved turn rendering with block styling and tag bar

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-002 (turns render inside `.chat-conversation` pane)

## Problem

Turn rendering already uses dedicated `chat-turn` wrappers, but the message body still uses basic paragraph markup. The spec gap is now narrower: (a) improved block styling — action blocks with italic text and a colored left-border accent, speech blocks with delivery qualifiers as small-caps muted text above the quoted speech; (b) a tag bar on character turns showing `speechAct`, `honestyMode`, and `visibleEmotion` as pill badges; (c) keeping client-side appended turns and server-rendered initial turns structurally aligned.

## Assumption Reassessment (2026-03-28)

1. `buildTurnHtml()` in `public/js/src/20-chat-controller.js` already renders `.chat-turn` / `.chat-turn--user` / `.chat-turn--character`; the ticket must not re-scope this as a `story-card` migration.
2. `buildTurnBlockHtml()` currently renders ACTION as a plain `<p><em>...</em></p>` and SPEECH as a plain `<p>` with an optional `<strong>` prefix. This is the real markup gap.
3. `src/server/views/pages/chat.ejs` already renders `.chat-turn` wrappers server-side, but still uses the same basic paragraph block markup and has no tag bar.
4. `ChatTurn` defines `turnMeta` and `plannerOutput` as optional fields, not character-only fields. In practice the character turn pipeline populates them, while user turns typically do not. The UI must therefore gate tag-bar rendering on `turn.speaker === 'CHARACTER'` and tolerate missing metadata.
5. Client bundle order is alphabetical (`scripts/concat-client-js.js`). A new renderer helper can live in `public/js/src/20a-chat-turn-renderer.js` because `initChatPage()` runs on `DOMContentLoaded`, after all concatenated files have loaded.

## Architecture Check

1. Tag-bar data is optional at the type level. The invariant is behavioral, not structural: only CHARACTER turns may render the tag bar, and missing `plannerOutput` / `turnMeta` values must simply omit pills instead of failing.
2. Requiring a literal single shared markup source across EJS and browser JS is not worth it here. The server path is EJS and the client path is concatenated plain JS; forcing a shared abstraction would add indirection without eliminating much duplication. The better architecture for this ticket is a shared DOM contract, with server and client renderers kept intentionally parallel.
3. It is beneficial to stop `20-chat-controller.js` from owning turn-markup assembly. Move the client turn HTML builders into a dedicated `public/js/src/20a-chat-turn-renderer.js` helper so the controller stays focused on orchestration, submission, and DOM updates.
4. Keep the extraction small. This ticket should not attempt a broader rendering framework or a server/client templating unification.

## What to Change

### 1. Turn block markup and styling

Keep existing `.chat-turn` wrappers. Replace the inner block paragraphs with explicit block wrappers so CSS can target action and speech content cleanly.

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

- **EJS template** (`chat.ejs`): Update the `turns.forEach` loop for server-side rendering to match the new block/tag-bar DOM contract
- **Client JS** (`20a-chat-turn-renderer.js` + `20-chat-controller.js`): move the turn-markup helpers into the renderer module and have the controller call into it

### 5. CSS classes

Add `.chat-block`, `.chat-block--action`, `.chat-block--speech`, `.chat-delivery`, `.chat-tag-bar`, `.chat-tag`, `.chat-tag--speech-act`, `.chat-tag--honesty`, `.chat-tag--emotion`. Adjust existing `.chat-turn` styling only if needed.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — update turn rendering markup
- `public/js/src/20-chat-controller.js` (modify) — use the extracted turn renderer helpers instead of owning turn HTML construction
- `public/js/src/20a-chat-turn-renderer.js` (new) — turn-specific HTML builders for blocks, tag bar, and full-turn markup
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
4. SPEECH blocks render with `.chat-block--speech` class and `.chat-delivery` element when a delivery qualifier exists
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

1. `test/unit/server/views/chat.test.ts` — update: server-rendered turns use `.chat-block*` wrappers and character tag bars
2. `test/unit/server/views/chat.test.ts` — add: character turn omits missing pills without breaking render
3. `test/unit/client/chat-page/controller.test.ts` — update: appended turns use renderer markup and character-only tag bars
4. `test/unit/client/chat-page/controller.test.ts` — add: appended character turns tolerate missing planner/meta fields

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/server/views/chat.test.ts test/unit/server/public/css.test.ts` — targeted server-side checks
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm run lint` — lint
4. `npm test` — full suite

## Outcome

- **Completion date**: 2026-03-28
- **What changed**: Updated both render paths to use explicit `chat-block` wrappers, added a character-only tag bar for `speechAct` / `honestyMode` / `visibleEmotion`, extracted client-side turn rendering into `public/js/src/20a-chat-turn-renderer.js`, and added CSS plus regression coverage for missing metadata.
- **Deviations from original plan**: Did not treat this as a `story-card` to `chat-turn` migration because that had already been implemented. Also did not force a single shared renderer across EJS and client JS; keeping parallel renderers with the same DOM contract is cleaner in the current architecture.
- **Verification results**: `node scripts/concat-client-js.js`, `npm run test:unit -- --runTestsByPath test/unit/server/views/chat.test.ts test/unit/server/public/css.test.ts`, `npm run test:client`, `npm run lint`, and `npm test` all passed.
