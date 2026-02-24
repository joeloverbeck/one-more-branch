# Genre Taxonomy Expansion (16 → 26 genres)

**Date**: 2026-02-24
**Status**: COMPLETED

## Problem

The `GENRE_FRAMES` enum has 16 genres but is missing several well-established narrative modes that would meaningfully change how the LLM generates branching interactive fiction. Research based on Frye, Todorov, Jameson, BISAC taxonomy, and interactive fiction design theory identified 10 high-value additions.

## Decision

Expand `GENRE_FRAMES` from 16 to 26 genres. No genre blending (single primary genre). No compound types. All existing genres preserved.

## New Genres Added

| Genre | Description | Branching Potential |
|-------|-------------|-------------------|
| ADVENTURE | Physical peril, exotic locations, protagonist resourcefulness | Excellent |
| COSMIC_HORROR | Incomprehensible reality, knowledge as madness, no resolution | Excellent |
| CYBERPUNK | Low-life/high-tech, street survival vs. corporate megastructures | Good |
| DARK_COMEDY | Gallows humor and absurd irony amid genuinely dire stakes | Good |
| ESPIONAGE | Deception, cover identities, loyalty-versus-mission tension | Excellent |
| GRIMDARK | Moral nihilism where right action is impossible or futile | Excellent |
| HISTORICAL | Real-period settings with era-specific customs and dilemmas | Good |
| MAGICAL_REALISM | Mundane world where the impossible is treated as ordinary | Moderate |
| PICARESQUE | Episodic rogue's journey through satirical social exposure | Good |
| POST_APOCALYPTIC | Collapsed civilization, survival, and rebuilding amid ruins | Excellent |

## Full Genre List (26 total, alphabetized)

ADVENTURE, COSMIC_HORROR, CYBERPUNK, DARK_COMEDY, DRAMA, DYSTOPIAN, ESPIONAGE, FABLE, FANTASY, GOTHIC, GRIMDARK, HISTORICAL, HORROR, LITERARY, MAGICAL_REALISM, MYSTERY, MYTHIC, NOIR, PICARESQUE, POST_APOCALYPTIC, ROMANCE, SATIRE, SCI_FI, SURREAL, THRILLER, WESTERN

## Files Changed

1. `src/models/concept-generator.ts` — expand `GENRE_FRAMES` array (type + guard auto-derive)
2. `src/llm/prompts/concept-prompt-shared.ts` — update `buildConceptTaxonomyGuidance()` descriptions

## Files That Auto-Derive (No Changes Needed)

- All JSON schemas (use `[...GENRE_FRAMES]` spread)
- `isGenreFrame()` type guard (derived from array)
- `concept-spec-parser.ts` (calls `isGenreFrame()`)
- All downstream prompts (receive genreFrame as string)

## Backward Compatibility

Zero breaking changes. All 16 existing genres preserved. Purely additive expansion.

## Future Work (Separate Ticket)

- UI genre grouping/filtering on concepts page
- Genre badges in concept cards
- Genre filter in concept dropdowns

## Research Sources

See deep research agent output from 2026-02-24 session for full citations including Frye's Anatomy of Criticism, Todorov's Theory of the Fantastic, BISAC Subject Headings, and interactive fiction design studies.

## Outcome

- Completion date: 2026-02-24
- What was implemented:
  - Added 10 new genre frames and expanded total taxonomy size from 16 to 26.
  - Kept all original genres and preserved backward compatibility.
  - Aligned prompt taxonomy descriptions with the expanded, alphabetized genre list.
- Deviations from design:
  - None in scope; implementation matched additive-only intent.
- Verification:
  - Unit tests passed (`npm run test:unit`).
  - Typecheck passed (`npm run typecheck`).
  - Build passed (`npm run build`).
