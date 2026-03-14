# STOARCGEN-007: Test Files Rename — beat to milestone

**Status**: REJECTED
**Superseded by**: STOARCGEN-001

## Reason

This ticket assumed tests should be updated last, after all source code tickets were complete.

That is not how a healthy migration should run. Tests are part of the executable contract and needed to move with the source changes so the repository stayed green throughout the rename.

## Outcome

- Date: 2026-03-14
- Actual resolution: tests and fixtures were updated during the atomic migration in STOARCGEN-001.
- Engine test files were renamed alongside their source modules.
- Unit, integration, and client suites were used as live verification during the migration rather than as a final cleanup phase.
