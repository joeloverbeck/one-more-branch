import { promises as fs } from 'fs';
import path from 'path';
import { Request, Response, Router } from 'express';
import { getConfig } from '../../config/index.js';
import { logger } from '../../logging/index.js';
import type { PromptLogEntry, ResponseLogEntry } from '../../logging/prompt-file-sink.js';
import { wrapAsyncRoute } from '../utils/index.js';

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${month}-${day}-${year}`;
}

interface RawLogEntry {
  entryType?: 'prompt' | 'response';
  promptType?: string;
  rawResponse?: string;
  responseLength?: number;
  timestamp?: string;
  messageCount?: number;
  messages?: unknown[];
  meta?: Record<string, unknown>;
}

function isResponseEntry(entry: RawLogEntry | undefined): entry is ResponseLogEntry {
  return entry?.entryType === 'response';
}

export async function loadTodayEntries(): Promise<PromptLogEntry[]> {
  const promptConfig = getConfig().logging.prompts;
  const dateFolder = formatLocalDate(new Date());
  const filePath = path.resolve(promptConfig.baseDir, dateFolder, promptConfig.fileName);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as RawLogEntry);

  const entries: PromptLogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isResponseEntry(line)) {
      continue;
    }

    const promptEntry = line as PromptLogEntry;
    const next = i + 1 < lines.length ? lines[i + 1] : undefined;
    if (next && isResponseEntry(next) && next.promptType === promptEntry.promptType) {
      promptEntry.response = next.rawResponse;
      i += 1;
    }

    entries.push(promptEntry);
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return entries;
}

export const logRoutes = Router();

logRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    try {
      const entries = await loadTodayEntries();
      const dateDisplay = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      res.render('pages/logs', {
        title: 'Prompt Logs',
        entries,
        dateDisplay,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error loading logs page:', { error: err.message, stack: err.stack });
      res.status(500).render('pages/error', {
        title: 'Error',
        message: 'Failed to load prompt logs',
      });
    }
  })
);
