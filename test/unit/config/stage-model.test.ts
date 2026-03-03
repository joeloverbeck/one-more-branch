import { getStageModel, getStageMaxTokens, type LlmStage } from '@/config/stage-model';
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
    const model = getStageModel('structureEvaluator');
    // Should match whatever the config file says for structureEvaluator
    const expected = config.llm.models?.['structureEvaluator'] ?? config.llm.defaultModel;
    expect(model).toBe(expected);
  });

  it('resolves concept and kernel stage models from config when configured', () => {
    loadConfig();

    const config = getConfig();
    expect(config.llm.models?.['kernelIdeator']).toBeDefined();
    expect(config.llm.models?.['kernelEvaluator']).toBeDefined();
    expect(config.llm.models?.['conceptSeeder']).toBeDefined();
    expect(config.llm.models?.['conceptEvolverSeeder']).toBeDefined();
    expect(config.llm.models?.['conceptArchitect']).toBeDefined();
    expect(config.llm.models?.['conceptEngineer']).toBeDefined();
    expect(config.llm.models?.['conceptEvaluator']).toBeDefined();
    expect(config.llm.models?.['conceptStressTester']).toBeDefined();

    expect(getStageModel('kernelIdeator')).toBe(config.llm.models?.['kernelIdeator']);
    expect(getStageModel('kernelEvaluator')).toBe(config.llm.models?.['kernelEvaluator']);
    expect(getStageModel('conceptSeeder')).toBe(config.llm.models?.['conceptSeeder']);
    expect(getStageModel('conceptEvolverSeeder')).toBe(config.llm.models?.['conceptEvolverSeeder']);
    expect(getStageModel('conceptArchitect')).toBe(config.llm.models?.['conceptArchitect']);
    expect(getStageModel('conceptEngineer')).toBe(config.llm.models?.['conceptEngineer']);
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

describe('getStageMaxTokens', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
  });

  it('returns global maxTokens when no stageMaxTokens config exists', () => {
    process.env['CONFIG_PATH'] = '/dev/null';
    loadConfig();
    delete process.env['CONFIG_PATH'];

    const config = getConfig();
    const maxTokens = getStageMaxTokens('writer');
    expect(maxTokens).toBe(config.llm.maxTokens);
  });

  it('returns stage-specific maxTokens when configured', () => {
    loadConfig();

    const config = getConfig();
    const maxTokens = getStageMaxTokens('agendaResolver');
    const expected = config.llm.stageMaxTokens?.['agendaResolver'] ?? config.llm.maxTokens;
    expect(maxTokens).toBe(expected);
    expect(maxTokens).toBe(32768);
  });

  it('returns global maxTokens for stage without per-stage override', () => {
    loadConfig();

    const config = getConfig();
    // 'writer' is not in stageMaxTokens in default.json
    const maxTokens = getStageMaxTokens('writer');
    expect(maxTokens).toBe(config.llm.maxTokens);
  });

  it('resolves each LlmStage to a positive number', () => {
    loadConfig();

    for (const stage of LLM_STAGE_KEYS) {
      const maxTokens = getStageMaxTokens(stage);
      expect(typeof maxTokens).toBe('number');
      expect(maxTokens).toBeGreaterThan(0);
    }
  });
});
