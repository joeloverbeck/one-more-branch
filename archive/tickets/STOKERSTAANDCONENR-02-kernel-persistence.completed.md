# STOKERSTAANDCONENR-02: Kernel Persistence Layer

**Status**: COMPLETED
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-01
**Spec Phase**: 2a, 2b

## Summary

Create the file-based kernel repository and add kernel storage helper functions to file-utils, aligned with current repository patterns for persistence validation, locking, and config defaults.

## Reassessed Assumptions

1. `SavedKernel` and `GeneratedKernelBatch` already exist in `src/models/saved-kernel.ts`; this ticket should consume those exact shapes instead of redefining them.
2. In this codebase, persisted payloads are runtime-validated on load/list/update (for example `concept-repository.ts` via `isSavedConcept`); kernel persistence must follow the same defensive validation pattern.
3. Repository tests here are file-backed unit tests (real JSON files in test storage directories), not mocked fs I/O tests. Kernel repository tests should follow that existing style.
4. `GeneratedKernelBatch` currently uses `generatedAt` (not `createdAt`). This ticket adopts that as source of truth to avoid type drift.
5. Storage config defaults are validated by schema and tested in config unit tests; adding `kernelsDir` requires corresponding schema and config test updates.

## Architecture Decision

This change is beneficial versus the current architecture because it introduces a dedicated kernel persistence boundary consistent with existing concept persistence: deterministic paths, lock-scoped writes, runtime payload guards, and atomic JSON writes. This preserves clean layering (models -> persistence -> services/routes) and improves extensibility for later kernel routes/services without coupling them to concept storage internals.

## File List

### New Files
- `src/persistence/kernel-repository.ts` -- CRUD operations for `SavedKernel` and `GeneratedKernelBatch`

### Modified Files
- `src/persistence/file-utils.ts` -- Add kernel directory helpers (`getKernelsDir`, `ensureKernelsDir`, `getKernelFilePath`, `getKernelGenerationsDir`, `ensureKernelGenerationsDir`, `getKernelGenerationFilePath`)
- `src/config/schemas.ts` -- Add `kernelsDir` config field (default: `'kernels'`)
- `test/unit/config/schemas.test.ts` -- Assert `kernelsDir` default and override behavior
- `test/unit/config/loader.test.ts` -- Assert loaded config exposes `storage.kernelsDir`
- `test/unit/persistence/file-utils.test.ts` -- Cover kernel path helper behavior

### Test Files
- `test/unit/persistence/kernel-repository.test.ts` -- File-backed CRUD and persisted payload validation tests

## Detailed Requirements

### `src/persistence/file-utils.ts` additions

Mirror the concept helper pattern (`getConceptsDir`, `ensureConceptsDir`, etc.):

1. `getKernelsDir(): string` -- Returns `path.join(process.cwd(), getConfig().storage.kernelsDir)`
2. `ensureKernelsDir(): void` -- Creates kernels directory if absent
3. `getKernelFilePath(kernelId: string): string` -- Returns `{kernelsDir}/{kernelId}.json`
4. `getKernelGenerationsDir(): string` -- Returns `{kernelsDir}/generated`
5. `ensureKernelGenerationsDir(): void` -- Creates generated subdirectory if absent
6. `getKernelGenerationFilePath(generationId: string): string` -- Returns `{generationsDir}/{generationId}.json`

### `src/config/schemas.ts`

Add `kernelsDir: z.string().min(1).default('kernels')` to the storage schema, mirroring `conceptsDir`.

### `src/persistence/kernel-repository.ts`

Mirror `src/persistence/concept-repository.ts` behavior and reliability guarantees:

- Use `withLock` for all writes/updates/deletes.
- Use runtime payload guards (`isSavedKernel`, `isGeneratedKernelBatch`) when reading persisted JSON.
- Keep lock key prefix as `kernel:`.

Functions:

1. `saveKernel(kernel: SavedKernel): Promise<void>` -- With lock
2. `saveKernelGenerationBatch(batch: GeneratedKernelBatch): Promise<void>` -- With lock
3. `loadKernel(kernelId: string): Promise<SavedKernel | null>` -- Read from file
4. `updateKernel(kernelId: string, updater: (existing: SavedKernel) => SavedKernel): Promise<SavedKernel>` -- With lock, throws if not found
5. `deleteKernel(kernelId: string): Promise<void>` -- With lock
6. `listKernels(): Promise<SavedKernel[]>` -- List all, sorted by updatedAt descending
7. `kernelExists(kernelId: string): Promise<boolean>` -- Check file existence

Lock prefix: `'kernel:'`

## Out of Scope

- Kernel data model types (STOKERSTAANDCONENR-01)
- LLM pipeline (STOKERSTAANDCONENR-03, -04)
- Routes, services, UI (STOKERSTAANDCONENR-05 through -08)
- Concept persistence changes (none needed)
- Any changes to `concept-repository.ts`

## Acceptance Criteria

### Tests That Must Pass
- `saveKernel` writes JSON to correct path under lock
- `loadKernel` returns null for non-existent kernel
- `loadKernel` returns parsed `SavedKernel` for existing file
- `loadKernel` throws for invalid persisted `SavedKernel` payload
- `updateKernel` throws for non-existent kernel
- `updateKernel` throws for invalid persisted `SavedKernel` payload
- `updateKernel` applies updater function and writes result
- `deleteKernel` removes the file under lock
- `listKernels` returns empty array when directory is empty
- `listKernels` returns kernels sorted by updatedAt descending
- `listKernels` throws if any persisted kernel payload is invalid
- `saveKernelGenerationBatch` writes to generated subdirectory
- `kernelExists` returns true/false correctly
- Config schema tests validate `storage.kernelsDir` default/override
- File utils tests validate kernel path helper output and directory creation

### Invariants

- All write operations use `withLock`
- Lock prefix is `'kernel:'` (not `'concept:'`)
- Storage directory is configurable via `config.storage.kernelsDir`
- File paths follow `{kernelsDir}/{id}.json` pattern
- Generation batches go in `{kernelsDir}/generated/{id}.json`
- Existing concept persistence is untouched

## Outcome

- **Completion Date**: 2026-02-19
- **What changed**:
  - Added kernel storage config default: `storage.kernelsDir` in `src/config/schemas.ts`.
  - Added kernel path/directory helpers in `src/persistence/file-utils.ts`.
  - Implemented `src/persistence/kernel-repository.ts` with lock-scoped writes, atomic JSON persistence, runtime payload validation, CRUD/list/exists APIs, and generated-batch persistence.
  - Added comprehensive kernel repository tests in `test/unit/persistence/kernel-repository.test.ts`.
  - Extended config and file-utils tests to cover kernel defaults/helpers in `test/unit/config/schemas.test.ts`, `test/unit/config/loader.test.ts`, and `test/unit/persistence/file-utils.test.ts`.
- **Deviations vs original plan**:
  - Repository tests were implemented as file-backed unit tests (matching existing persistence testing style) instead of mocked fs tests.
  - Added explicit runtime validation on write inputs for kernel and batch payloads to tighten persistence invariants.
- **Verification results**:
  - `npm run test:unit` passed.
  - `npm test` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run build` passed.
