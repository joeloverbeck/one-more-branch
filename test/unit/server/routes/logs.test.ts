import { promises as fs } from 'fs';
import type { Request, Response } from 'express';
import { loadConfig, resetConfig } from '@/config';
import { logRoutes, loadTodayEntries } from '@/server/routes/logs';
import type { PromptLogEntry } from '@/logging/prompt-file-sink';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getLogsHandler(): (req: Request, res: Response) => Promise<void> | void {
  const layer = (logRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === '/' && item.route?.methods?.get
  );

  const handler = layer?.route?.stack?.[0]?.handle;
  if (!handler) {
    throw new Error('GET / handler not found on logRoutes');
  }

  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('loadTodayEntries', () => {
  beforeAll(() => {
    loadConfig();
  });

  afterAll(() => {
    resetConfig();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty array when log file does not exist', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));

    const result = await loadTodayEntries();

    expect(result).toEqual([]);
  });

  it('parses JSONL lines into PromptLogEntry array', async () => {
    const entry1: PromptLogEntry = {
      timestamp: '2026-02-13T10:00:00.000Z',
      promptType: 'structure',
      messageCount: 2,
      messages: [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User prompt' },
      ],
    };
    const entry2: PromptLogEntry = {
      timestamp: '2026-02-13T11:00:00.000Z',
      promptType: 'writer',
      messageCount: 1,
      messages: [{ role: 'user', content: 'Write something' }],
    };

    const jsonl = `${JSON.stringify(entry1)}\n${JSON.stringify(entry2)}\n`;
    jest.spyOn(fs, 'readFile').mockResolvedValue(jsonl);

    const result = await loadTodayEntries();

    expect(result).toHaveLength(2);
    expect(result[0].promptType).toBe('writer');
    expect(result[1].promptType).toBe('structure');
  });

  it('sorts entries by timestamp descending (most recent first)', async () => {
    const early: PromptLogEntry = {
      timestamp: '2026-02-13T08:00:00.000Z',
      promptType: 'planner',
      messageCount: 1,
      messages: [{ role: 'user', content: 'Plan' }],
    };
    const mid: PromptLogEntry = {
      timestamp: '2026-02-13T10:00:00.000Z',
      promptType: 'writer',
      messageCount: 1,
      messages: [{ role: 'user', content: 'Write' }],
    };
    const late: PromptLogEntry = {
      timestamp: '2026-02-13T12:00:00.000Z',
      promptType: 'analyst',
      messageCount: 1,
      messages: [{ role: 'user', content: 'Analyze' }],
    };

    const jsonl = [early, mid, late].map((e) => JSON.stringify(e)).join('\n') + '\n';
    jest.spyOn(fs, 'readFile').mockResolvedValue(jsonl);

    const result = await loadTodayEntries();

    expect(result[0].promptType).toBe('analyst');
    expect(result[1].promptType).toBe('writer');
    expect(result[2].promptType).toBe('planner');
  });

  it('skips empty lines in JSONL file', async () => {
    const entry: PromptLogEntry = {
      timestamp: '2026-02-13T10:00:00.000Z',
      promptType: 'structure',
      messageCount: 1,
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const jsonl = `\n${JSON.stringify(entry)}\n\n`;
    jest.spyOn(fs, 'readFile').mockResolvedValue(jsonl);

    const result = await loadTodayEntries();

    expect(result).toHaveLength(1);
    expect(result[0].promptType).toBe('structure');
  });
});

describe('logRoutes GET /', () => {
  beforeAll(() => {
    loadConfig();
  });

  afterAll(() => {
    resetConfig();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders pages/logs with entries when log file exists', async () => {
    const entry: PromptLogEntry = {
      timestamp: '2026-02-13T10:00:00.000Z',
      promptType: 'writer',
      messageCount: 2,
      messages: [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
      ],
    };

    jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(entry) + '\n');

    const status = jest.fn().mockReturnThis();
    const render = jest.fn();

    void getLogsHandler()({} as Request, { status, render } as unknown as Response);
    await flushPromises();

    expect(status).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith('pages/logs', {
      title: 'Prompt Logs',
      entries: [expect.objectContaining({ promptType: 'writer' })],
      dateDisplay: expect.any(String) as string,
    });
  });

  it('renders pages/logs with empty entries when log file is missing', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));

    const status = jest.fn().mockReturnThis();
    const render = jest.fn();

    void getLogsHandler()({} as Request, { status, render } as unknown as Response);
    await flushPromises();

    expect(status).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith('pages/logs', {
      title: 'Prompt Logs',
      entries: [],
      dateDisplay: expect.any(String) as string,
    });
  });
});
