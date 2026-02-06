# USEINT-007: CSS Styling and Theming

## Summary

Create the complete CSS stylesheet with dark theme, CSS variables for theming, and responsive design. The styling creates a storybook-like atmosphere appropriate for an interactive fiction application.

## Files to Create

- `public/css/styles.css` - Main stylesheet

## Files to Modify

None.

## Out of Scope

- **DO NOT** modify any files in `src/`
- **DO NOT** modify any EJS templates
- **DO NOT** create JavaScript files
- **DO NOT** add third-party CSS frameworks

## Implementation Details

### `public/css/styles.css`

The complete stylesheet as specified in the spec, including:

1. **CSS Variables** for theming (colors, fonts, spacing)
2. **Reset** and base styles
3. **Header** and navigation
4. **Footer** with disclaimer
5. **Hero section** for home page
6. **Buttons** (primary, secondary, danger, sizes)
7. **Stories grid** and cards
8. **Forms** and inputs
9. **Alerts** for error messages
10. **Play page** layout and narrative styling
11. **Choices** buttons with hover states
12. **State changes** sidebar
13. **Ending banner**
14. **Loading overlay** with spinner animation
15. **Modal** for API key input
16. **Error page** styling
17. **Responsive** breakpoints for mobile

See spec for complete CSS implementation.

### Key Design Decisions

- **Dark Theme**: Background #1a1a2e, text #eaeaea
- **Primary Color**: #e94560 (coral/red accent)
- **Secondary Color**: #533483 (purple)
- **Fonts**: Georgia serif for body, Palatino for headings
- **Max Width**: 900px content container
- **Border Radius**: 8px for all rounded corners

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/public/css.test.ts`:

1. CSS file exists at public/css/styles.css
2. CSS file is non-empty (>1000 characters)
3. CSS defines :root with CSS variables
4. CSS includes --color-primary variable
5. CSS includes --color-bg variable
6. CSS includes .btn class
7. CSS includes .container class
8. CSS includes @media query for mobile breakpoint
9. CSS includes @keyframes for spinner animation

### Visual Verification (Manual)

After implementation, manually verify:
- [ ] Dark theme renders correctly
- [ ] Buttons have hover/active states
- [ ] Forms are styled and usable
- [ ] Loading spinner animates
- [ ] Modal centers on screen
- [ ] Mobile view is responsive
- [ ] Text is readable (contrast)
- [ ] Navigation is accessible

### Verification Commands

```bash
npm run test:unit -- --testPathPattern=test/unit/server/public/css.test.ts
# Also run the dev server and visually inspect
npm run dev
```

## Invariants That Must Remain True

1. **No External Dependencies**: Pure CSS, no frameworks or preprocessors
2. **CSS Variables**: All colors and key values use variables for theming
3. **Responsive Design**: Works on mobile (600px breakpoint)
4. **Accessibility**: Color contrast meets WCAG AA standards
5. **Print-Safe**: No critical info lost if printed
6. **Animation Performance**: Uses transform/opacity for animations

## CSS Structure

```css
/* 1. Variables */
:root { ... }

/* 2. Reset */
*, *::before, *::after { ... }

/* 3. Base */
html, body { ... }
.container { ... }

/* 4. Header */
.site-header { ... }
.logo { ... }
nav { ... }

/* 5. Footer */
.site-footer { ... }
.disclaimer { ... }

/* 6. Hero */
.hero { ... }
.tagline { ... }

/* 7. Buttons */
.btn { ... }
.btn-primary { ... }
.btn-secondary { ... }
.btn-danger { ... }
.btn-large { ... }
.btn-small { ... }

/* 8. Stories */
.stories-section { ... }
.stories-grid { ... }
.story-card { ... }

/* 9. Forms */
.form-section { ... }
.form-group { ... }
.form-help { ... }
.form-actions { ... }

/* 10. Alerts */
.alert { ... }
.alert-error { ... }

/* 11. Play Page */
.play-container { ... }
.story-header { ... }
.narrative { ... }

/* 12. Choices */
.choices-section { ... }
.choices { ... }
.choice-btn { ... }
.explored-marker { ... }

/* 13. State Changes */
.state-changes { ... }

/* 14. Ending */
.ending-banner { ... }
.ending-actions { ... }

/* 15. Loading */
.loading-overlay { ... }
.loading-spinner { ... }
@keyframes spin { ... }

/* 16. Modal */
.modal { ... }
.modal-content { ... }
.modal-actions { ... }

/* 17. Error Page */
.error-page { ... }
.error-message { ... }
.error-actions { ... }

/* 18. Utilities */
.inline-form { ... }
.empty-state { ... }

/* 19. Responsive */
@media (max-width: 600px) { ... }
```

## Dependencies

None (can be implemented in parallel with USEINT-002, USEINT-003).

## Estimated Size

~550 LOC (CSS only, no TypeScript)
