import {
  extractIdNumber,
  getMaxIdNumber,
  nextId,
  assignIds,
  removeByIds,
  isThreadType,
  isUrgency,
  isPromiseType,
  isTrackedPromise,
  PROMISE_TYPE_VALUES,
  ThreadType,
  Urgency,
  PromiseType,
} from '../../../../src/models/state/keyed-entry.js';
import { modelWarn } from '../../../../src/models/model-logger.js';

jest.mock('../../../../src/models/model-logger.js', () => ({
  modelWarn: jest.fn(),
}));

const mockedModelWarn = modelWarn as jest.MockedFunction<typeof modelWarn>;

beforeEach(() => {
  mockedModelWarn.mockClear();
});

describe('extractIdNumber', () => {
  it('parses "inv-3" to 3', () => {
    expect(extractIdNumber('inv-3')).toBe(3);
  });

  it('parses "cs-0" to 0', () => {
    expect(extractIdNumber('cs-0')).toBe(0);
  });

  it('parses "th-12" to 12', () => {
    expect(extractIdNumber('th-12')).toBe(12);
  });

  it('throws on malformed input', () => {
    expect(() => extractIdNumber('garbage')).toThrow('Malformed keyed entry ID');
  });
});

describe('getMaxIdNumber', () => {
  it('returns 0 for empty array', () => {
    expect(getMaxIdNumber([], 'inv')).toBe(0);
  });

  it('returns highest ID number for matching prefix', () => {
    expect(
      getMaxIdNumber(
        [
          { id: 'inv-3', text: 'x' },
          { id: 'inv-1', text: 'y' },
        ],
        'inv'
      )
    ).toBe(3);
  });

  it('returns 0 when no entries match the prefix', () => {
    expect(getMaxIdNumber([{ id: 'th-5', text: 'x' }], 'inv')).toBe(0);
  });
});

describe('nextId', () => {
  it('generates "inv-4" from ("inv", 3)', () => {
    expect(nextId('inv', 3)).toBe('inv-4');
  });

  it('generates "hp-1" from ("hp", 0)', () => {
    expect(nextId('hp', 0)).toBe('hp-1');
  });

  it('generates "pr-2" from ("pr", 1)', () => {
    expect(nextId('pr', 1)).toBe('pr-2');
  });
});

describe('assignIds', () => {
  it('assigns sequential IDs to new texts with no existing entries', () => {
    expect(assignIds([], ['Sword', 'Shield'], 'inv')).toEqual([
      { id: 'inv-1', text: 'Sword' },
      { id: 'inv-2', text: 'Shield' },
    ]);
  });

  it('continues numbering from existing max', () => {
    expect(assignIds([{ id: 'inv-3', text: 'Key' }], ['Potion'], 'inv')).toEqual([
      { id: 'inv-4', text: 'Potion' },
    ]);
  });

  it('skips empty and whitespace-only strings', () => {
    expect(assignIds([], ['', '  '], 'inv')).toEqual([]);
  });
});

describe('removeByIds', () => {
  it('removes entries by ID', () => {
    expect(
      removeByIds(
        [
          { id: 'inv-1', text: 'Sword' },
          { id: 'inv-2', text: 'Shield' },
        ],
        ['inv-1']
      )
    ).toEqual([{ id: 'inv-2', text: 'Shield' }]);
  });

  it('logs warning for non-matching IDs and returns unchanged entries', () => {
    const result = removeByIds([{ id: 'th-1', text: 'Fire' }], ['th-99']);
    expect(result).toEqual([{ id: 'th-1', text: 'Fire' }]);
    expect(mockedModelWarn).toHaveBeenCalledWith('removeByIds: ID "th-99" did not match any entry');
  });
});

describe('thread metadata enums', () => {
  it('validates thread type values', () => {
    expect(isThreadType(ThreadType.MYSTERY)).toBe(true);
    expect(isThreadType('UNKNOWN')).toBe(false);
  });

  it('validates urgency values', () => {
    expect(isUrgency(Urgency.HIGH)).toBe(true);
    expect(isUrgency('CRITICAL')).toBe(false);
  });

  it('validates promise type values', () => {
    expect(PROMISE_TYPE_VALUES).toContain(PromiseType.SETUP_PAYOFF);
    expect(isPromiseType(PromiseType.CHEKHOV_GUN)).toBe(true);
    expect(isPromiseType('NOT_A_PROMISE')).toBe(false);
  });

  it('validates tracked promise entries', () => {
    expect(
      isTrackedPromise({
        id: 'pr-1',
        description: 'A distant storm is repeatedly referenced',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: Urgency.MEDIUM,
        age: 2,
      })
    ).toBe(true);
    expect(
      isTrackedPromise({
        id: 'pr-1',
        description: 'Invalid age',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: Urgency.MEDIUM,
        age: -1,
      })
    ).toBe(false);
    expect(
      isTrackedPromise({
        id: 'pr-1',
        description: 'Invalid urgency',
        promiseType: PromiseType.FORESHADOWING,
        suggestedUrgency: 'CRITICAL',
        age: 1,
      })
    ).toBe(false);
  });
});
