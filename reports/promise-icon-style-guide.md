# Promise Type Icons: Style Guide & Creative Brief

## Overview

The play page sidebar has four narrative-tracking widgets: threads, threats, constraints, and promises. The first three have PNG icons for their enum values (`public/images/icons/*`), but the Tracked Promises panel currently uses only text badges. This document specifies the visual design for 18 promise-type icons to bring the promises panel to visual parity.

## Existing Icon Style Analysis

### Thread Icons (21 files: 7 types x 3 urgencies)
- **Shape**: Shield silhouette
- **Style**: Flat silhouettes with a single dominant color, minimal detail
- **Urgency encoding**: Background tint (grey = LOW, gold = MEDIUM, red = HIGH)
- **Naming**: `thread-{type}-{urgency}.png` (e.g., `thread-quest-high.png`)
- **Reference images**: `public/images/icons/thread-quest-high.png`, `thread-mystery-medium.png`, `thread-danger-low.png`

### Threat Icons (3 types, no urgency dimension)
- **Shape**: Warning/danger style, more illustrative
- **Style**: Detailed pictographic (creature, environment, hostile agent)
- **Naming**: `threat-{type}.png` (e.g., `threat-creature.png`, `threat-environmental.png`)
- **Reference images**: `public/images/icons/threat-creature.png`, `threat-hostile-agent.png`

### Constraint Icons (3 types, no urgency dimension)
- **Shape**: Lock/restriction motif
- **Style**: Simple iconographic, single color palette
- **Naming**: `constraint-{type}.png` (e.g., `constraint-temporal.png`)
- **Reference images**: `public/images/icons/constraint-temporal.png`, `constraint-physical.png`

## Promise Icon Specification

### Base Shape: Scroll / Parchment

All promise icons share a scroll/parchment silhouette as their base container, distinguishing them from the shield (threads), warning (threats), and lock (constraints) families at a glance.

### Visual Complexity: Hybrid

Promise icons use a **hybrid** complexity level:
- More evocative than thread silhouettes (which are flat single-color shields)
- Less illustrative than threat icons (which are detailed pictographics)
- Each scroll contains a centered symbol rendered with moderate detail and a distinctive color palette

### Urgency Encoding

Like threads, each promise type has 3 urgency variants encoded via the scroll's **border/trim color**:

| Urgency | Border/Trim Color | Visual Feel |
|---------|-------------------|-------------|
| LOW     | Grey (#9E9E9E)    | Muted, patient |
| MEDIUM  | Gold (#FFB300)    | Warm, attention-worthy |
| HIGH    | Red (#E53935)     | Urgent, demanding |

This produces **6 types x 3 urgencies = 18 total icons**.

## Promise Type Symbol Concepts

### 1. CHEKHOV_GUN
- **Symbol**: Pistol resting on a hook/mantle bracket
- **Color palette**: Steel grey / gunmetal (#607D8B)
- **Concept**: A loaded weapon waiting to fire - the classic narrative device of an introduced element that must pay off
- **Visual**: Small flintlock pistol silhouette hanging from an ornate wall hook, centered on the scroll

### 2. FORESHADOWING
- **Symbol**: Figure casting an oversized, distorted shadow
- **Color palette**: Deep indigo / midnight blue (#1A237E)
- **Concept**: A hint of things to come - the shadow reveals more than the figure itself
- **Visual**: Small standing figure with a dramatically larger shadow stretching behind/below it, centered on the scroll

### 3. UNRESOLVED_TENSION
- **Symbol**: Taut rope about to snap, with visible fraying
- **Color palette**: Burnt crimson / dark red (#B71C1C)
- **Concept**: An emotional or relational setup demanding closure - something stretched to its limit
- **Visual**: Diagonal rope pulled taut between two anchor points, center strands fraying, centered on the scroll

### 4. DRAMATIC_QUESTION
- **Symbol**: Ornate question mark with a keyhole in the dot
- **Color palette**: Rich amber / gold (#FF8F00)
- **Concept**: A story-level question the reader expects answered - the key to understanding
- **Visual**: Decorative serif question mark, the dot replaced by a keyhole shape, centered on the scroll

### 5. MYSTERY_HOOK
- **Symbol**: Fishhook with a glowing lure dangling
- **Color palette**: Deep emerald green (#1B5E20)
- **Concept**: A deliberate information gap designed to reel the reader in
- **Visual**: Curved fishhook with a small luminous orb at the barb end, centered on the scroll

### 6. TICKING_CLOCK
- **Symbol**: Pocket watch with visible gears, hands near midnight
- **Color palette**: Copper / bronze (#BF360C)
- **Concept**: Time-bound urgency - a constraint with a deadline
- **Visual**: Open-faced pocket watch showing internal gears, hour and minute hands at 11:55, centered on the scroll

## File Naming Convention

```
promise-{type}-{urgency}.png
```

### Complete File List (18 icons)

```
promise-chekhov-gun-low.png
promise-chekhov-gun-medium.png
promise-chekhov-gun-high.png
promise-foreshadowing-low.png
promise-foreshadowing-medium.png
promise-foreshadowing-high.png
promise-unresolved-tension-low.png
promise-unresolved-tension-medium.png
promise-unresolved-tension-high.png
promise-dramatic-question-low.png
promise-dramatic-question-medium.png
promise-dramatic-question-high.png
promise-mystery-hook-low.png
promise-mystery-hook-medium.png
promise-mystery-hook-high.png
promise-ticking-clock-low.png
promise-ticking-clock-medium.png
promise-ticking-clock-high.png
```

## Technical Specifications

| Property | Value |
|----------|-------|
| Source dimensions | 128x128 or 256x256 px |
| Display size | 32x32 px (CSS-scaled) |
| Format | PNG with transparency |
| Location | `public/images/icons/` |
| Background | Transparent |
| Anti-aliasing | Yes, for smooth scaling |

## Integration Notes

- The code already includes `onerror="this.style.display='none'"` on all icon `<img>` elements, so missing PNGs degrade gracefully to text-only badges
- Icon paths are generated via `getPromiseIconPath(promiseType, urgency)` in `public/js/src/02-utils.js`
- Path formula: `/images/icons/promise-{type_lowercase_hyphenated}-{urgency_lowercase}.png`
- Icons appear in two locations:
  1. **Sidebar**: Tracked Promises panel (prepended before text badges)
  2. **Story Insights modal**: Resolved promise payoffs (positioned in top-right corner like thread payoff badges)
