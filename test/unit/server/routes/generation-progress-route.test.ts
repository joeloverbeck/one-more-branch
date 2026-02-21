import { generationProgressService } from '@/server/services';
import { createRouteGenerationProgress } from '@/server/routes/generation-progress-route';

describe('generation-progress-route utility', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no-op progress handlers when progressId is absent', () => {
    const startSpy = jest.spyOn(generationProgressService, 'start');
    const completeSpy = jest.spyOn(generationProgressService, 'complete');
    const failSpy = jest.spyOn(generationProgressService, 'fail');

    const progress = createRouteGenerationProgress(undefined, 'concept-generation');

    expect(progress.progressId).toBeUndefined();
    expect(progress.onGenerationStage).toBeUndefined();

    progress.complete();
    progress.fail('ignored');

    expect(startSpy).not.toHaveBeenCalled();
    expect(completeSpy).not.toHaveBeenCalled();
    expect(failSpy).not.toHaveBeenCalled();
  });

  it('wires route progress lifecycle to generationProgressService', () => {
    const startSpy = jest.spyOn(generationProgressService, 'start').mockImplementation(() => {});
    const markStartedSpy = jest
      .spyOn(generationProgressService, 'markStageStarted')
      .mockImplementation(() => {});
    const markCompletedSpy = jest
      .spyOn(generationProgressService, 'markStageCompleted')
      .mockImplementation(() => {});
    const completeSpy = jest.spyOn(generationProgressService, 'complete').mockImplementation(() => {});
    const failSpy = jest.spyOn(generationProgressService, 'fail').mockImplementation(() => {});

    const progress = createRouteGenerationProgress(' route-progress-1 ', 'kernel-generation');
    progress.onGenerationStage?.({
      stage: 'GENERATING_KERNELS',
      status: 'started',
      attempt: 1,
    });
    progress.onGenerationStage?.({
      stage: 'EVALUATING_KERNELS',
      status: 'completed',
      attempt: 1,
    });
    progress.complete();
    progress.fail('public error');

    expect(progress.progressId).toBe('route-progress-1');
    expect(startSpy).toHaveBeenCalledWith('route-progress-1', 'kernel-generation');
    expect(markStartedSpy).toHaveBeenCalledWith('route-progress-1', 'GENERATING_KERNELS', 1);
    expect(markCompletedSpy).toHaveBeenCalledWith('route-progress-1', 'EVALUATING_KERNELS', 1);
    expect(completeSpy).toHaveBeenCalledWith('route-progress-1');
    expect(failSpy).toHaveBeenCalledWith('route-progress-1', 'public error');
  });

  it('accepts concept-evolution as a route flow type', () => {
    const startSpy = jest.spyOn(generationProgressService, 'start').mockImplementation(() => {});

    createRouteGenerationProgress(' evolve-progress-1 ', 'concept-evolution');

    expect(startSpy).toHaveBeenCalledWith('evolve-progress-1', 'concept-evolution');
  });
});
