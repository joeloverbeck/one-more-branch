import { validateAnalystResponse } from '../../../../src/llm/schemas/analyst-response-transformer';

describe('validateAnalystResponse', () => {
  const RAW_RESPONSE = '{"beatConcluded":true}';

  it('parses valid analyst response correctly', () => {
    const input = {
      beatConcluded: true,
      beatResolution: 'The protagonist escaped the dungeon',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      narrativeSummary: '',
    };

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('The protagonist escaped the dungeon');
    expect(result.deviationDetected).toBe(false);
    expect(result.deviationReason).toBe('');
    expect(result.invalidatedBeatIds).toEqual([]);
    expect(result.narrativeSummary).toBe('');
    expect(result.rawResponse).toBe(RAW_RESPONSE);
  });

  it('trims whitespace from all string fields', () => {
    const input = {
      beatConcluded: true,
      beatResolution: '  The beat was resolved  ',
      deviationDetected: true,
      deviationReason: '  Story went off track  ',
      invalidatedBeatIds: ['  1.2  ', '  3.4  '],
      narrativeSummary: '  The hero went rogue  ',
    };

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.beatResolution).toBe('The beat was resolved');
    expect(result.deviationReason).toBe('Story went off track');
    expect(result.invalidatedBeatIds).toEqual(['1.2', '3.4']);
    expect(result.narrativeSummary).toBe('The hero went rogue');
  });

  it('filters invalidatedBeatIds to only valid X.Y format', () => {
    const input = {
      beatConcluded: false,
      beatResolution: '',
      deviationDetected: true,
      deviationReason: 'deviation',
      invalidatedBeatIds: ['1.2', 'bad', '1', 'abc', '3.4', '10.20', '1.2.3', ''],
      narrativeSummary: 'summary',
    };

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.invalidatedBeatIds).toEqual(['1.2', '3.4', '10.20']);
  });

  it('handles all-default case (no deviation, no beat concluded)', () => {
    const input = {};

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.beatConcluded).toBe(false);
    expect(result.beatResolution).toBe('');
    expect(result.deviationDetected).toBe(false);
    expect(result.deviationReason).toBe('');
    expect(result.invalidatedBeatIds).toEqual([]);
    expect(result.narrativeSummary).toBe('');
  });

  it('returns rawResponse in the result', () => {
    const customRaw = '{"some":"raw","json":"data"}';
    const result = validateAnalystResponse({}, customRaw);

    expect(result.rawResponse).toBe(customRaw);
  });

  it('handles missing optional fields with defaults', () => {
    const input = {
      beatConcluded: true,
      beatResolution: 'resolved',
    };

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('resolved');
    expect(result.deviationDetected).toBe(false);
    expect(result.deviationReason).toBe('');
    expect(result.invalidatedBeatIds).toEqual([]);
    expect(result.narrativeSummary).toBe('');
  });

  it('returns beatConcluded: true with valid beatResolution', () => {
    const input = {
      beatConcluded: true,
      beatResolution: 'Hero defeated the guardian and claimed the artifact',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      narrativeSummary: '',
    };

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('Hero defeated the guardian and claimed the artifact');
  });

  it('returns deviationDetected: true with valid deviation fields', () => {
    const input = {
      beatConcluded: false,
      beatResolution: '',
      deviationDetected: true,
      deviationReason: 'The protagonist chose to ally with the antagonist',
      invalidatedBeatIds: ['2.1', '2.2', '3.1'],
      narrativeSummary: 'The hero has joined forces with the villain, invalidating the planned conflict arc',
    };

    const result = validateAnalystResponse(input, RAW_RESPONSE);

    expect(result.deviationDetected).toBe(true);
    expect(result.deviationReason).toBe('The protagonist chose to ally with the antagonist');
    expect(result.invalidatedBeatIds).toEqual(['2.1', '2.2', '3.1']);
    expect(result.narrativeSummary).toBe(
      'The hero has joined forces with the villain, invalidating the planned conflict arc',
    );
  });

  it('handles string JSON input by parsing it', () => {
    const jsonString = JSON.stringify({
      beatConcluded: true,
      beatResolution: 'Beat concluded via string input',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      narrativeSummary: '',
    });

    const result = validateAnalystResponse(jsonString, RAW_RESPONSE);

    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('Beat concluded via string input');
  });

  describe('pacing fields', () => {
    it('parses all pacing fields correctly when present', () => {
      const input = {
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        pacingIssueDetected: true,
        pacingIssueReason: 'Beat stalled',
        recommendedAction: 'nudge',
      };

      const result = validateAnalystResponse(input, RAW_RESPONSE);

      expect(result.pacingIssueDetected).toBe(true);
      expect(result.pacingIssueReason).toBe('Beat stalled');
      expect(result.recommendedAction).toBe('nudge');
    });

    it('defaults missing pacing fields to safe values', () => {
      const input = {};

      const result = validateAnalystResponse(input, RAW_RESPONSE);

      expect(result.pacingIssueDetected).toBe(false);
      expect(result.pacingIssueReason).toBe('');
      expect(result.recommendedAction).toBe('none');
    });

    it('defaults invalid recommendedAction to none', () => {
      const input = {
        pacingIssueDetected: true,
        pacingIssueReason: 'Stalled',
        recommendedAction: 'invalid_value',
      };

      const result = validateAnalystResponse(input, RAW_RESPONSE);

      expect(result.recommendedAction).toBe('none');
    });

    it('trims pacingIssueReason whitespace', () => {
      const input = {
        pacingIssueDetected: true,
        pacingIssueReason: '  Beat has stalled for too long  ',
        recommendedAction: 'rewrite',
      };

      const result = validateAnalystResponse(input, RAW_RESPONSE);

      expect(result.pacingIssueReason).toBe('Beat has stalled for too long');
    });

    it('accepts rewrite as a valid recommendedAction', () => {
      const input = {
        pacingIssueDetected: true,
        pacingIssueReason: 'Turning points too far away',
        recommendedAction: 'rewrite',
      };

      const result = validateAnalystResponse(input, RAW_RESPONSE);

      expect(result.recommendedAction).toBe('rewrite');
    });

    it('preserves pacing fields alongside existing analyst fields', () => {
      const input = {
        beatConcluded: true,
        beatResolution: 'The protagonist escaped',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: '',
        pacingIssueDetected: true,
        pacingIssueReason: 'Beat stalled',
        recommendedAction: 'nudge',
      };

      const result = validateAnalystResponse(input, RAW_RESPONSE);

      expect(result.beatConcluded).toBe(true);
      expect(result.beatResolution).toBe('The protagonist escaped');
      expect(result.pacingIssueDetected).toBe(true);
      expect(result.pacingIssueReason).toBe('Beat stalled');
      expect(result.recommendedAction).toBe('nudge');
    });
  });
});
