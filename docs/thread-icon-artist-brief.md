# Thread Icon Design Brief

## Overview

We need 21 icon files for a dark-themed interactive storytelling web application. These icons represent **story threads** (ongoing plot elements) displayed in a sidebar panel. Each icon combines a **thread type** (what kind of plot element) with an **urgency level** (how pressing it is).

The icons replace an older set of black-and-white rope illustrations that were illegible at small sizes.

## Display Context

- Icons appear inside a dark sidebar panel (`background: rgba(14, 24, 49, 0.95)`) on a deep navy page
- Rendered at approximately **28px x 28px** on desktop and **22px x 22px** on mobile
- Displayed inline next to short text descriptions
- Neighboring icon families in the same UI use colored backgrounds with white silhouettes (hexagonal threat badges, circular constraint badges, rectangular choice badges)

## Badge Shape

**Rounded shield / heraldic escutcheon** with softened corners. Flat top curving to a gentle point at the bottom. This shape must be distinct from the hexagons, circles, and rectangles used by other icon families.

The colored background fills the entire shield shape. Everything outside the shield must be **transparent**.

## Icon Style

- **White silhouette** icon centered on the colored shield background
- **Bold, minimal detail** - must read clearly at 20px
- No outlines, no gradients on the icon itself - pure white on color
- The icon should occupy roughly 60-70% of the shield area, leaving breathing room

## Urgency Border Ring

Each icon has a border ring drawn around the shield perimeter that encodes urgency:

| Urgency | Border Width | Border Color        | Hex       |
|---------|-------------|---------------------|-----------|
| LOW     | 2px         | Muted gray-blue     | `#94A3B8` |
| MEDIUM  | 3px         | Amber               | `#F59E0B` |
| HIGH    | 4px         | Bright red           | `#EF4444` |

The border should follow the shield contour. It sits outside (or on the edge of) the colored fill, not overlapping the icon.

## Per-Type Specifications

| Thread Type   | Icon Concept                                    | Background Color | Hex       |
|---------------|-------------------------------------------------|------------------|-----------|
| MYSTERY       | Magnifying glass with eye or question mark       | Deep purple      | `#7C3AED` |
| QUEST         | Compass rose or flag planted on a hilltop        | Gold / amber     | `#CA8A04` |
| RELATIONSHIP  | Two linked silhouettes or intertwined circles    | Rose             | `#E11D48` |
| DANGER        | Flame or lightning bolt                          | Brick red        | `#B91C1C` |
| INFORMATION   | Open book or unfurling scroll                    | Teal             | `#0D9488` |
| RESOURCE      | Gem or treasure chest                            | Jade green       | `#047857` |
| MORAL         | Scales of justice                                | Indigo           | `#6366F1` |

## File Specifications

- **Format**: PNG with transparency
- **Minimum resolution**: 128 x 128 px (will be scaled down to ~28px in the UI)
- **Color space**: sRGB

## Required Files (21 total)

Each type gets three variants (one per urgency level). File names must match exactly:

```
thread-mystery-low.png
thread-mystery-medium.png
thread-mystery-high.png

thread-quest-low.png
thread-quest-medium.png
thread-quest-high.png

thread-relationship-low.png
thread-relationship-medium.png
thread-relationship-high.png

thread-danger-low.png
thread-danger-medium.png
thread-danger-high.png

thread-information-low.png
thread-information-medium.png
thread-information-high.png

thread-resource-low.png
thread-resource-medium.png
thread-resource-high.png

thread-moral-low.png
thread-moral-medium.png
thread-moral-high.png
```

## Delivery

Place all 21 files in:

```
public/images/icons/
```

## Visual Reference

The three variants of a single type (e.g. MYSTERY) should be **identical** except for the border ring. The shield color and white icon remain the same across LOW/MEDIUM/HIGH - only the border thickness and color change.

### Quick Sketch (ASCII approximation)

```
  LOW urgency          MEDIUM urgency         HIGH urgency
  thin gray border     medium amber border    thick red border

    ___________          ___________            ___________
   /  #7C3AED  \        /  #7C3AED  \          /  #7C3AED  \
  |             |      |             |        |             |
  |    (eye)    |      |    (eye)    |        |    (eye)    |
  |             |      |             |        |             |
   \           /        \           /          \           /
    \_________/          \_________/            \_________/

  2px #94A3B8           3px #F59E0B            4px #EF4444
```
