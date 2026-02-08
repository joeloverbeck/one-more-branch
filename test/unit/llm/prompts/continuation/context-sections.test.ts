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
      const result = buildSceneContextSection('The detective arrived.', null);

      expect(result).toContain('PREVIOUS SCENE:');
      expect(result).toContain('The detective arrived.');
      expect(result).not.toContain('SCENE BEFORE LAST:');
    });

    it('includes both scenes when grandparent is provided', () => {
      const result = buildSceneContextSection(
        'The detective arrived.',
        'Earlier that morning, a call came.',
      );

      expect(result).toContain('SCENE BEFORE LAST:');
      expect(result).toContain('Earlier that morning, a call came.');
      expect(result).toContain('PREVIOUS SCENE:');
      expect(result).toContain('The detective arrived.');
    });

    it('places grandparent section before previous scene', () => {
      const result = buildSceneContextSection(
        'Previous content.',
        'Grandparent content.',
      );

      const grandparentIdx = result.indexOf('SCENE BEFORE LAST:');
      const previousIdx = result.indexOf('PREVIOUS SCENE:');

      expect(grandparentIdx).toBeLessThan(previousIdx);
    });

    it('truncates grandparent narrative to 1000 chars', () => {
      const longNarrative = 'A'.repeat(1500);
      const result = buildSceneContextSection('Short.', longNarrative);

      const section = result.split('SCENE BEFORE LAST:\n')[1]?.split('\n\nPREVIOUS SCENE:')[0] ?? '';
      expect(section.length).toBeLessThanOrEqual(1003); // 1000 + '...'
    });

    it('truncates previous narrative to 2000 chars', () => {
      const longNarrative = 'B'.repeat(2500);
      const result = buildSceneContextSection(longNarrative, null);

      const section = result.split('PREVIOUS SCENE:\n')[1]?.split('\n\n')[0] ?? '';
      expect(section.length).toBeLessThanOrEqual(2003); // 2000 + '...'
    });
  });
});
