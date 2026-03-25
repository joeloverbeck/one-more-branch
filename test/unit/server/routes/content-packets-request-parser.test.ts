import {
  parseGenerateContentRequest,
  parseGenerateTasteProfileRequest,
} from '@/server/routes/content-packets-request-parser';

describe('content-packets request parser', () => {
  describe('parseGenerateContentRequest', () => {
    it('normalizes valid generate-content requests at the HTTP boundary', () => {
      const result = parseGenerateContentRequest({
        exemplarIdeas: ['  idea one  ', ' ', 42, 'idea two'],
        moodOrGenre: '  ritual horror  ',
        contentPreferences: '  dread and bureaucracy  ',
        kernelBlock: '  archive-cathedral  ',
        apiKey: '  sk-or-test-key-1234567890  ',
        progressId: 'progress-123',
      });

      expect(result).toEqual({
        ok: true,
        value: {
          command: {
            exemplarIdeas: ['idea one', 'idea two'],
            moodOrGenre: 'ritual horror',
            contentPreferences: 'dread and bureaucracy',
            kernelBlock: 'archive-cathedral',
            apiKey: 'sk-or-test-key-1234567890',
          },
          progressId: 'progress-123',
        },
      });
    });

    it('rejects requests without exemplar arrays', () => {
      expect(parseGenerateContentRequest({ apiKey: 'sk-or-test-key-1234567890' })).toEqual({
        ok: false,
        error: 'At least one exemplar idea is required',
      });
    });

    it('rejects requests whose exemplars are empty after trimming', () => {
      expect(
        parseGenerateContentRequest({
          exemplarIdeas: [' ', '', 42],
          apiKey: 'sk-or-test-key-1234567890',
        })
      ).toEqual({
        ok: false,
        error: 'At least one non-empty exemplar idea is required',
      });
    });
  });

  describe('parseGenerateTasteProfileRequest', () => {
    it('normalizes valid taste-profile requests at the HTTP boundary', () => {
      const result = parseGenerateTasteProfileRequest({
        exemplarIdeas: ['  idea one  '],
        moodOrGenre: '  ritual horror  ',
        contentPreferences: '   ',
        apiKey: '  sk-or-test-key-1234567890  ',
        progressId: 'progress-456',
      });

      expect(result).toEqual({
        ok: true,
        value: {
          command: {
            exemplarIdeas: ['idea one'],
            moodOrGenre: 'ritual horror',
            contentPreferences: undefined,
            apiKey: 'sk-or-test-key-1234567890',
          },
          progressId: 'progress-456',
        },
      });
    });

    it('rejects requests with short api keys', () => {
      expect(
        parseGenerateTasteProfileRequest({
          exemplarIdeas: ['idea one'],
          apiKey: ' short ',
        })
      ).toEqual({
        ok: false,
        error: 'OpenRouter API key is required',
      });
    });

    it('rejects non-object bodies with the existing api key error', () => {
      expect(parseGenerateTasteProfileRequest(null)).toEqual({
        ok: false,
        error: 'OpenRouter API key is required',
      });
    });
  });
});
