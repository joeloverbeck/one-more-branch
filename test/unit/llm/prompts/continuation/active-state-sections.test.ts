import type { ActiveState } from '../../../../../src/models/state';
import {
  buildLocationSection,
  buildThreatsSection,
  buildConstraintsSection,
  buildThreadsSection,
} from '../../../../../src/llm/prompts/continuation/active-state-sections';

describe('active-state-sections', () => {
  const emptyState: ActiveState = {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  describe('buildLocationSection', () => {
    it('returns empty string when location is empty', () => {
      expect(buildLocationSection(emptyState)).toBe('');
    });

    it('formats location with header when present', () => {
      const state: ActiveState = {
        ...emptyState,
        currentLocation: 'A dimly lit warehouse',
      };

      const result = buildLocationSection(state);

      expect(result).toContain('CURRENT LOCATION:');
      expect(result).toContain('A dimly lit warehouse');
    });
  });

  describe('buildThreatsSection', () => {
    it('returns empty string when no threats', () => {
      expect(buildThreatsSection(emptyState)).toBe('');
    });

    it('formats threats with header and raw text', () => {
      const state: ActiveState = {
        ...emptyState,
        activeThreats: [
          { prefix: 'Guard', description: 'patrolling', raw: 'Guard patrolling the area' },
          { prefix: 'Alarm', description: 'active', raw: 'Alarm system is active' },
        ],
      };

      const result = buildThreatsSection(state);

      expect(result).toContain('ACTIVE THREATS (dangers that exist NOW):');
      expect(result).toContain('- Guard patrolling the area');
      expect(result).toContain('- Alarm system is active');
    });
  });

  describe('buildConstraintsSection', () => {
    it('returns empty string when no constraints', () => {
      expect(buildConstraintsSection(emptyState)).toBe('');
    });

    it('formats constraints with header and raw text', () => {
      const state: ActiveState = {
        ...emptyState,
        activeConstraints: [
          { prefix: 'Injured leg', description: 'limits mobility', raw: 'Injured leg limits mobility' },
        ],
      };

      const result = buildConstraintsSection(state);

      expect(result).toContain('ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):');
      expect(result).toContain('- Injured leg limits mobility');
    });
  });

  describe('buildThreadsSection', () => {
    it('returns empty string when no threads', () => {
      expect(buildThreadsSection(emptyState)).toBe('');
    });

    it('formats threads with header and raw text', () => {
      const state: ActiveState = {
        ...emptyState,
        openThreads: [
          { prefix: 'Missing witness', description: 'whereabouts unknown', raw: 'Missing witness - whereabouts unknown' },
        ],
      };

      const result = buildThreadsSection(state);

      expect(result).toContain('OPEN NARRATIVE THREADS (unresolved hooks):');
      expect(result).toContain('- Missing witness - whereabouts unknown');
    });
  });
});
