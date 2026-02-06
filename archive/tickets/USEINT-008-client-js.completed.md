# USEINT-008: Client-Side JavaScript

## Status

Completed (2026-02-06)

## Summary

Implement client-side JavaScript for the play page: API key management in `sessionStorage`, AJAX choice submission, and dynamic page updates without full reload.

## Reassessed Assumptions (2026-02-06)

- `public/js/app.js` did not exist in this repository.
- `test/unit/server/public/app.test.ts` did not exist.
- `public/css/styles.css` and play-page IDs/classes already existed and were the DOM contract to target.
- The script is included on multiple pages (`home`, `new-story`, `play`, `error`), so initialization needed to no-op safely outside the play page.
- Jest is configured with `testEnvironment: 'node'`; tests for this ticket should verify file structure/contracts rather than browser runtime behavior.

## Updated Scope

- Create `public/js/app.js` with a strict-mode IIFE.
- Implement play-page initialization guarded by `.play-container` presence.
- Implement API key helper functions using `sessionStorage` only.
- Implement choice click handling with `fetch('/play/:storyId/choice')`, loading state, and error recovery.
- Implement History API updates and popstate reload behavior.
- Ensure dynamic text inserted into HTML is escaped.
- Create `test/unit/server/public/app.test.ts` with structural and security-contract assertions.

## Files Created

- `public/js/app.js`
- `test/unit/server/public/app.test.ts`

## Files Modified

- `tickets/USEINT-008-client-js.md`

## Out of Scope

- **DO NOT** modify any files in `src/`
- **DO NOT** modify any EJS templates
- **DO NOT** modify CSS
- **DO NOT** use any JavaScript frameworks (React, Vue, etc.)
- **DO NOT** use npm packages for client-side code (no bundler)

## Acceptance Criteria

### Tests That Must Pass

`test/unit/server/public/app.test.ts` verifies:

1. JavaScript file exists at `public/js/app.js`.
2. JavaScript file is non-empty.
3. File uses strict mode (`'use strict'`).
4. File uses an IIFE pattern.
5. File defines `API_KEY_STORAGE_KEY`.
6. File defines `getApiKey`.
7. File defines `setApiKey`.
8. File defines `initPlayPage`.
9. File defines `escapeHtml`.
10. File adds a `DOMContentLoaded` listener.
11. File uses `sessionStorage` and does not use `localStorage`.
12. File escapes dynamic content before `innerHTML` insertion for play-page updates.

### Verification Commands

```bash
npm run test:unit -- --testPathPattern=test/unit/server/public
```

## Invariants That Must Remain True

1. **Session Storage Only**: API key stored in `sessionStorage`.
2. **Never localStorage**: API key must not use `localStorage`.
3. **No XSS in Dynamic Updates**: Dynamic choice/state/narrative updates escape text before `innerHTML` insertion.
4. **AJAX for Choices**: Choice selection uses `fetch`, not form submission.
5. **History API**: URL updates without page reload.
6. **Graceful Degradation**: Script exits safely when not on play page.
7. **Loading State**: UI shows loading indicator during generation.
8. **Error Recovery**: Choice buttons re-enabled after errors.

## Dependencies

- Depends on USEINT-006 for play page HTML structure and choice endpoint.

## Estimated Size

~200 LOC (JavaScript + unit tests)

## Outcome

Originally planned:
- Add client JS and simple structure tests.

Actually changed:
- Added `public/js/app.js` implementing guarded play-page behavior, API key capture via modal, AJAX choice posting, loading/error handling, URL updates via History API, and popstate reload.
- Added explicit escaping helpers and used them for narrative, state changes, and choice text before `innerHTML` updates.
- Added `test/unit/server/public/app.test.ts` covering script existence, IIFE/strict mode, required helper definitions, storage invariants, and escaped dynamic update contracts.
- Verified with `npm run test:unit -- --testPathPattern=test/unit/server/public` (pass).
