import type { GenerationStage } from '../../engine/types.js';

export const GENERATION_FLOW_TYPES = [
  'new-story',
  'choice',
  'begin-adventure',
  'concept-generation',
  'concept-evolution',
  'kernel-generation',
  'kernel-evolution',
] as const;

export type GenerationFlowType = (typeof GENERATION_FLOW_TYPES)[number];
export type GenerationProgressStatus = 'running' | 'completed' | 'failed' | 'unknown';

export interface GenerationProgressSnapshot {
  readonly status: GenerationProgressStatus;
  readonly activeStage: GenerationStage | null;
  readonly completedStages: GenerationStage[];
  readonly updatedAt: number;
  readonly flowType: GenerationFlowType | null;
}

interface StoredProgressRecord {
  status: Exclude<GenerationProgressStatus, 'unknown'>;
  activeStage: GenerationStage | null;
  completedStages: GenerationStage[];
  updatedAt: number;
  flowType: GenerationFlowType;
  expiresAt: number;
  publicMessage?: string;
}

interface GenerationProgressServiceOptions {
  ttlMs?: number;
  now?: () => number;
}

export interface GenerationProgressService {
  start(progressId: string, flowType: GenerationFlowType): void;
  markStageStarted(progressId: string, stage: GenerationStage, attempt?: number): void;
  markStageCompleted(progressId: string, stage: GenerationStage, attempt?: number): void;
  complete(progressId: string): void;
  fail(progressId: string, publicMessage?: string): void;
  get(progressId: string): GenerationProgressSnapshot;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

class InMemoryGenerationProgressService implements GenerationProgressService {
  private readonly entries = new Map<string, StoredProgressRecord>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: GenerationProgressServiceOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.now = options.now ?? Date.now;
  }

  start(progressId: string, flowType: GenerationFlowType): void {
    this.evictExpired();
    const updatedAt = this.now();
    this.entries.set(progressId, {
      status: 'running',
      activeStage: null,
      completedStages: [],
      updatedAt,
      flowType,
      expiresAt: updatedAt + this.ttlMs,
    });
  }

  markStageStarted(progressId: string, stage: GenerationStage, _attempt?: number): void {
    this.evictExpired();
    const entry = this.entries.get(progressId);
    if (entry?.status !== 'running') {
      return;
    }

    entry.activeStage = stage;
    this.touch(entry);
  }

  markStageCompleted(progressId: string, stage: GenerationStage, _attempt?: number): void {
    this.evictExpired();
    const entry = this.entries.get(progressId);
    if (entry?.status !== 'running') {
      return;
    }

    if (!entry.completedStages.includes(stage)) {
      entry.completedStages.push(stage);
    }
    entry.activeStage = null;
    this.touch(entry);
  }

  complete(progressId: string): void {
    this.evictExpired();
    const entry = this.entries.get(progressId);
    if (entry?.status !== 'running') {
      return;
    }

    entry.status = 'completed';
    entry.activeStage = null;
    this.touch(entry);
  }

  fail(progressId: string, publicMessage?: string): void {
    this.evictExpired();
    const entry = this.entries.get(progressId);
    if (entry?.status !== 'running') {
      return;
    }

    entry.status = 'failed';
    entry.activeStage = null;
    entry.publicMessage = publicMessage?.trim() ?? undefined;
    this.touch(entry);
  }

  get(progressId: string): GenerationProgressSnapshot {
    this.evictExpired();
    const entry = this.entries.get(progressId);
    if (!entry) {
      return {
        status: 'unknown',
        activeStage: null,
        completedStages: [],
        updatedAt: this.now(),
        flowType: null,
      };
    }

    return {
      status: entry.status,
      activeStage: entry.activeStage,
      completedStages: [...entry.completedStages],
      updatedAt: entry.updatedAt,
      flowType: entry.flowType,
    };
  }

  private touch(entry: StoredProgressRecord): void {
    entry.updatedAt = this.now();
    entry.expiresAt = entry.updatedAt + this.ttlMs;
  }

  private evictExpired(): void {
    const currentTime = this.now();
    for (const [progressId, entry] of this.entries.entries()) {
      if (entry.expiresAt <= currentTime) {
        this.entries.delete(progressId);
      }
    }
  }
}

export function createGenerationProgressService(
  options: GenerationProgressServiceOptions = {}
): GenerationProgressService {
  return new InMemoryGenerationProgressService(options);
}

export const generationProgressService = createGenerationProgressService();
