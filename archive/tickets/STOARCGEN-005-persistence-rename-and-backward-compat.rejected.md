# STOARCGEN-005: Persistence Layer Rename + Backward Compatibility

**Status**: REJECTED
**Superseded by**: STOARCGEN-001

## Reason

This ticket proposed backward-compatibility hooks for old `beat` keys.

That is no longer the desired architecture. The project direction for this rename was explicit: no backward compatibility, no aliasing, no dual-read translation layer. Keeping fallback parsing would have preserved the wrong vocabulary in one of the most important boundaries in the system.

## Outcome

- Date: 2026-03-14
- Actual resolution: persistence was migrated directly to `milestone` terminology under STOARCGEN-001.
- No upcasters or compatibility shims were added for `beats`, `currentBeatIndex`, `pageBeatIndex`, or related keys.
- Persistence tests were updated to validate the milestone-only shape instead of fallback translation behavior.
