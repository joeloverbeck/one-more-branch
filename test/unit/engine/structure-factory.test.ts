import { createStoryStructure } from '../../../src/engine/structure-factory';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';

function createGenerationResult(): StructureGenerationResult {
  return {
    overallTheme: 'Restore the broken kingdom',
    premise: 'An exiled heir must unite rival houses before the capital collapses into civil war.',
    pacingBudget: { targetPagesMin: 18, targetPagesMax: 42 },
    acts: [
      {
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        beats: [
          {
            name: 'Messenger warning',
            description: 'A warning arrives',
            objective: 'Hear the warning',
            role: 'setup',
          },
          {
            name: 'Crossroads decision',
            description: 'A difficult choice',
            objective: 'Leave home',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        beats: [
          {
            name: 'First major setback',
            description: 'First major setback',
            objective: 'Recover from loss',
            role: 'escalation',
          },
        ],
      },
    ],
    rawResponse: '{"mock":true}',
  };
}

describe('structure-factory', () => {
  describe('createStoryStructure', () => {
    it('creates structure from generation result with hierarchical beat IDs', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.overallTheme).toBe('Restore the broken kingdom');
      expect(result.acts[0]?.id).toBe('1');
      expect(result.acts[1]?.id).toBe('2');
      expect(result.acts[0]?.beats[0]?.id).toBe('1.1');
      expect(result.acts[0]?.beats[1]?.id).toBe('1.2');
      expect(result.acts[1]?.beats[0]?.id).toBe('2.1');
      expect(result.acts[0]?.name).toBe('Act One');
      expect(result.acts[0]?.beats[0]?.name).toBe('Messenger warning');
      expect(result.acts[0]?.beats[0]?.description).toBe('A warning arrives');
    });

    it('sets generatedAt to current date', () => {
      const before = Date.now();
      const result = createStoryStructure(createGenerationResult());
      const after = Date.now();

      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('preserves act metadata', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.acts[0]?.objective).toBe('Accept the quest');
      expect(result.acts[0]?.stakes).toBe('Home is at risk');
      expect(result.acts[0]?.entryCondition).toBe('A messenger arrives');
    });

    it('preserves beat metadata', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.acts[0]?.beats[0]?.objective).toBe('Hear the warning');
      expect(result.acts[0]?.beats[1]?.objective).toBe('Leave home');
    });
  });
});
