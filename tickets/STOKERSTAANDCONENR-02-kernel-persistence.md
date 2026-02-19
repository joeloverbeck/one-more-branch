# STOKERSTAANDCONENR-02: Kernel Persistence Layer

**Status**: PENDING
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-01
**Spec Phase**: 2a, 2b

## Summary

Create the file-based kernel repository and add kernel storage helper functions to file-utils. Mirrors the concept persistence pattern exactly.

## File List

### New Files
- `src/persistence/kernel-repository.ts` -- CRUD operations for SavedKernel and GeneratedKernelBatch

### Modified Files
- `src/persistence/file-utils.ts` -- Add kernel directory helpers (getKernelsDir, ensureKernelsDir, getKernelFilePath, getKernelGenerationsDir, ensureKernelGenerationsDir, getKernelGenerationFilePath)
- `src/config/schemas.ts` -- Add `kernelsDir` config field (default: `'kernels'`)

### Test Files
- `test/unit/persistence/kernel-repository.test.ts` -- CRUD operations with mocked file I/O

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

Mirror `src/persistence/concept-repository.ts` pattern exactly. Functions:

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
- `loadKernel` returns parsed SavedKernel for existing file
- `updateKernel` throws for non-existent kernel
- `updateKernel` applies updater function and writes result
- `deleteKernel` removes the file under lock
- `listKernels` returns empty array when directory is empty
- `listKernels` returns kernels sorted by updatedAt descending
- `saveKernelGenerationBatch` writes to generated subdirectory
- `kernelExists` returns true/false correctly

### Invariants
- All write operations use `withLock`
- Lock prefix is `'kernel:'` (not `'concept:'`)
- Storage directory is configurable via `config.storage.kernelsDir`
- File paths follow `{kernelsDir}/{id}.json` pattern
- Generation batches go in `{kernelsDir}/generated/{id}.json`
- Existing concept persistence is untouched
