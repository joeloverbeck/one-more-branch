import fs from 'node:fs';
import path from 'node:path';

import { loadConfig, resetConfig } from '@/config';
import { LLM_STAGE_CATALOG, LLM_STAGE_KEYS } from '@/config/llm-stage-registry';
import { getStageMaxTokens, getStageModel, getStageTemperature } from '@/config/stage-model';

function readDefaultConfig(): {
  llm?: {
    models?: Record<string, string>;
    stageMaxTokens?: Record<string, number>;
    stageTemperatures?: Record<string, number>;
  };
} {
  const configPath = path.resolve(process.cwd(), 'configs/default.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
    llm?: {
      models?: Record<string, string>;
      stageMaxTokens?: Record<string, number>;
      stageTemperatures?: Record<string, number>;
    };
  };
}

describe('stage-model config coverage', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
  });

  it('derives stage keys directly from the typed catalog in order', () => {
    expect(LLM_STAGE_KEYS).toEqual(LLM_STAGE_CATALOG.map((entry) => entry.key));
    expect(new Set(LLM_STAGE_KEYS).size).toBe(LLM_STAGE_KEYS.length);
  });

  it('keeps runtime config override maps sparse and free of unknown stage keys', () => {
    const config = readDefaultConfig();
    const stageKeySet = new Set(LLM_STAGE_KEYS);

    for (const overrides of [
      config.llm?.models ?? {},
      config.llm?.stageMaxTokens ?? {},
      config.llm?.stageTemperatures ?? {},
    ]) {
      for (const key of Object.keys(overrides)) {
        expect(stageKeySet.has(key as (typeof LLM_STAGE_KEYS)[number])).toBe(true);
      }
    }
  });

  it('does not keep legacy chatBible stage overrides in default.json', () => {
    const config = readDefaultConfig();

    expect(config.llm?.models ?? {}).not.toHaveProperty('chatBible');
    expect(config.llm?.stageMaxTokens ?? {}).not.toHaveProperty('chatBible');
    expect(config.llm?.stageTemperatures ?? {}).not.toHaveProperty('chatBible');
  });

  it('resolves every catalog stage through the live config without exhaustive JSON maps', () => {
    loadConfig();

    for (const stage of LLM_STAGE_KEYS) {
      expect(getStageModel(stage)).toEqual(expect.any(String));
      expect(getStageModel(stage)).not.toHaveLength(0);
      expect(getStageMaxTokens(stage)).toBeGreaterThan(0);
      expect(getStageTemperature(stage)).toBeGreaterThanOrEqual(0);
      expect(getStageTemperature(stage)).toBeLessThanOrEqual(2);
    }
  });
});
