# STOARCGEN-006: UI Layer Rename — beat to milestone

**Status**: REJECTED
**Superseded by**: STOARCGEN-001

## Reason

This ticket treated UI terminology as a downstream cleanup after the backend rename.

That split was unnecessary and would have left the user-facing surface out of sync with the runtime contracts. Because the domain word itself was wrong, UI text and payload names needed to move in the same migration.

## Outcome

- Date: 2026-03-14
- Actual resolution: server helpers, play-page rendering, client JS source, and the generated client bundle were updated under STOARCGEN-001.
- The UI now exposes `milestone` terminology consistently instead of lagging behind the backend rename.
