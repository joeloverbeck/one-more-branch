import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  getStageModel,
  getStageMaxTokens,
  getStageTemperature,
  type LlmStage,
} from '@/config/stage-model';
import { getConfig, loadConfig, resetConfig } from '@/config/index';
import { LLM_STAGE_KEYS } from '@/config/llm-stage-registry';

function withConfigDir(config: Record<string, unknown>): string {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-stage-model-'));
  fs.writeFileSync(path.join(configDir, 'default.json'), JSON.stringify(config), 'utf8');
  return configDir;
}

describe('stage-model resolution', () => {
  const originalConfigPath = process.env['CONFIG_PATH'];

  beforeEach(() => {
    resetConfig();
    delete process.env['CONFIG_PATH'];
  });

  afterEach(() => {
    resetConfig();
    if (originalConfigPath !== undefined) {
      process.env['CONFIG_PATH'] = originalConfigPath;
    } else {
      delete process.env['CONFIG_PATH'];
    }
  });

  it('uses catalog model defaults before the global default model', () => {
    process.env['CONFIG_PATH'] = '/dev/null';
    loadConfig();

    expect(getStageModel('conceptSeeder')).toBe('anthropic/claude-sonnet-4.6');
    expect(getStageModel('characterBrainstormer')).toBe('anthropic/claude-sonnet-4.6');
    expect(getStageModel('kernelIdeator')).toBe(getConfig().llm.defaultModel);
  });

  it('uses catalog max-token and temperature defaults for split chat stages', () => {
    process.env['CONFIG_PATH'] = '/dev/null';
    loadConfig();

    expect(getStageMaxTokens('chatSceneContext')).toBe(3000);
    expect(getStageMaxTokens('chatCharacterContext')).toBe(3000);
    expect(getStageTemperature('chatSceneContext')).toBe(0.3);
    expect(getStageTemperature('chatCharacterContext')).toBe(0.3);
  });

  it('uses global defaults for stages without stage-specific catalog overrides', () => {
    process.env['CONFIG_PATH'] = '/dev/null';
    loadConfig();

    const config = getConfig();
    expect(getStageMaxTokens('writer')).toBe(config.llm.maxTokens);
    expect(getStageTemperature('writer')).toBe(config.llm.temperature);
  });

  it('prefers config override maps over catalog defaults', () => {
    process.env['CONFIG_PATH'] = withConfigDir({
      llm: {
        defaultModel: 'global/model',
        maxTokens: 4096,
        temperature: 0.8,
        models: {
          chatSceneContext: 'override/model',
        },
        stageMaxTokens: {
          chatSceneContext: 2048,
        },
        stageTemperatures: {
          chatSceneContext: 0.6,
        },
      },
    });
    loadConfig();

    expect(getStageModel('chatSceneContext')).toBe('override/model');
    expect(getStageMaxTokens('chatSceneContext')).toBe(2048);
    expect(getStageTemperature('chatSceneContext')).toBe(0.6);
  });

  it('resolves every registered stage to a valid model, token budget, and temperature', () => {
    loadConfig();

    const stages: readonly LlmStage[] = LLM_STAGE_KEYS;

    for (const stage of stages) {
      const model = getStageModel(stage);
      const maxTokens = getStageMaxTokens(stage);
      const temperature = getStageTemperature(stage);

      expect(model).toEqual(expect.any(String));
      expect(model).not.toHaveLength(0);
      expect(maxTokens).toBeGreaterThan(0);
      expect(temperature).toBeGreaterThanOrEqual(0);
      expect(temperature).toBeLessThanOrEqual(2);
    }
  });
});
