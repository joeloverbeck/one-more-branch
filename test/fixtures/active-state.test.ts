/**
 * Tests for Active State Test Fixtures
 */

import { isActiveState, isActiveStateChanges } from '../../src/models/state/index.js';
import {
  createMockTaggedEntry,
  createMockActiveState,
  createMockActiveStateChanges,
  FIXTURES,
} from './active-state';

describe('Active state fixtures', () => {
  describe('createMockTaggedEntry', () => {
    it('creates valid THREAT entry', () => {
      const entry = createMockTaggedEntry('THREAT', 'FIRE', 'Fire spreading');

      expect(entry.prefix).toBe('THREAT_FIRE');
      expect(entry.description).toBe('Fire spreading');
      expect(entry.raw).toBe('THREAT_FIRE: Fire spreading');
    });

    it('creates valid CONSTRAINT entry', () => {
      const entry = createMockTaggedEntry('CONSTRAINT', 'TIME', 'Limited time');

      expect(entry.prefix).toBe('CONSTRAINT_TIME');
      expect(entry.description).toBe('Limited time');
      expect(entry.raw).toBe('CONSTRAINT_TIME: Limited time');
    });

    it('creates valid THREAD entry', () => {
      const entry = createMockTaggedEntry('THREAD', 'MYSTERY', 'Unknown origin');

      expect(entry.prefix).toBe('THREAD_MYSTERY');
      expect(entry.description).toBe('Unknown origin');
      expect(entry.raw).toBe('THREAD_MYSTERY: Unknown origin');
    });

    it('handles multi-word identifiers', () => {
      const entry = createMockTaggedEntry('THREAT', 'POISON_GAS', 'Toxic fumes filling the room');

      expect(entry.prefix).toBe('THREAT_POISON_GAS');
      expect(entry.raw).toBe('THREAT_POISON_GAS: Toxic fumes filling the room');
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

    it('allows overrides for currentLocation', () => {
      const state = createMockActiveState({
        currentLocation: 'Test Location',
      });

      expect(state.currentLocation).toBe('Test Location');
      expect(state.activeThreats).toEqual([]);
    });

    it('allows overrides for all fields', () => {
      const threat = createMockTaggedEntry('THREAT', 'TEST', 'Test threat');
      const constraint = createMockTaggedEntry('CONSTRAINT', 'TEST', 'Test constraint');
      const thread = createMockTaggedEntry('THREAD', 'TEST', 'Test thread');

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
        activeThreats: [createMockTaggedEntry('THREAT', 'X', 'Desc')],
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

    it('allows overrides for newLocation', () => {
      const changes = createMockActiveStateChanges({
        newLocation: 'New Room',
      });

      expect(changes.newLocation).toBe('New Room');
      expect(changes.threatsAdded).toEqual([]);
    });

    it('allows overrides for threat operations', () => {
      const changes = createMockActiveStateChanges({
        threatsAdded: ['THREAT_FIRE: Fire spreading'],
        threatsRemoved: ['THREAT_OLD'],
      });

      expect(changes.threatsAdded).toEqual(['THREAT_FIRE: Fire spreading']);
      expect(changes.threatsRemoved).toEqual(['THREAT_OLD']);
    });

    it('produces valid ActiveStateChanges according to type guard', () => {
      const changes = createMockActiveStateChanges({
        newLocation: 'Test',
        threatsAdded: ['THREAT_X: Test'],
      });

      expect(isActiveStateChanges(changes)).toBe(true);
    });
  });

  describe('FIXTURES', () => {
    describe('empty states', () => {
      it('provides valid empty active state', () => {
        expect(isActiveState(FIXTURES.emptyActiveState)).toBe(true);
        expect(FIXTURES.emptyActiveState.currentLocation).toBe('');
        expect(FIXTURES.emptyActiveState.activeThreats).toHaveLength(0);
      });

      it('provides valid empty active state changes', () => {
        expect(isActiveStateChanges(FIXTURES.emptyActiveStateChanges)).toBe(true);
        expect(FIXTURES.emptyActiveStateChanges.newLocation).toBeNull();
      });
    });

    describe('single-category states', () => {
      it('provides valid state with threat', () => {
        expect(isActiveState(FIXTURES.stateWithThreat)).toBe(true);
        expect(FIXTURES.stateWithThreat.activeThreats).toHaveLength(1);
        expect(FIXTURES.stateWithThreat.activeThreats[0].prefix).toBe('THREAT_FIRE');
        expect(FIXTURES.stateWithThreat.currentLocation).toBe('Dark corridor');
      });

      it('provides valid state with constraint', () => {
        expect(isActiveState(FIXTURES.stateWithConstraint)).toBe(true);
        expect(FIXTURES.stateWithConstraint.activeConstraints).toHaveLength(1);
        expect(FIXTURES.stateWithConstraint.activeConstraints[0].prefix).toBe('CONSTRAINT_QUIET');
      });

      it('provides valid state with thread', () => {
        expect(isActiveState(FIXTURES.stateWithThread)).toBe(true);
        expect(FIXTURES.stateWithThread.openThreads).toHaveLength(1);
        expect(FIXTURES.stateWithThread.openThreads[0].prefix).toBe('THREAD_LETTER');
      });
    });

    describe('full state', () => {
      it('provides valid full state with multiple entries', () => {
        expect(isActiveState(FIXTURES.fullState)).toBe(true);
        expect(FIXTURES.fullState.activeThreats).toHaveLength(2);
        expect(FIXTURES.fullState.activeConstraints).toHaveLength(1);
        expect(FIXTURES.fullState.openThreads).toHaveLength(1);
        expect(FIXTURES.fullState.currentLocation).toBe('Cave entrance');
      });

      it('has correctly formatted threat entries', () => {
        expect(FIXTURES.fullState.activeThreats[0].prefix).toBe('THREAT_WOLVES');
        expect(FIXTURES.fullState.activeThreats[1].prefix).toBe('THREAT_STORM');
      });
    });

    describe('change fixtures', () => {
      it('provides valid changes adding threat', () => {
        expect(isActiveStateChanges(FIXTURES.changesAddingThreat)).toBe(true);
        expect(FIXTURES.changesAddingThreat.threatsAdded).toHaveLength(1);
        expect(FIXTURES.changesAddingThreat.newLocation).toBeNull();
      });

      it('provides valid changes removing threat', () => {
        expect(isActiveStateChanges(FIXTURES.changesRemovingThreat)).toBe(true);
        expect(FIXTURES.changesRemovingThreat.threatsRemoved).toContain('THREAT_FIRE');
      });

      it('provides valid changes updating location', () => {
        expect(isActiveStateChanges(FIXTURES.changesUpdatingLocation)).toBe(true);
        expect(FIXTURES.changesUpdatingLocation.newLocation).toBe('New hidden chamber');
      });

      it('provides valid complex changes', () => {
        expect(isActiveStateChanges(FIXTURES.complexChanges)).toBe(true);
        expect(FIXTURES.complexChanges.newLocation).toBe('Underground passage');
        expect(FIXTURES.complexChanges.threatsAdded).toHaveLength(1);
        expect(FIXTURES.complexChanges.threatsRemoved).toContain('THREAT_WOLVES');
        expect(FIXTURES.complexChanges.constraintsAdded).toHaveLength(1);
        expect(FIXTURES.complexChanges.threadsAdded).toHaveLength(1);
        expect(FIXTURES.complexChanges.threadsResolved).toContain('THREAD_MAP');
      });
    });
  });
});
