import fs from 'fs';
import os from 'os';
import path from 'path';
import { PromptFileSink } from '../../../src/logging/prompt-file-sink';

describe('PromptFileSink', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-prompt-sink-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function logPathFor(dateFolder: string, fileName = 'prompts.jsonl'): string {
    return path.join(tmpDir, dateFolder, fileName);
  }

  it('creates logs/MM-DD-YYYY folder when missing', async () => {
    const sink = new PromptFileSink({
      enabled: true,
      baseDir: tmpDir,
      fileName: 'prompts.jsonl',
      now: (): Date => new Date('2026-02-11T10:00:00.000Z'),
    });

    await sink.appendPrompt({
      promptType: 'opening',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(fs.existsSync(path.join(tmpDir, '02-11-2026'))).toBe(true);
    expect(fs.existsSync(logPathFor('02-11-2026'))).toBe(true);
  });

  it('appends JSONL entries without overwriting', async () => {
    const sink = new PromptFileSink({
      enabled: true,
      baseDir: tmpDir,
      fileName: 'prompts.jsonl',
      now: (): Date => new Date('2026-02-11T10:00:00.000Z'),
    });

    await sink.appendPrompt({
      promptType: 'opening',
      messages: [{ role: 'system', content: 'First' }],
    });
    await sink.appendPrompt({
      promptType: 'writer',
      messages: [{ role: 'user', content: 'Second' }],
    });

    const lines = fs
      .readFileSync(logPathFor('02-11-2026'), 'utf8')
      .trim()
      .split('\n');

    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0] ?? '') as { promptType: string; messageCount: number };
    const second = JSON.parse(lines[1] ?? '') as { promptType: string; messageCount: number };
    expect(first.promptType).toBe('opening');
    expect(first.messageCount).toBe(1);
    expect(second.promptType).toBe('writer');
    expect(second.messageCount).toBe(1);
  });

  it('preserves append order under concurrent calls', async () => {
    const sink = new PromptFileSink({
      enabled: true,
      baseDir: tmpDir,
      fileName: 'prompts.jsonl',
      now: (): Date => new Date('2026-02-11T10:00:00.000Z'),
    });

    await Promise.all([
      sink.appendPrompt({
        promptType: 'opening',
        messages: [{ role: 'user', content: 'One' }],
      }),
      sink.appendPrompt({
        promptType: 'writer',
        messages: [{ role: 'user', content: 'Two' }],
      }),
      sink.appendPrompt({
        promptType: 'analyst',
        messages: [{ role: 'user', content: 'Three' }],
      }),
    ]);

    const lines = fs
      .readFileSync(logPathFor('02-11-2026'), 'utf8')
      .trim()
      .split('\n');

    expect(lines).toHaveLength(3);
    expect((JSON.parse(lines[0] ?? '') as { promptType: string }).promptType).toBe('opening');
    expect((JSON.parse(lines[1] ?? '') as { promptType: string }).promptType).toBe('writer');
    expect((JSON.parse(lines[2] ?? '') as { promptType: string }).promptType).toBe('analyst');
  });

  it('rotates to a new date folder when the date changes', async () => {
    const nowRef = { value: new Date('2026-02-11T12:00:00.000Z') };
    const sink = new PromptFileSink({
      enabled: true,
      baseDir: tmpDir,
      fileName: 'prompts.jsonl',
      now: (): Date => nowRef.value,
    });

    await sink.appendPrompt({
      promptType: 'structure',
      messages: [{ role: 'system', content: 'Before midnight' }],
    });

    nowRef.value = new Date('2026-02-12T12:00:00.000Z');
    await sink.appendPrompt({
      promptType: 'structure-rewrite',
      messages: [{ role: 'system', content: 'After midnight' }],
    });

    expect(fs.existsSync(logPathFor('02-11-2026'))).toBe(true);
    expect(fs.existsSync(logPathFor('02-12-2026'))).toBe(true);
  });

  it('does nothing when prompt logging is disabled', async () => {
    const sink = new PromptFileSink({
      enabled: false,
      baseDir: tmpDir,
      fileName: 'prompts.jsonl',
      now: (): Date => new Date('2026-02-11T10:00:00.000Z'),
    });

    await sink.appendPrompt({
      promptType: 'opening',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(fs.existsSync(path.join(tmpDir, '02-11-2026'))).toBe(false);
  });
});
