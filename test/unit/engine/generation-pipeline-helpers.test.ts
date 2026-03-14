import { runGenerationStage } from '../../../src/engine/generation-pipeline-helpers';

describe('runGenerationStage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-14T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits started and completed events with duration', async () => {
    const events: Array<{
      stage: string;
      status: string;
      attempt: number;
      durationMs?: number;
    }> = [];

    const resultPromise = runGenerationStage(
      (event) => events.push(event),
      'DESIGNING_ARCHITECTURE',
      () => {
        jest.advanceTimersByTime(25);
        return Promise.resolve('ok');
      },
    );

    await expect(resultPromise).resolves.toBe('ok');
    expect(events).toEqual([
      { stage: 'DESIGNING_ARCHITECTURE', status: 'started', attempt: 1 },
      expect.objectContaining({
        stage: 'DESIGNING_ARCHITECTURE',
        status: 'completed',
        attempt: 1,
        durationMs: 25,
      }),
    ]);
  });

  it('does not emit a completed event when the operation throws', async () => {
    const events: Array<{
      stage: string;
      status: string;
      attempt: number;
      durationMs?: number;
    }> = [];

    const error = new Error('boom');

    const resultPromise = runGenerationStage(
      (event) => events.push(event),
      'GENERATING_MILESTONES',
      () => {
        jest.advanceTimersByTime(10);
        return Promise.reject(error);
      },
    );

    await expect(resultPromise).rejects.toThrow(error);
    expect(events).toEqual([{ stage: 'GENERATING_MILESTONES', status: 'started', attempt: 1 }]);
  });
});
