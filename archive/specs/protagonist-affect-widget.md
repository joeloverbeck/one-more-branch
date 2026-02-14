# Protagonist Affect Widget

**Status**: COMPLETED

## Overview

Display the `protagonistAffect` data (primaryEmotion, primaryIntensity, primaryCause, secondaryEmotions, dominantMotivation) in a floating widget in the left sidebar, positioned **above** inventory and health panels.

## Widget Layout: Segmented Card

Three visual sections within a single `<aside>` panel:

1. **Primary Emotion Section** - emotion name (semi-bold, 1.05rem), 4-dot intensity gauge with label, primary cause (smaller muted text)
2. **Secondary Emotions Section** - compact pill tags (just the emotion word), with `title` attribute tooltips showing the cause
3. **Motivation Section** - italicized quote-style text, inner monologue feel

Sections separated by subtle dashed dividers (`border-top: 1px dashed rgba(...)`).

## Visual Theming: Intensity-Driven Color Accents

The title border-bottom color and dot gauge color shift based on `primaryIntensity`:
- `mild` - cool blue (`rgba(100, 149, 237, 0.5)`)
- `moderate` - warm amber (`rgba(218, 165, 32, 0.5)`)
- `strong` - hot orange-red (`rgba(233, 120, 69, 0.5)`)
- `overwhelming` - vivid crimson with subtle glow (`rgba(233, 69, 96, 0.6)` + text-shadow)

Dots: filled = intensity color, empty = `rgba(255, 255, 255, 0.15)`.

## Data Source

`ProtagonistAffect` from `src/models/protagonist-affect.ts`:
- `primaryEmotion: string` - dominant feeling (e.g., "fear", "attraction", "guilt")
- `primaryIntensity: EmotionIntensity` - 'mild' | 'moderate' | 'strong' | 'overwhelming'
- `primaryCause: string` - what's causing the primary emotion
- `secondaryEmotions: SecondaryEmotion[]` - array of `{ emotion, cause }`
- `dominantMotivation: string` - what the protagonist most wants right now

## Files Modified

1. **`src/server/routes/play.ts`** - Add `protagonistAffect` to POST `/choice` JSON response
2. **`src/server/views/pages/play.ejs`** - Add affect widget HTML above inventory panel in `.left-sidebar-widgets`
3. **`public/css/styles.css`** - Add affect panel styles
4. **`public/js/src/05b-affect-renderer.js`** (NEW) - `renderAffectPanel(protagonistAffect, container)` function
5. **`public/js/src/09-controllers.js`** - Call `renderAffectPanel()` in AJAX choice success handler
6. Run `node scripts/concat-client-js.js` to regenerate `app.js`

## Backend Change

In POST `/choice` response, add `protagonistAffect: result.page.protagonistAffect` to the page object.

The GET route already passes the full `page` object to EJS, so `page.protagonistAffect` is available for server-side rendering.

## Verification

1. `npm run build` - compiles cleanly
2. `npm run typecheck` - no type errors
3. `npm test` - all tests pass
4. `node scripts/concat-client-js.js` - regenerate client JS
5. `npm run test:client` - client tests pass
6. Manual: visit play page with existing story, verify widget appears above inventory/health
7. Manual: make a choice, verify widget updates via AJAX without page reload

## Outcome

- Completion date: February 14, 2026 (archived)
- Implemented changes: Added the protagonist affect widget in the left sidebar above inventory/health, wired `protagonistAffect` into the `/choice` response, added client-side render/update logic, and added styling for intensity-driven accents.
- Deviations from original plan: None documented.
- Verification results: Build/typecheck/tests and manual verification steps are recorded in the Verification section above.
