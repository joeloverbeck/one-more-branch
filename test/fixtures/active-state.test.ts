/**
 * Tests for Active State Test Fixtures
 */

import { isActiveState, isActiveStateChanges } from '../../src/models/state/index.js';
import {
  createMockKeyedEntry,
  createMockThreadEntry,
  createMockActiveState,
  createMockActiveStateChanges,
  FIXTURES,
} from './active-state';

describe('Active state fixtures', () => {
  describe('createMockKeyedEntry', () => {
    it('creates valid threat entry', () => {
      const entry = createMockKeyedEntry('th', 1, 'Fire spreading');

      expect(entry.id).toBe('th-1');
      expect(entry.text).toBe('Fire spreading');
    });

    it('creates valid constraint entry', () => {
      const entry = createMockKeyedEntry('cn', 7, 'Limited time');

      expect(entry.id).toBe('cn-7');
      expect(entry.text).toBe('Limited time');
    });

    it('creates valid thread entry', () => {
      const entry = createMockKeyedEntry('td', 3, 'Unknown origin');

      expect(entry.id).toBe('td-3');
      expect(entry.text).toBe('Unknown origin');
    });
  });

  describe('createMockActiveState', () => {
    it('creates empty state by default', () => {
      const state = createMockActiveState();

      expect(state.currentLocation).toBe('');
      expect(state.activeThreats).toEqual([]);
      expect(state.activeConstraints).toEqual([]);
      expect(state.openThreads).toEqual([]);
    });

    it('allows overrides for all fields', () => {
      const threat = createMockKeyedEntry('th', 1, 'Test threat');
      const constraint = createMockKeyedEntry('cn', 1, 'Test constraint');
      const thread = createMockThreadEntry(1, 'Test thread');

      const state = createMockActiveState({
        currentLocation: 'Custom Location',
        activeThreats: [threat],
        activeConstraints: [constraint],
        openThreads: [thread],
      });

      expect(state.currentLocation).toBe('Custom Location');
      expect(state.activeThreats).toHaveLength(1);
      expect(state.activeConstraints).toHaveLength(1);
      expect(state.openThreads).toHaveLength(1);
    });

    it('produces valid ActiveState according to type guard', () => {
      const state = createMockActiveState({
        currentLocation: 'Validated Location',
        activeThreats: [createMockKeyedEntry('th', 1, 'Desc')],
      });

      expect(isActiveState(state)).toBe(true);
    });
  });

  describe('createMockActiveStateChanges', () => {
    it('creates empty changes by default', () => {
      const changes = createMockActiveStateChanges();

      expect(changes.newLocation).toBeNull();
      expect(changes.threatsAdded).toEqual([]);
      expect(changes.threatsRemoved).toEqual([]);
      expect(changes.constraintsAdded).toEqual([]);
      expect(changes.constraintsRemoved).toEqual([]);
      expect(changes.threadsAdded).toEqual([]);
      expect(changes.threadsResolved).toEqual([]);
    });

    it('produces valid ActiveStateChanges according to type guard', () => {
      const changes = createMockActiveStateChanges({
        newLocation: 'Test',
        threatsAdded: ['A threat'],
      });

      expect(isActiveStateChanges(changes)).toBe(true);
    });
  });

  describe('FIXTURES', () => {
    it('provides valid empty fixtures', () => {
      expect(isActiveState(FIXTURES.emptyActiveState)).toBe(true);
      expect(isActiveStateChanges(FIXTURES.emptyActiveStateChanges)).toBe(true);
    });

    it('provides valid keyed entries for single-category states', () => {
      expect(FIXTURES.stateWithThreat.activeThreats[0]?.id).toBe('th-1');
      expect(FIXTURES.stateWithConstraint.activeConstraints[0]?.id).toBe('cn-1');
      expect(FIXTURES.stateWithThread.openThreads[0]?.id).toBe('td-1');
    });

    it('provides valid full state and complex changes', () => {
      expect(isActiveState(FIXTURES.fullState)).toBe(true);
      expect(isActiveStateChanges(FIXTURES.complexChanges)).toBe(true);
      expect(FIXTURES.fullState.activeThreats).toHaveLength(2);
      expect(FIXTURES.complexChanges.threatsRemoved).toContain('th-1');
      expect(FIXTURES.complexChanges.threadsResolved).toContain('td-1');
    });
  });
});
