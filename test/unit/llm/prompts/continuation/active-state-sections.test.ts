import { ConstraintType, ThreatType, ThreadType, Urgency } from '../../../../../src/models/state';
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
          {
            id: 'th-1',
            text: 'Guard patrolling the area',
            threatType: ThreatType.HOSTILE_AGENT,
          },
          { id: 'th-2', text: 'Alarm system is active', threatType: ThreatType.ENVIRONMENTAL },
        ],
      };

      const result = buildThreatsSection(state);

      expect(result).toContain('ACTIVE THREATS (dangers that exist NOW):');
      expect(result).toContain('- [th-1] (HOSTILE_AGENT) Guard patrolling the area');
      expect(result).toContain('- [th-2] (ENVIRONMENTAL) Alarm system is active');
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
          {
            id: 'cn-1',
            text: 'Injured leg limits mobility',
            constraintType: ConstraintType.PHYSICAL,
          },
        ],
      };

      const result = buildConstraintsSection(state);

      expect(result).toContain('ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):');
      expect(result).toContain('- [cn-1] (PHYSICAL) Injured leg limits mobility');
    });
  });

  describe('buildThreadsSection', () => {
    it('returns empty string when no threads', () => {
      expect(buildThreadsSection(emptyState)).toBe('');
    });

    it('formats threads with header, tags, and raw text', () => {
      const state: ActiveState = {
        ...emptyState,
        openThreads: [
          {
            id: 'td-1',
            text: 'Missing witness - whereabouts unknown',
            threadType: ThreadType.MYSTERY,
            urgency: Urgency.HIGH,
          },
        ],
      };

      const result = buildThreadsSection(state);

      expect(result).toContain('OPEN NARRATIVE THREADS (unresolved hooks):');
      expect(result).toContain('- [td-1] (MYSTERY/HIGH) Missing witness - whereabouts unknown');
    });
  });
});
