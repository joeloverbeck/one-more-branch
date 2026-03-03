import { repairPlaceholderSceneSummary } from '../../../../src/llm/validation/writer-scene-summary-repair';

describe('repairPlaceholderSceneSummary', () => {
  const VALID_NARRATIVE =
    'The corridor stretched before them, dimly lit by flickering torches. ' +
    'A cold draft swept through the stone passage, carrying the scent of decay. ' +
    'Somewhere ahead, the sound of dripping water echoed against the walls.';

  describe('non-repair cases', () => {
    it('returns unchanged when sceneSummary is valid (>= 20 chars)', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        sceneSummary: 'The party explores a dark corridor with ominous signs.',
      };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(false);
      expect(result.repairedJson).toBe(input);
    });

    it('returns unchanged when input is not an object', () => {
      expect(repairPlaceholderSceneSummary(null).repaired).toBe(false);
      expect(repairPlaceholderSceneSummary(42).repaired).toBe(false);
      expect(repairPlaceholderSceneSummary('string').repaired).toBe(false);
      expect(repairPlaceholderSceneSummary([1, 2]).repaired).toBe(false);
    });

    it('returns unchanged when sceneSummary is missing', () => {
      const input = { narrative: VALID_NARRATIVE };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when narrative is missing', () => {
      const input = { sceneSummary: 'placeholder' };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when sceneSummary is not a string', () => {
      const input = { narrative: VALID_NARRATIVE, sceneSummary: 123 };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(false);
    });
  });

  describe('placeholder detection', () => {
    const placeholders = [
      'placeholder',
      'PLACEHOLDER',
      'Placeholder',
      'todo',
      'TODO',
      'tbd',
      'TBD',
      'n/a',
      'N/A',
      'na',
      '...',
      '.....',
      '---',
      '___',
      'xxx',
      'scene summary',
      'Scene Summary',
      'summary',
      'test',
      '[placeholder]',
      '[TBD]',
      'short',
      '',
      '   ',
      'a',
    ];

    it.each(placeholders)('detects "%s" as placeholder and repairs', (placeholder) => {
      const input = { narrative: VALID_NARRATIVE, sceneSummary: placeholder };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);
      expect(result.repairDetails).toContain('Replaced placeholder sceneSummary');
    });
  });

  describe('sentence extraction', () => {
    it('extracts first 2-3 sentences from narrative', () => {
      const input = { narrative: VALID_NARRATIVE, sceneSummary: 'placeholder' };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);

      const repaired = result.repairedJson as Record<string, unknown>;
      const summary = repaired['sceneSummary'] as string;
      expect(summary.length).toBeGreaterThanOrEqual(20);
      expect(summary.length).toBeLessThanOrEqual(300);
      expect(summary).toContain('The corridor stretched before them');
    });

    it('handles single-sentence narrative', () => {
      const input = {
        narrative: 'The dragon roared and the castle walls shook with tremendous force.',
        sceneSummary: 'tbd',
      };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);

      const repaired = result.repairedJson as Record<string, unknown>;
      expect(repaired['sceneSummary']).toBe(
        'The dragon roared and the castle walls shook with tremendous force.'
      );
    });

    it('caps summary at ~300 chars', () => {
      const longSentences =
        'This is a very long sentence that goes on and on about the mysterious happenings in the ancient castle. ' +
        'The protagonist discovered many hidden passages and secret rooms behind old paintings. ' +
        'Each room contained artifacts from a forgotten civilization that once ruled the entire continent. ' +
        'The final chamber held the most extraordinary treasure anyone had ever witnessed in their lifetime.';
      const input = { narrative: longSentences, sceneSummary: 'placeholder' };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);

      const repaired = result.repairedJson as Record<string, unknown>;
      const summary = repaired['sceneSummary'] as string;
      expect(summary.length).toBeLessThanOrEqual(303); // 300 + '...'
    });

    it('returns unchanged when narrative is empty', () => {
      const input = { narrative: '', sceneSummary: 'placeholder' };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(false);
    });

    it('returns unchanged when narrative is too short to extract a valid summary', () => {
      const input = { narrative: 'Hi.', sceneSummary: 'placeholder' };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(false);
    });

    it('handles narrative with no sentence-ending punctuation but sufficient length', () => {
      const input = {
        narrative:
          'The long winding road stretched endlessly into the horizon with no end in sight for the weary travelers',
        sceneSummary: 'placeholder',
      };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);

      const repaired = result.repairedJson as Record<string, unknown>;
      const summary = repaired['sceneSummary'] as string;
      expect(summary.length).toBeGreaterThanOrEqual(20);
    });

    it('handles narrative with exclamation marks and question marks', () => {
      const input = {
        narrative:
          'What could they possibly do now? The enemy was at the gates! There was no time to waste.',
        sceneSummary: 'n/a',
      };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);

      const repaired = result.repairedJson as Record<string, unknown>;
      const summary = repaired['sceneSummary'] as string;
      expect(summary).toContain('What could they possibly do now?');
    });
  });

  describe('output structure', () => {
    it('preserves other fields in the repaired JSON', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        sceneSummary: 'placeholder',
        choices: [{ text: 'Go left' }],
        isEnding: false,
      };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);

      const repaired = result.repairedJson as Record<string, unknown>;
      expect(repaired['choices']).toEqual([{ text: 'Go left' }]);
      expect(repaired['isEnding']).toBe(false);
      expect(repaired['narrative']).toBe(VALID_NARRATIVE);
    });

    it('includes repair details with original value and new length', () => {
      const input = { narrative: VALID_NARRATIVE, sceneSummary: 'TODO' };
      const result = repairPlaceholderSceneSummary(input);
      expect(result.repaired).toBe(true);
      expect(result.repairDetails).toContain('"TODO"');
      expect(result.repairDetails).toMatch(/\d+-char extract/);
    });
  });
});
