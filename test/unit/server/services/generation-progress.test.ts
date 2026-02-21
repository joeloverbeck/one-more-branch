import type { GenerationStage } from '@/engine/types';
import {
  createGenerationProgressService,
  GENERATION_FLOW_TYPES,
} from '@/server/services/generation-progress';

describe('generation-progress service', () => {
  it('returns unknown snapshot for an unknown progress ID', () => {
    const now = 1_000;
    const service = createGenerationProgressService({
      now: () => now,
    });

    const snapshot = service.get('missing-id');

    expect(snapshot).toEqual({
      status: 'unknown',
      activeStage: null,
      completedStages: [],
      updatedAt: 1_000,
      flowType: null,
    });
  });

  it('tracks lifecycle from running to completed with ordered completed stages', () => {
    let now = 10;
    const service = createGenerationProgressService({
      now: () => now,
    });

    const stage: GenerationStage = 'PLANNING_PAGE';

    service.start('progress-1', 'new-story');
    now = 20;
    service.markStageStarted('progress-1', stage, 1);
    now = 30;
    service.markStageCompleted('progress-1', stage, 1);
    now = 40;
    service.complete('progress-1');

    const snapshot = service.get('progress-1');
    expect(snapshot).toEqual({
      status: 'completed',
      activeStage: null,
      completedStages: ['PLANNING_PAGE'],
      updatedAt: 40,
      flowType: 'new-story',
    });
  });

  it('keeps transitions monotonic after failure and does not duplicate completed stages', () => {
    let now = 50;
    const service = createGenerationProgressService({
      now: () => now,
    });

    service.start('progress-2', 'choice');
    now = 60;
    service.markStageStarted('progress-2', 'ANALYZING_SCENE', 1);
    now = 70;
    service.markStageCompleted('progress-2', 'ANALYZING_SCENE', 1);
    now = 80;
    service.markStageCompleted('progress-2', 'ANALYZING_SCENE', 2);
    now = 90;
    service.fail('progress-2', 'Generation failed');
    now = 100;
    service.complete('progress-2');
    service.markStageStarted('progress-2', 'RESTRUCTURING_STORY', 1);

    const snapshot = service.get('progress-2');
    expect(snapshot).toEqual({
      status: 'failed',
      activeStage: null,
      completedStages: ['ANALYZING_SCENE'],
      updatedAt: 90,
      flowType: 'choice',
    });
  });

  it('evicts expired entries by TTL', () => {
    let now = 1000;
    const service = createGenerationProgressService({
      ttlMs: 5,
      now: () => now,
    });

    service.start('progress-3', 'choice');
    expect(service.get('progress-3').status).toBe('running');

    now = 1005;
    expect(service.get('progress-3').status).toBe('unknown');
  });

  it('defines canonical generation flow types and accepts specialized concept flows', () => {
    expect(GENERATION_FLOW_TYPES).toEqual([
      'new-story',
      'choice',
      'begin-adventure',
      'concept-generation',
      'concept-evolution',
      'kernel-generation',
    ]);

    const service = createGenerationProgressService();
    service.start('progress-begin', 'begin-adventure');
    service.start('progress-concept', 'concept-generation');
    service.start('progress-evolution', 'concept-evolution');
    service.start('progress-kernel', 'kernel-generation');

    const beginSnapshot = service.get('progress-begin');
    const conceptSnapshot = service.get('progress-concept');
    const evolutionSnapshot = service.get('progress-evolution');
    const kernelSnapshot = service.get('progress-kernel');
    expect(beginSnapshot.flowType).toBe('begin-adventure');
    expect(conceptSnapshot.flowType).toBe('concept-generation');
    expect(evolutionSnapshot.flowType).toBe('concept-evolution');
    expect(kernelSnapshot.flowType).toBe('kernel-generation');
  });
});
