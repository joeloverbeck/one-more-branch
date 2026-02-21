import { getStageModel, type LlmStage } from '@/config/stage-model';
import { getConfig, loadConfig, resetConfig } from '@/config/index';
import { LLM_STAGE_KEYS } from '@/config/llm-stage-registry';

describe('getStageModel', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
  });

  it('returns defaultModel when no models config exists', () => {
    process.env['CONFIG_PATH'] = '/dev/null';
    loadConfig();
    delete process.env['CONFIG_PATH'];

    const config = getConfig();
    const model = getStageModel('writer');
    expect(model).toBe(config.llm.defaultModel);
  });

  it('returns defaultModel when stage key is absent from models', () => {
    process.env['CONFIG_PATH'] = '/dev/null';
    loadConfig();
    delete process.env['CONFIG_PATH'];

    // No models section exists, so any stage falls back to defaultModel
    const config = getConfig();
    const model = getStageModel('writer');
    expect(model).toBe(config.llm.defaultModel);
  });

  it('returns stage-specific model when stage key is present in models', () => {
    loadConfig();

    const config = getConfig();
    const model = getStageModel('analyst');
    // Should match whatever the config file says for analyst
    const expected = config.llm.models?.['analyst'] ?? config.llm.defaultModel;
    expect(model).toBe(expected);
  });

  it('resolves concept and kernel stage models from config when configured', () => {
    loadConfig();

    const config = getConfig();
    expect(config.llm.models?.['kernelIdeator']).toBeDefined();
    expect(config.llm.models?.['kernelEvaluator']).toBeDefined();
    expect(config.llm.models?.['conceptIdeator']).toBeDefined();
    expect(config.llm.models?.['conceptEvolver']).toBeDefined();
    expect(config.llm.models?.['conceptEvaluator']).toBeDefined();
    expect(config.llm.models?.['conceptStressTester']).toBeDefined();

    expect(getStageModel('kernelIdeator')).toBe(config.llm.models?.['kernelIdeator']);
    expect(getStageModel('kernelEvaluator')).toBe(config.llm.models?.['kernelEvaluator']);
    expect(getStageModel('conceptIdeator')).toBe(config.llm.models?.['conceptIdeator']);
    expect(getStageModel('conceptEvolver')).toBe(config.llm.models?.['conceptEvolver']);
    expect(getStageModel('conceptEvaluator')).toBe(config.llm.models?.['conceptEvaluator']);
    expect(getStageModel('conceptStressTester')).toBe(config.llm.models?.['conceptStressTester']);
  });

  it('resolves each valid LlmStage value to a non-empty string', () => {
    loadConfig();

    const stages: readonly LlmStage[] = LLM_STAGE_KEYS;

    for (const stage of stages) {
      const model = getStageModel(stage);
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    }
  });
});
