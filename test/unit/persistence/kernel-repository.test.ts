import * as fsPromises from 'fs/promises';
import { randomUUID } from 'crypto';
import type { GeneratedKernelBatch, SavedKernel } from '@/models/saved-kernel';
import {
  getKernelFilePath,
  getKernelGenerationFilePath,
  writeJsonFile,
} from '@/persistence/file-utils';
import {
  deleteKernel,
  kernelExists,
  listKernels,
  loadKernel,
  saveKernel,
  saveKernelGenerationBatch,
  updateKernel,
} from '@/persistence/kernel-repository';

const TEST_PREFIX = 'TEST: PERLAY-KERNEL-001';

function createEvaluatedKernel(): SavedKernel['evaluatedKernel'] {
  return {
    kernel: {
      dramaticThesis: 'Obsessive control destroys what it tries to protect.',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of loss drives the need to control.',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can protection exist without control?',
    },
    scores: {
      dramaticClarity: 4,
      thematicUniversality: 4,
      generativePotential: 5,
      conflictTension: 5,
      emotionalDepth: 3,
    },
    overallScore: 84,
    passes: true,
    strengths: ['Clear value conflict', 'Strong tension axis'],
    weaknesses: ['Could be more grounded emotionally'],
    tradeoffSummary: 'High generative range with moderate abstraction risk.',
  };
}

function createSavedKernel(id: string, updatedAt?: string): SavedKernel {
  const now = new Date().toISOString();
  return {
    id,
    name: `${TEST_PREFIX} kernel`,
    createdAt: now,
    updatedAt: updatedAt ?? now,
    seeds: {
      thematicInterests: 'control, trust, responsibility',
    },
    evaluatedKernel: createEvaluatedKernel(),
  };
}

function createGeneratedBatch(id: string): GeneratedKernelBatch {
  return {
    id,
    generatedAt: new Date().toISOString(),
    seeds: {
      emotionalCore: 'fear of becoming what you fear',
    },
    evaluatedKernels: [createEvaluatedKernel()],
  };
}

describe('kernel-repository persisted payload validation', () => {
  const createdKernelIds = new Set<string>();
  const createdBatchIds = new Set<string>();

  afterEach(async () => {
    for (const kernelId of createdKernelIds) {
      await deleteKernel(kernelId);
    }

    for (const batchId of createdBatchIds) {
      const generationPath = getKernelGenerationFilePath(batchId);
      await fsPromises.rm(generationPath, { force: true });
    }

    createdKernelIds.clear();
    createdBatchIds.clear();
  });

  it('saves and loads a valid kernel payload', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(kernelId);
    const kernel = createSavedKernel(kernelId);

    await saveKernel(kernel);

    const loaded = await loadKernel(kernelId);
    expect(loaded).toEqual(kernel);
    await expect(kernelExists(kernelId)).resolves.toBe(true);
  });

  it('returns null for missing kernel and false for exists check', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(loadKernel(kernelId)).resolves.toBeNull();
    await expect(kernelExists(kernelId)).resolves.toBe(false);
  });

  it('updates an existing kernel under lock and persists result', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(kernelId);

    await saveKernel(createSavedKernel(kernelId));

    const updated = await updateKernel(kernelId, (existing) => ({
      ...existing,
      name: `${TEST_PREFIX} updated`,
      updatedAt: '2026-02-19T12:00:00.000Z',
    }));

    expect(updated.name).toBe(`${TEST_PREFIX} updated`);

    const loaded = await loadKernel(kernelId);
    expect(loaded?.name).toBe(`${TEST_PREFIX} updated`);
  });

  it('throws when updating a missing kernel', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;

    await expect(
      updateKernel(kernelId, (existing) => ({
        ...existing,
        name: `${TEST_PREFIX} impossible`,
      }))
    ).rejects.toThrow(`Kernel not found: ${kernelId}`);
  });

  it('deletes an existing kernel without throwing for repeated deletes', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(kernelId);

    await saveKernel(createSavedKernel(kernelId));

    await deleteKernel(kernelId);
    await deleteKernel(kernelId);
    createdKernelIds.delete(kernelId);

    await expect(kernelExists(kernelId)).resolves.toBe(false);
  });

  it('lists kernels sorted by updatedAt descending', async () => {
    const newerId = `${TEST_PREFIX}-${randomUUID()}`;
    const olderId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(newerId);
    createdKernelIds.add(olderId);

    await saveKernel(createSavedKernel(olderId, '2026-02-18T00:00:00.000Z'));
    await saveKernel(createSavedKernel(newerId, '2026-02-19T00:00:00.000Z'));

    const kernels = await listKernels();
    const orderedIds = kernels
      .filter((kernel) => kernel.id === newerId || kernel.id === olderId)
      .map((kernel) => kernel.id);

    expect(orderedIds).toEqual([newerId, olderId]);
  });

  it('writes kernel generation batches to generated subdirectory', async () => {
    const batchId = `${TEST_PREFIX}-${randomUUID()}`;
    createdBatchIds.add(batchId);

    const batch = createGeneratedBatch(batchId);
    await saveKernelGenerationBatch(batch);

    const persisted = await fsPromises.readFile(getKernelGenerationFilePath(batchId), 'utf-8');
    expect(JSON.parse(persisted)).toEqual(batch);
  });

  it('throws when loading a persisted kernel with invalid shape', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(kernelId);

    await writeJsonFile(getKernelFilePath(kernelId), {
      id: kernelId,
      name: `${TEST_PREFIX} invalid`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedKernel: {
        kernel: { dramaticThesis: 'Only one field' },
      },
    });

    await expect(loadKernel(kernelId)).rejects.toThrow(
      `Invalid SavedKernel payload at ${getKernelFilePath(kernelId)}`
    );
  });

  it('throws when listing kernels includes invalid payload', async () => {
    const validKernelId = `${TEST_PREFIX}-${randomUUID()}`;
    const invalidKernelId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(validKernelId);
    createdKernelIds.add(invalidKernelId);

    await saveKernel(createSavedKernel(validKernelId));
    await writeJsonFile(getKernelFilePath(invalidKernelId), {
      id: invalidKernelId,
      name: `${TEST_PREFIX} invalid list entry`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedKernel: {
        kernel: { dramaticThesis: 'Only one field' },
      },
    });

    await expect(listKernels()).rejects.toThrow(
      `Invalid SavedKernel payload at ${getKernelFilePath(invalidKernelId)}`
    );
  });

  it('throws when updating an invalid persisted kernel payload', async () => {
    const kernelId = `${TEST_PREFIX}-${randomUUID()}`;
    createdKernelIds.add(kernelId);

    await writeJsonFile(getKernelFilePath(kernelId), {
      id: kernelId,
      name: `${TEST_PREFIX} invalid update`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedKernel: {
        kernel: { dramaticThesis: 'Only one field' },
      },
    });

    await expect(
      updateKernel(kernelId, (existing) => ({
        ...existing,
        name: `${TEST_PREFIX} updated`,
      }))
    ).rejects.toThrow(`Invalid SavedKernel payload at ${getKernelFilePath(kernelId)}`);
  });

  it('throws when saving an invalid generation batch', async () => {
    const batchId = `${TEST_PREFIX}-${randomUUID()}`;
    createdBatchIds.add(batchId);

    const invalidBatch = {
      id: batchId,
      generatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedKernels: [{ ...createEvaluatedKernel(), tradeoffSummary: '' }],
    } as unknown as GeneratedKernelBatch;

    await expect(saveKernelGenerationBatch(invalidBatch)).rejects.toThrow(
      `Invalid GeneratedKernelBatch payload at ${getKernelGenerationFilePath(batchId)}`
    );
  });
});
