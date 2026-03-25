# CHABRA-008: Header navigation update and final integration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHABRA-005, CHABRA-006, CHABRA-007

## Problem

The character brainstormer page needs to be discoverable via the site navigation. "Brainstorm Characters" must appear in the Characters dropdown in the header, before "Character Profiles". This ticket also covers final integration verification.

## Assumption Reassessment (2026-03-25)

1. Header navigation uses `nav-dropdown` pattern with `cp` (current path) for active state highlighting — confirmed in `header.ejs`.
2. The Characters dropdown currently contains "Character Profiles" and "Character Webs".
3. The dropdown active state check on the parent uses `cp.startsWith('/character')` — adding `/character-brainstormer` will automatically match this.
4. The concat script must be run to regenerate `app.js` if not already done in CHABRA-007.

## Architecture Check

1. Simple HTML addition following the exact existing pattern.
2. No backwards-compatibility shims needed.

## What to Change

### 1. Update header.ejs

File: `src/server/views/partials/header.ejs`

Add "Brainstorm Characters" link as the first item in the Characters dropdown menu:

```html
<a href="/character-brainstormer" class="nav-dropdown__item<%= cp === '/character-brainstormer' || cp.startsWith('/character-brainstormer') ? ' nav-dropdown__item--active' : '' %>">Brainstorm Characters</a>
```

Insert before the existing "Character Profiles" link.

### 2. Final integration verification

After all CHABRA tickets are implemented:
- `npm run build` succeeds
- `npm run typecheck` passes
- `npm run lint` passes
- `npm test` passes
- `node scripts/concat-client-js.js` produces valid `app.js`
- Manual smoke test: navigate to Characters dropdown, see "Brainstorm Characters" link, page loads correctly

## Files to Touch

- `src/server/views/partials/header.ejs` (modify)

## Out of Scope

- Any changes to existing navigation items or their ordering (except inserting the new item)
- CSS changes to the dropdown
- Any other EJS templates
- Route handler changes (CHABRA-005 — already done)
- Controller changes (CHABRA-007 — already done)

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` succeeds
2. `npm run typecheck` passes
3. `npm run lint` passes
4. Existing suite: `npm test` — no regressions
5. Integration: Characters dropdown contains "Brainstorm Characters" as the first item

### Invariants

1. Existing navigation items ("Character Profiles", "Character Webs") remain unchanged in text and URL
2. Active state highlighting works correctly: visiting `/character-brainstormer` highlights the link AND the Characters dropdown
3. All other dropdown menus remain unchanged
4. The parent dropdown active check (`cp.startsWith('/character')`) still correctly highlights for all character-related paths

## Test Plan

### New/Modified Tests

1. No dedicated test file — header changes are verified by build + existing integration tests + manual smoke test.

### Commands

1. `npm run build` — full build
2. `npm run typecheck` — type verification
3. `npm run lint` — linting
4. `npm test` — full suite
5. Manual: Start dev server, navigate to Characters dropdown, verify link presence and active state
