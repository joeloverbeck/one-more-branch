import stageMetadata from '@/config/generation-stage-metadata.json';
import { GENERATION_STAGES } from '@/engine/types';

describe('generation stage metadata', () => {
  it('keeps canonical metadata stage order aligned with engine generation stages', () => {
    const metadataStageIds = stageMetadata.stages.map((stage) => stage.id);
    expect(metadataStageIds).toEqual(GENERATION_STAGES);
  });

  it('keeps split chat generation stages canonical and excludes the legacy chat bible stage', () => {
    const metadataStageIds = stageMetadata.stages.map((stage) => stage.id);

    expect(metadataStageIds).toContain('CURATING_CHAT_SCENE');
    expect(metadataStageIds).toContain('CURATING_CHAT_CHARACTER');
    expect(metadataStageIds).not.toContain('CURATING_CHAT_BIBLE');
    expect(GENERATION_STAGES).toContain('CURATING_CHAT_SCENE');
    expect(GENERATION_STAGES).toContain('CURATING_CHAT_CHARACTER');
    expect(GENERATION_STAGES).not.toContain('CURATING_CHAT_BIBLE');
  });

  it('defines display names and phrase pools for every stage', () => {
    for (const stage of stageMetadata.stages) {
      expect(stage.displayName.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(stage.phrases)).toBe(true);
      expect(stage.phrases.length).toBeGreaterThan(0);
      for (const phrase of stage.phrases) {
        expect(phrase.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
