# STOARCGEN-004: LLM Layer Rename — beat to milestone

**Status**: REJECTED
**Superseded by**: STOARCGEN-001

## Reason

This ticket split prompt/schema/parser renames away from the rest of the migration and assumed persistence backward compatibility would cover the gap.

That was the wrong architectural boundary. The LLM contract is part of the domain surface, so it should have been migrated atomically with runtime models and consumers.

## Outcome

- Date: 2026-03-14
- Actual resolution: prompt text, schema keys, response parsing, and related fixtures were migrated to `milestone` under STOARCGEN-001.
- The old assumption that only new LLM calls would use `milestones` while persistence handled old `beats` was rejected.
- The repository now uses one canonical structure term across runtime and LLM contracts.
