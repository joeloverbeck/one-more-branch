# USEINT-007: CSS Styling and Theming

## Status

Completed (2026-02-06)

## Summary

Add the missing stylesheet for existing server-rendered UI templates and verify key theme/layout selectors with unit tests.

## Reassessed Assumptions (2026-02-06)

- `public/` does not currently exist in this repository, even though `createApp()` serves `../../public` as static assets.
- `public/css/styles.css` does not exist yet.
- `test/unit/server/public/css.test.ts` does not exist yet.
- Server views already emit `<link rel="stylesheet" href="/css/styles.css">` in full-page templates and in `layouts/main.ejs`.
- Current view files are full HTML pages with shared partial includes; this ticket should not refactor view structure.
- The current UI surface already uses many semantic CSS class names (`.btn`, `.container`, `.site-header`, `.choice-btn`, `.loading-overlay`, `.modal`, etc.) that require styling from this ticket.

## Updated Scope

- Create `public/css/styles.css` with:
  - theme variables
  - base/reset styles
  - styles for classes currently present in server-rendered templates
  - responsive rules for mobile
  - spinner keyframe animation used by loading overlay
- Create `test/unit/server/public/css.test.ts` to validate stylesheet existence and required selector/variable coverage.
- Keep implementation surgical and avoid touching server routes/views unless required for CSS integration (currently not required).

## Files to Create

- `public/css/styles.css`
- `test/unit/server/public/css.test.ts`

## Files to Modify

None.

## Out of Scope

- **DO NOT** modify any files in `src/`
- **DO NOT** modify any EJS templates
- **DO NOT** create JavaScript files
- **DO NOT** add third-party CSS frameworks

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/public/css.test.ts`:

1. CSS file exists at `public/css/styles.css`.
2. CSS file is non-empty and substantial (>1000 characters).
3. CSS defines `:root` with CSS variables.
4. CSS includes `--color-primary` variable.
5. CSS includes `--color-bg` variable.
6. CSS includes key layout/component selectors used by templates (`.container`, `.site-header`, `.btn`, `.story-card`, `.choice-btn`, `.loading-overlay`, `.modal`).
7. CSS includes a mobile `@media` breakpoint.
8. CSS includes `@keyframes spin` for the loading spinner.
9. CSS does not import external CSS frameworks.

### Verification Commands

```bash
npm run test:unit -- --testPathPattern=test/unit/server/public/css.test.ts
```

## Invariants That Must Remain True

1. **No External Dependencies**: Pure CSS, no frameworks or preprocessors.
2. **Template Compatibility**: Existing class names in server templates remain the CSS contract.
3. **Responsive Design**: Includes mobile behavior at 600px breakpoint.
4. **Theme Variables**: Core colors/typography exposed via CSS variables.
5. **Loading Behavior Support**: Spinner classes and keyframes required by play UI are present.

## Dependencies

None (can be implemented in parallel with other UI tickets).

## Estimated Size

~350-550 LOC (CSS + unit test)

## Outcome

Originally planned:
- Create full CSS styling and matching tests for the UI.

Actually changed:
- Added `public/css/styles.css` with dark-theme variables, base/reset rules, component styles for existing templates, loading spinner animation, modal styling, and 600px responsive behavior.
- Added `test/unit/server/public/css.test.ts` to verify file existence/size, required variables/selectors, responsive and spinner rules, and absence of external CSS imports.
- Reassessed and corrected ticket assumptions/scope before implementation to match the real repository baseline (missing `public/` and missing CSS tests).
