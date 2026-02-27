import {
  createStoryStructure,
  parseApproachVectors,
  parseCrisisType,
  parseGapMagnitude,
  parseMidpointType,
} from '../../../src/engine/structure-factory';
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
            causalLink: 'Because the messenger reaches the heir in time.',
            role: 'setup',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'Crossroads decision',
            description: 'A difficult choice',
            objective: 'Leave home',
            causalLink: 'Because the warning reveals immediate danger at court.',
            role: 'turning_point',
            isMidpoint: true,
            midpointType: 'FALSE_DEFEAT',
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
            causalLink: 'Because the heir departs without securing enough allies.',
            role: 'escalation',
            isMidpoint: false,
            midpointType: null,
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
      expect(result.acts[0]?.beats[0]?.causalLink).toBe(
        'Because the messenger reaches the heir in time.'
      );
    });

    it('sets approachVectors to null when not provided', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.acts[0]?.beats[0]?.approachVectors).toBeNull();
      expect(result.acts[0]?.beats[1]?.approachVectors).toBeNull();
    });

    it('sets setpieceSourceIndex to null when not provided', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.acts[0]?.beats[0]?.setpieceSourceIndex).toBeNull();
      expect(result.acts[0]?.beats[1]?.setpieceSourceIndex).toBeNull();
    });

    it('maps valid crisisType and coerces invalid values to null', () => {
      const genResult = createGenerationResult();
      genResult.acts[0]!.beats[1]!.crisisType = 'BEST_BAD_CHOICE';
      genResult.acts[1]!.beats[0]!.crisisType = 'INVALID_CRISIS';
      const result = createStoryStructure(genResult);

      expect(result.acts[0]?.beats[1]?.crisisType).toBe('BEST_BAD_CHOICE');
      expect(result.acts[1]?.beats[0]?.crisisType).toBeNull();
    });

    it('maps valid secondaryEscalationType and coerces invalid values to null', () => {
      const genResult = createGenerationResult();
      genResult.acts[0]!.beats[1]!.secondaryEscalationType = 'REVELATION_SHIFT';
      genResult.acts[1]!.beats[0]!.secondaryEscalationType = 'INVALID_ESCALATION';

      const result = createStoryStructure(genResult);

      expect(result.acts[0]?.beats[1]?.secondaryEscalationType).toBe('REVELATION_SHIFT');
      expect(result.acts[1]?.beats[0]?.secondaryEscalationType).toBeNull();
    });

    it('maps valid expectedGapMagnitude and coerces invalid values to null', () => {
      const genResult = createGenerationResult();
      genResult.acts[0]!.beats[1]!.expectedGapMagnitude = 'WIDE';
      genResult.acts[1]!.beats[0]!.expectedGapMagnitude = 'IMPOSSIBLE';

      const result = createStoryStructure(genResult);

      expect(result.acts[0]?.beats[1]?.expectedGapMagnitude).toBe('WIDE');
      expect(result.acts[1]?.beats[0]?.expectedGapMagnitude).toBeNull();
    });

    it('parses valid approachVectors from generation result', () => {
      const genResult = createGenerationResult();
      genResult.acts[1]!.beats[0]!.approachVectors = [
        'DIRECT_FORCE',
        'ANALYTICAL_REASONING',
      ];
      const result = createStoryStructure(genResult);

      expect(result.acts[1]?.beats[0]?.approachVectors).toEqual([
        'DIRECT_FORCE',
        'ANALYTICAL_REASONING',
      ]);
    });

    it('filters out invalid approachVectors', () => {
      const genResult = createGenerationResult();
      genResult.acts[1]!.beats[0]!.approachVectors = [
        'DIRECT_FORCE',
        'INVALID_VECTOR',
        'STEALTH_SUBTERFUGE',
      ];
      const result = createStoryStructure(genResult);

      expect(result.acts[1]?.beats[0]?.approachVectors).toEqual([
        'DIRECT_FORCE',
        'STEALTH_SUBTERFUGE',
      ]);
    });

    it('maps valid setpieceSourceIndex values', () => {
      const genResult = createGenerationResult();
      genResult.acts[1]!.beats[0]!.setpieceSourceIndex = 4;
      const result = createStoryStructure(genResult);

      expect(result.acts[1]?.beats[0]?.setpieceSourceIndex).toBe(4);
    });

    it('coerces invalid setpieceSourceIndex to null', () => {
      const genResult = createGenerationResult();
      genResult.acts[1]!.beats[0]!.setpieceSourceIndex = 99;
      const result = createStoryStructure(genResult);

      expect(result.acts[1]?.beats[0]?.setpieceSourceIndex).toBeNull();
    });

    it('maps midpoint fields and preserves midpoint type for midpoint beat', () => {
      const result = createStoryStructure(createGenerationResult());

      expect(result.acts[0]?.beats[0]?.isMidpoint).toBe(false);
      expect(result.acts[0]?.beats[0]?.midpointType).toBeNull();
      expect(result.acts[0]?.beats[1]?.isMidpoint).toBe(true);
      expect(result.acts[0]?.beats[1]?.midpointType).toBe('FALSE_DEFEAT');
    });

    it('throws when causalLink is blank', () => {
      const genResult = createGenerationResult();
      genResult.acts[1]!.beats[0]!.causalLink = '   ';

      expect(() => createStoryStructure(genResult)).toThrow(
        'Structure beat 2.1 must include a non-empty causalLink'
      );
    });

    it('throws when midpoint beat is missing midpointType', () => {
      const genResult = createGenerationResult();
      genResult.acts[0]!.beats[1]!.isMidpoint = true;
      genResult.acts[0]!.beats[1]!.midpointType = null;

      expect(() => createStoryStructure(genResult)).toThrow(
        'Structure beat 1.2 is midpoint-tagged but missing midpointType'
      );
    });

    it('throws when non-midpoint beat includes midpointType', () => {
      const genResult = createGenerationResult();
      genResult.acts[1]!.beats[0]!.isMidpoint = false;
      genResult.acts[1]!.beats[0]!.midpointType = 'FALSE_VICTORY';

      expect(() => createStoryStructure(genResult)).toThrow(
        'Structure beat 2.1 has midpointType but isMidpoint is false'
      );
    });
  });

  describe('parseApproachVectors', () => {
    it('returns null for non-array input', () => {
      expect(parseApproachVectors(null)).toBeNull();
      expect(parseApproachVectors(undefined)).toBeNull();
      expect(parseApproachVectors('DIRECT_FORCE')).toBeNull();
      expect(parseApproachVectors(42)).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(parseApproachVectors([])).toBeNull();
    });

    it('returns valid vectors from mixed input', () => {
      expect(
        parseApproachVectors(['DIRECT_FORCE', 'INVALID', 'EMPATHIC_CONNECTION'])
      ).toEqual(['DIRECT_FORCE', 'EMPATHIC_CONNECTION']);
    });

    it('returns null when all values are invalid', () => {
      expect(parseApproachVectors(['INVALID', 'ALSO_INVALID'])).toBeNull();
    });

    it('returns all 10 valid vectors', () => {
      const all = [
        'DIRECT_FORCE',
        'SWIFT_ACTION',
        'STEALTH_SUBTERFUGE',
        'ANALYTICAL_REASONING',
        'CAREFUL_OBSERVATION',
        'INTUITIVE_LEAP',
        'PERSUASION_INFLUENCE',
        'EMPATHIC_CONNECTION',
        'ENDURANCE_RESILIENCE',
        'SELF_EXPRESSION',
      ];
      expect(parseApproachVectors(all)).toEqual(all);
    });
  });

  describe('parseCrisisType', () => {
    it('returns valid crisis types and null for invalid values', () => {
      expect(parseCrisisType('BEST_BAD_CHOICE')).toBe('BEST_BAD_CHOICE');
      expect(parseCrisisType('IRRECONCILABLE_GOODS')).toBe('IRRECONCILABLE_GOODS');
      expect(parseCrisisType('UNKNOWN')).toBeNull();
      expect(parseCrisisType(null)).toBeNull();
      expect(parseCrisisType(undefined)).toBeNull();
    });
  });

  describe('parseMidpointType', () => {
    it('returns valid midpoint types and null for invalid values', () => {
      expect(parseMidpointType('FALSE_VICTORY')).toBe('FALSE_VICTORY');
      expect(parseMidpointType('FALSE_DEFEAT')).toBe('FALSE_DEFEAT');
      expect(parseMidpointType('UNKNOWN')).toBeNull();
      expect(parseMidpointType(null)).toBeNull();
      expect(parseMidpointType(undefined)).toBeNull();
    });
  });

  describe('parseGapMagnitude', () => {
    it('returns valid gap magnitudes and null for invalid values', () => {
      expect(parseGapMagnitude('NARROW')).toBe('NARROW');
      expect(parseGapMagnitude('MODERATE')).toBe('MODERATE');
      expect(parseGapMagnitude('WIDE')).toBe('WIDE');
      expect(parseGapMagnitude('CHASM')).toBe('CHASM');
      expect(parseGapMagnitude('UNKNOWN')).toBeNull();
      expect(parseGapMagnitude(null)).toBeNull();
      expect(parseGapMagnitude(undefined)).toBeNull();
    });
  });
});
