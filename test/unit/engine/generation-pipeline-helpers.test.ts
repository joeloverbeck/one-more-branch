import {
  EngineStageAttemptError,
  runEngineStageAttempt,
  runGenerationStage,
} from '../../../src/engine/generation-pipeline-helpers';
import { logger } from '../../../src/logging/index.js';

jest.mock('../../../src/logging/index.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('runGenerationStage', () => {
  const mockedLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-14T12:00:00.000Z'));
    mockedLogger.info.mockReset();
    mockedLogger.error.mockReset();
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

describe('runEngineStageAttempt', () => {
  const mockedLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-14T12:00:00.000Z'));
    mockedLogger.info.mockReset();
    mockedLogger.error.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits lifecycle events and logs around a successful attempt', async () => {
    const events: Array<{
      stage: string;
      status: string;
      attempt: number;
      durationMs?: number;
    }> = [];

    const attempt = runEngineStageAttempt(
      {
        publicStage: 'PLANNING_PAGE',
        logStage: 'planner',
        attempt: 2,
        onGenerationStage: (event) => events.push(event),
        logContext: { storyId: 'story-1', requestId: 'req-1' },
      },
      () => {
        jest.advanceTimersByTime(15);
        return Promise.resolve('ok');
      }
    );

    await expect(attempt).resolves.toEqual({ result: 'ok', durationMs: 15 });
    expect(events).toEqual([
      { stage: 'PLANNING_PAGE', status: 'started', attempt: 2 },
      {
        stage: 'PLANNING_PAGE',
        status: 'completed',
        attempt: 2,
        durationMs: 15,
      },
    ]);
    expect(mockedLogger.info.mock.calls).toEqual([
      [
        'Generation stage started',
        expect.objectContaining({
          storyId: 'story-1',
          requestId: 'req-1',
          stage: 'planner',
          attempt: 2,
        }),
      ],
      [
        'Generation stage completed',
        expect.objectContaining({
          storyId: 'story-1',
          requestId: 'req-1',
          stage: 'planner',
          attempt: 2,
          durationMs: 15,
        }),
      ],
    ]);
  });

  it('logs failure metadata and throws a typed attempt error', async () => {
    const validationError = Object.assign(new Error('invalid'), {
      context: {
        validationIssues: [{ ruleKey: 'writer.invalid' }, { ruleKey: 'writer.empty' }],
      },
    });

    const attempt = runEngineStageAttempt(
      {
        publicStage: 'WRITING_CONTINUING_PAGE',
        logStage: 'writer',
        attempt: 1,
        logContext: { storyId: 'story-1', requestId: 'req-1' },
      },
      () => {
        jest.advanceTimersByTime(20);
        return Promise.reject(validationError);
      }
    );

    await expect(attempt).rejects.toMatchObject<EngineStageAttemptError>({
      name: 'EngineStageAttemptError',
      cause: validationError,
      durationMs: 20,
      validationIssueCount: 2,
    });
    expect(mockedLogger.error.mock.calls).toEqual([
      [
        'Generation stage failed',
        expect.objectContaining({
          storyId: 'story-1',
          requestId: 'req-1',
          stage: 'writer',
          attempt: 1,
          durationMs: 20,
          validationIssueCount: 2,
          error: validationError,
        }),
      ],
    ]);
  });
});
