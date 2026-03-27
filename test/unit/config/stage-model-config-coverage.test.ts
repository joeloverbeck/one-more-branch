import fs from 'node:fs';
import path from 'node:path';

import { LLM_STAGE_KEYS } from '@/config/llm-stage-registry';

function readDefaultStageModels(): Record<string, string> {
  const configPath = path.resolve(process.cwd(), 'configs/default.json');
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
    llm?: {
      models?: Record<string, string>;
      stageTemperatures?: Record<string, number>;
    };
  };

  return parsed.llm?.models ?? {};
}

function readDefaultStageTemperatures(): Record<string, number> {
  const configPath = path.resolve(process.cwd(), 'configs/default.json');
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
    llm?: { stageTemperatures?: Record<string, number> };
  };

  return parsed.llm?.stageTemperatures ?? {};
}

describe('stage-model config coverage', () => {
  it('defines an explicit llm.models entry for every registered stage', () => {
    const models = readDefaultStageModels();

    expect(Object.keys(models)).toHaveLength(LLM_STAGE_KEYS.length);

    for (const stage of LLM_STAGE_KEYS) {
      expect(models).toHaveProperty(stage);
      expect(models[stage]).toEqual(expect.any(String));
      expect(models[stage]).not.toHaveLength(0);
    }
  });

  it('keeps user-facing stage model entries populated', () => {
    const models = readDefaultStageModels();

    expect(models.structure).toEqual(expect.any(String));
    expect(models.structure).not.toHaveLength(0);
    expect(models.sceneIdeator).toEqual(expect.any(String));
    expect(models.sceneIdeator).not.toHaveLength(0);
  });

  it('contains no orphaned llm.models entries and preserves registry order', () => {
    const modelKeys = Object.keys(readDefaultStageModels());

    expect(modelKeys).toEqual([...LLM_STAGE_KEYS]);
  });

  it('defines stage temperature overrides only for explicitly tuned stages', () => {
    const temperatures = readDefaultStageTemperatures();

    expect(Object.keys(temperatures)).toEqual([
      'chatBible',
      'chatPlanner',
      'chatWriter',
      'chatStateUpdater',
      'chatSummarizer',
    ]);
    expect(temperatures.chatBible).toBe(0.3);
    expect(temperatures.chatPlanner).toBe(0.3);
    expect(temperatures.chatWriter).toBe(0.7);
    expect(temperatures.chatStateUpdater).toBe(0.2);
    expect(temperatures.chatSummarizer).toBe(0.2);
  });
});
