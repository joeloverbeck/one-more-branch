import { createChoice, isChoice, isChoiceExplored } from '../../../src/models/choice';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';
import { PageId } from '../../../src/models/id';

describe('Choice utilities', () => {
  describe('createChoice', () => {
    it('creates a choice with null nextPageId by default', () => {
      const choice = createChoice('Go north');
      expect(choice.text).toBe('Go north');
      expect(choice.nextPageId).toBeNull();
      expect(choice.choiceType).toBe(ChoiceType.TACTICAL_APPROACH);
      expect(choice.primaryDelta).toBe(PrimaryDelta.GOAL_SHIFT);
    });

    it('creates a choice with a provided nextPageId', () => {
      const choice = createChoice('Go north', 5 as PageId);
      expect(choice.text).toBe('Go north');
      expect(choice.nextPageId).toBe(5);
      expect(choice.choiceType).toBe(ChoiceType.TACTICAL_APPROACH);
      expect(choice.primaryDelta).toBe(PrimaryDelta.GOAL_SHIFT);
    });

    it('creates a choice with custom choiceType and primaryDelta', () => {
      const choice = createChoice(
        'Confront the villain',
        null,
        ChoiceType.CONFRONTATION,
        PrimaryDelta.THREAT_SHIFT,
      );
      expect(choice.text).toBe('Confront the villain');
      expect(choice.nextPageId).toBeNull();
      expect(choice.choiceType).toBe(ChoiceType.CONFRONTATION);
      expect(choice.primaryDelta).toBe(PrimaryDelta.THREAT_SHIFT);
    });

    it('trims whitespace from text', () => {
      const choice = createChoice('  Go north  ');
      expect(choice.text).toBe('Go north');
    });

    it('throws for empty or whitespace-only text', () => {
      expect(() => createChoice('')).toThrow('Choice text cannot be empty');
      expect(() => createChoice('   ')).toThrow('Choice text cannot be empty');
    });

    it('throws for invalid nextPageId values', () => {
      expect(() => createChoice('Go', 0 as PageId)).toThrow('Invalid Page ID');
      expect(() => createChoice('Go', -1 as PageId)).toThrow('Invalid Page ID');
      expect(() => createChoice('Go', 1.5 as PageId)).toThrow('Invalid Page ID');
    });

    it('throws for invalid choiceType', () => {
      expect(() =>
        createChoice('Go', null, 'INVALID_TYPE' as ChoiceType),
      ).toThrow('Invalid choiceType');
    });

    it('throws for invalid primaryDelta', () => {
      expect(() =>
        createChoice('Go', null, ChoiceType.TACTICAL_APPROACH, 'INVALID_DELTA' as PrimaryDelta),
      ).toThrow('Invalid primaryDelta');
    });
  });

  describe('isChoice', () => {
    it('returns true for valid choice objects with all fields', () => {
      expect(isChoice({
        text: 'Go',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.GOAL_SHIFT,
        nextPageId: null,
      })).toBe(true);
      expect(isChoice({
        text: 'Go',
        choiceType: ChoiceType.MORAL_DILEMMA,
        primaryDelta: PrimaryDelta.RELATIONSHIP_CHANGE,
        nextPageId: 5,
      })).toBe(true);
    });

    it('returns true for all valid choiceType values', () => {
      for (const ct of Object.values(ChoiceType)) {
        expect(isChoice({
          text: 'Go',
          choiceType: ct,
          primaryDelta: PrimaryDelta.GOAL_SHIFT,
          nextPageId: null,
        })).toBe(true);
      }
    });

    it('returns true for all valid primaryDelta values', () => {
      for (const pd of Object.values(PrimaryDelta)) {
        expect(isChoice({
          text: 'Go',
          choiceType: ChoiceType.TACTICAL_APPROACH,
          primaryDelta: pd,
          nextPageId: null,
        })).toBe(true);
      }
    });

    it('returns false for invalid objects', () => {
      expect(isChoice(null)).toBe(false);
      expect(isChoice({ text: '' })).toBe(false);
      expect(isChoice({ text: '   ', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.GOAL_SHIFT, nextPageId: null })).toBe(false);
      expect(isChoice({ nextPageId: 1 })).toBe(false);
      expect(isChoice({ text: 'Go', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.GOAL_SHIFT, nextPageId: 0 })).toBe(false);
      expect(isChoice({ text: 'Go', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.GOAL_SHIFT, nextPageId: 1.2 })).toBe(false);
    });

    it('returns false when choiceType is missing', () => {
      expect(isChoice({ text: 'Go', primaryDelta: PrimaryDelta.GOAL_SHIFT, nextPageId: null })).toBe(false);
    });

    it('returns false when primaryDelta is missing', () => {
      expect(isChoice({ text: 'Go', choiceType: ChoiceType.TACTICAL_APPROACH, nextPageId: null })).toBe(false);
    });

    it('returns false when choiceType is invalid string', () => {
      expect(isChoice({ text: 'Go', choiceType: 'INVALID', primaryDelta: PrimaryDelta.GOAL_SHIFT, nextPageId: null })).toBe(false);
    });

    it('returns false when primaryDelta is invalid string', () => {
      expect(isChoice({ text: 'Go', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: 'INVALID', nextPageId: null })).toBe(false);
    });

    it('returns false when choiceType is not a string', () => {
      expect(isChoice({ text: 'Go', choiceType: 42, primaryDelta: PrimaryDelta.GOAL_SHIFT, nextPageId: null })).toBe(false);
    });

    it('returns false when primaryDelta is not a string', () => {
      expect(isChoice({ text: 'Go', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: true, nextPageId: null })).toBe(false);
    });
  });

  describe('isChoiceExplored', () => {
    it('returns false when nextPageId is null', () => {
      expect(isChoiceExplored({
        text: 'Go',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.GOAL_SHIFT,
        nextPageId: null,
      })).toBe(false);
    });

    it('returns true when nextPageId is set', () => {
      expect(isChoiceExplored({
        text: 'Go',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.GOAL_SHIFT,
        nextPageId: 5 as PageId,
      })).toBe(true);
    });
  });
});
