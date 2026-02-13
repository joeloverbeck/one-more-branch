import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '../config/index.js';
import type { ChatMessage } from '../llm/llm-client-types.js';

export interface PromptLogPayload {
  promptType: string;
  messages: ChatMessage[];
  meta?: Record<string, unknown>;
}

export interface PromptLogEntry {
  timestamp: string;
  promptType: string;
  messageCount: number;
  messages: ChatMessage[];
  meta?: Record<string, unknown>;
}

export interface PromptSink {
  appendPrompt(payload: PromptLogPayload): Promise<void>;
}

export interface PromptFileSinkOptions {
  enabled: boolean;
  baseDir: string;
  fileName: string;
  now?: () => Date;
  mkdir?: typeof fs.mkdir;
  appendFile?: typeof fs.appendFile;
}

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${month}-${day}-${year}`;
}

export class PromptFileSink implements PromptSink {
  private readonly enabled: boolean;
  private readonly baseDir: string;
  private readonly fileName: string;
  private readonly now: () => Date;
  private readonly mkdirFn: typeof fs.mkdir;
  private readonly appendFileFn: typeof fs.appendFile;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: PromptFileSinkOptions) {
    this.enabled = options.enabled;
    this.baseDir = options.baseDir;
    this.fileName = options.fileName;
    this.now = options.now ?? ((): Date => new Date());
    this.mkdirFn = options.mkdir ?? fs.mkdir;
    this.appendFileFn = options.appendFile ?? fs.appendFile;
  }

  appendPrompt(payload: PromptLogPayload): Promise<void> {
    if (!this.enabled) {
      return Promise.resolve();
    }

    const timestamp = this.now();
    const dateFolder = formatLocalDate(timestamp);
    const folderPath = path.resolve(this.baseDir, dateFolder);
    const filePath = path.join(folderPath, this.fileName);
    const line = `${JSON.stringify(this.toEntry(payload, timestamp))}\n`;

    const writeOperation = async (): Promise<void> => {
      await this.mkdirFn(folderPath, { recursive: true });
      await this.appendFileFn(filePath, line, 'utf8');
    };

    const writeResult = this.writeQueue.then(writeOperation);
    this.writeQueue = writeResult.catch(() => undefined);
    return writeResult;
  }

  private toEntry(payload: PromptLogPayload, timestamp: Date): PromptLogEntry {
    return {
      timestamp: timestamp.toISOString(),
      promptType: payload.promptType,
      messageCount: payload.messages.length,
      messages: payload.messages,
      ...(payload.meta ? { meta: payload.meta } : {}),
    };
  }
}

export function createPromptFileSinkFromConfig(): PromptFileSink {
  const promptConfig = getConfig().logging.prompts;
  return new PromptFileSink({
    enabled: promptConfig.enabled,
    baseDir: promptConfig.baseDir,
    fileName: promptConfig.fileName,
  });
}
