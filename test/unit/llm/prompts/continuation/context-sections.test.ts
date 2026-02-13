import type { ProtagonistAffect } from '../../../../../src/models/protagonist-affect';
import {
  buildProtagonistAffectSection,
  buildSceneContextSection,
} from '../../../../../src/llm/prompts/continuation/context-sections';

describe('context-sections', () => {
  describe('buildProtagonistAffectSection', () => {
    it('returns empty string when affect is undefined', () => {
      const result = buildProtagonistAffectSection(undefined);
      expect(result).toBe('');
    });

    it('formats affect with header when provided', () => {
      const affect: ProtagonistAffect = {
        primaryEmotion: 'fear',
        primaryIntensity: 'strong',
        primaryCause: 'the approaching danger',
        secondaryEmotions: [],
        dominantMotivation: 'escape this situation',
      };

      const result = buildProtagonistAffectSection(affect);

      expect(result).toContain("PROTAGONIST'S CURRENT EMOTIONAL STATE:");
      expect(result).toContain('FEAR');
      expect(result).toContain('escape this situation');
    });
  });

  describe('buildSceneContextSection', () => {
    it('includes only previous scene when no grandparent', () => {
      const result = buildSceneContextSection('The detective arrived.', null, []);

      expect(result).toContain('PREVIOUS SCENE');
      expect(result).toContain('The detective arrived.');
      expect(result).not.toContain('SCENE BEFORE LAST');
    });

    it('includes both scenes when grandparent is provided', () => {
      const result = buildSceneContextSection(
        'The detective arrived.',
        'Earlier that morning, a call came.',
        []
      );

      expect(result).toContain('SCENE BEFORE LAST');
      expect(result).toContain('Earlier that morning, a call came.');
      expect(result).toContain('PREVIOUS SCENE');
      expect(result).toContain('The detective arrived.');
    });

    it('places grandparent section before previous scene', () => {
      const result = buildSceneContextSection('Previous content.', 'Grandparent content.', []);

      const grandparentIdx = result.indexOf('SCENE BEFORE LAST');
      const previousIdx = result.indexOf('PREVIOUS SCENE');

      expect(grandparentIdx).toBeLessThan(previousIdx);
    });

    it('preserves full narrative without truncation', () => {
      const longNarrative = 'A'.repeat(5000);
      const result = buildSceneContextSection('Short.', longNarrative, []);

      const section =
        result
          .split('SCENE BEFORE LAST (full text for style continuity):\n')[1]
          ?.split('\n\nPREVIOUS SCENE')[0] ?? '';
      expect(section).toBe(longNarrative);
    });

    it('includes ancestor summaries section when summaries provided', () => {
      const summaries = [
        {
          pageId: 1 as import('../../../../../src/models/id').PageId,
          summary: 'The hero arrived at the village.',
        },
        {
          pageId: 2 as import('../../../../../src/models/id').PageId,
          summary: 'A mysterious stranger appeared.',
        },
      ];

      const result = buildSceneContextSection('Current scene.', 'Grandparent scene.', summaries);

      expect(result).toContain('EARLIER SCENE SUMMARIES');
      expect(result).toContain('[Scene 1] The hero arrived at the village.');
      expect(result).toContain('[Scene 2] A mysterious stranger appeared.');
    });

    it('omits ancestor summaries section when summaries empty', () => {
      const result = buildSceneContextSection('Current scene.', 'Grandparent scene.', []);

      expect(result).not.toContain('EARLIER SCENE SUMMARIES');
    });

    it('orders sections chronologically: summaries -> grandparent -> parent', () => {
      const summaries = [
        {
          pageId: 1 as import('../../../../../src/models/id').PageId,
          summary: 'Oldest scene summary.',
        },
      ];

      const result = buildSceneContextSection('Parent scene.', 'Grandparent scene.', summaries);

      const summaryIdx = result.indexOf('EARLIER SCENE SUMMARIES');
      const grandparentIdx = result.indexOf('SCENE BEFORE LAST');
      const previousIdx = result.indexOf('PREVIOUS SCENE');

      expect(summaryIdx).toBeLessThan(grandparentIdx);
      expect(grandparentIdx).toBeLessThan(previousIdx);
    });
  });
});
