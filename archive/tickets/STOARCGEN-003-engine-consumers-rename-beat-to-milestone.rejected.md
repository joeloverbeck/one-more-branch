# STOARCGEN-003: Engine Consumers Rename — beat to milestone

**Status**: REJECTED
**Superseded by**: STOARCGEN-001

## Reason

This ticket depended on a staged migration that separated engine consumer updates from the rest of the rename.

That architecture was inferior to a single canonical migration. Engine consumers could not be treated as an isolated later phase without leaving mixed domain language and broken contracts across persistence, prompts, and tests.

## Outcome

- Date: 2026-03-14
- Actual resolution: engine consumer updates were completed in the same pass as the core rename under STOARCGEN-001.
- Scope absorbed there included structure state, rewrite support, page builder, deviation flows, pacing flows, and page-service/story-engine consumers.
- No aliases or temporary bridge names were kept.
