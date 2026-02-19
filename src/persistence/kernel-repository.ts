import {
  isGeneratedKernelBatch,
  isSavedKernel,
  type GeneratedKernelBatch,
  type SavedKernel,
} from '../models/saved-kernel.js';
import {
  ensureKernelGenerationsDir,
  ensureKernelsDir,
  getKernelFilePath,
  getKernelGenerationFilePath,
  getKernelsDir,
} from './file-utils.js';
import { createJsonBatchSaver, createJsonEntityRepository } from './json-entity-repository.js';

const KERNEL_LOCK_PREFIX = 'kernel:';

const kernelRepository = createJsonEntityRepository<SavedKernel>({
  lockPrefix: KERNEL_LOCK_PREFIX,
  entityLabel: 'SavedKernel',
  notFoundLabel: 'Kernel',
  ensureDir: ensureKernelsDir,
  getDir: getKernelsDir,
  getFilePath: getKernelFilePath,
  isEntity: isSavedKernel,
});

const saveKernelBatch = createJsonBatchSaver<GeneratedKernelBatch>({
  lockKeyPrefix: `${KERNEL_LOCK_PREFIX}generation:`,
  entityLabel: 'GeneratedKernelBatch',
  ensureDir: () => {
    ensureKernelsDir();
    ensureKernelGenerationsDir();
  },
  getFilePath: getKernelGenerationFilePath,
  isBatch: isGeneratedKernelBatch,
});

export async function saveKernel(kernel: SavedKernel): Promise<void> {
  return kernelRepository.save(kernel);
}

export async function saveKernelGenerationBatch(batch: GeneratedKernelBatch): Promise<void> {
  return saveKernelBatch(batch);
}

export async function loadKernel(kernelId: string): Promise<SavedKernel | null> {
  return kernelRepository.load(kernelId);
}

export async function updateKernel(
  kernelId: string,
  updater: (existing: SavedKernel) => SavedKernel
): Promise<SavedKernel> {
  return kernelRepository.update(kernelId, updater);
}

export async function deleteKernel(kernelId: string): Promise<void> {
  return kernelRepository.remove(kernelId);
}

export async function listKernels(): Promise<SavedKernel[]> {
  return kernelRepository.list();
}

export async function kernelExists(kernelId: string): Promise<boolean> {
  return kernelRepository.exists(kernelId);
}
