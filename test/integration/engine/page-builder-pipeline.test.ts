/**
 * Integration tests for the page-builder pipeline.
 *
 * These tests exercise buildPage (and the deprecated wrappers) through
 * realistic multi-page chains to verify thread lifecycle, promise lifecycle,
 * NPC accumulation, analyst augmentation, story bible storage, state
 * accumulation, and structural position fields.
 *
 * This suite acts as a safety net for the SRP refactoring of page-builder.ts.
 */

import { buildPage } from '@/engine/page-builder';
import type { PageBuildContext } from '@/engine/page-builder';
import {
  createMockFinalResult,
  createMockAnalystResult,
} from '../../fixtures/llm-results';
import {
  createEmptyAccumulatedStructureState,
  parsePageId,
  ThreadType,
  Urgency,
  ThreatType,
  PromiseType,
} from '@/models';
import { PromiseScope } from '@/models/state/keyed-entry';
import { createEmptyAccumulatedNpcRelationships } from '@/models/state/npc-relationship';
import type { NpcAgenda } from '@/models/state/npc-agenda';
import type { NpcRelationship } from '@/models/state/npc-relationship';
import type { StoryBible } from '@/llm/lorekeeper-types';
import type { AnalystResult } from '@/llm/analyst-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOpeningContext(overrides: Partial<PageBuildContext> = {}): PageBuildContext {
  return {
    pageId: parsePageId(1),
    parentPageId: null,
    parentChoiceIndex: null,
    parentAccumulatedActiveState: {
      currentLocation: '',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    parentAccumulatedInventory: [],
    parentAccumulatedHealth: [],
    parentAccumulatedCharacterState: {},
    structureState: createEmptyAccumulatedStructureState(),
    structureVersionId: null,
    storyBible: null,
    analystResult: null,
    parentThreadAges: {},
    parentAccumulatedPromises: [],
    analystPromisesDetected: [],
    analystPromisesResolved: [],
    parentAccumulatedNpcAgendas: {},
    parentAccumulatedNpcRelationships: createEmptyAccumulatedNpcRelationships(),
    pageActIndex: 0,
    pageBeatIndex: 0,
    ...overrides,
  };
}

function makeContinuationContext(
  pageId: number,
  parentPage: ReturnType<typeof buildPage>,
  overrides: Partial<PageBuildContext> = {}
): PageBuildContext {
  return {
    pageId: parsePageId(pageId),
    parentPageId: parentPage.id,
    parentChoiceIndex: 0,
    parentAccumulatedActiveState: parentPage.accumulatedActiveState,
    parentAccumulatedInventory: parentPage.accumulatedInventory,
    parentAccumulatedHealth: parentPage.accumulatedHealth,
    parentAccumulatedCharacterState: parentPage.accumulatedCharacterState,
    structureState: parentPage.accumulatedStructureState,
    structureVersionId: parentPage.structureVersionId,
    storyBible: null,
    analystResult: null,
    parentThreadAges: parentPage.threadAges,
    parentAccumulatedPromises: parentPage.accumulatedPromises,
    analystPromisesDetected: [],
    analystPromisesResolved: [],
    parentAccumulatedNpcAgendas: parentPage.accumulatedNpcAgendas,
    parentAccumulatedNpcRelationships: parentPage.accumulatedNpcRelationships,
    pageActIndex: 0,
    pageBeatIndex: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('page-builder pipeline integration', () => {
  describe('promise lifecycle through multi-page chain', () => {
    it('detects on page 1, ages on page 2, resolves on page 3, and expires SCENE scope', () => {
      // --- Page 1: opening page, analyst detects a promise ---
      const detected = [
        {
          description: 'The locked door hides something valuable',
          promiseType: PromiseType.CHEKHOV_GUN,
          scope: PromiseScope.SCENE,
          resolutionHint: 'Open the locked door',
          suggestedUrgency: Urgency.MEDIUM,
        },
        {
          description: 'The villain will return',
          promiseType: PromiseType.FORESHADOWING,
          scope: PromiseScope.ACT,
          resolutionHint: 'Villain confrontation',
          suggestedUrgency: Urgency.HIGH,
        },
      ];

      const page1 = buildPage(
        createMockFinalResult(),
        makeOpeningContext({ analystPromisesDetected: detected })
      );

      // Both promises detected with age 0
      expect(page1.accumulatedPromises).toHaveLength(2);
      expect(page1.accumulatedPromises[0]).toMatchObject({
        id: 'pr-1',
        description: 'The locked door hides something valuable',
        scope: PromiseScope.SCENE,
        age: 0,
      });
      expect(page1.accumulatedPromises[1]).toMatchObject({
        id: 'pr-2',
        description: 'The villain will return',
        scope: PromiseScope.ACT,
        age: 0,
      });

      // --- Page 2: continuation, no new detections, promises age ---
      const page2 = buildPage(
        createMockFinalResult(),
        makeContinuationContext(2, page1)
      );

      expect(page2.accumulatedPromises).toHaveLength(2);
      expect(page2.accumulatedPromises[0]).toMatchObject({ id: 'pr-1', age: 1 });
      expect(page2.accumulatedPromises[1]).toMatchObject({ id: 'pr-2', age: 1 });

      // --- Page 3: resolve pr-1, pr-2 ages again ---
      const page3 = buildPage(
        createMockFinalResult(),
        makeContinuationContext(3, page2, {
          analystPromisesResolved: ['pr-1'],
        })
      );

      // pr-1 resolved (removed), pr-2 aged to 2
      expect(page3.accumulatedPromises).toHaveLength(1);
      expect(page3.accumulatedPromises[0]).toMatchObject({ id: 'pr-2', age: 2 });
      expect(page3.resolvedPromiseMeta).toEqual({
        'pr-1': {
          promiseType: PromiseType.CHEKHOV_GUN,
          scope: PromiseScope.SCENE,
          urgency: Urgency.MEDIUM,
        },
      });

      // --- Verify SCENE scope expiry: create a chain where SCENE promise ages past threshold ---
      // SCENE expiry threshold is 4 (from THREAD_PACING.PROMISE_SCOPE_EXPIRY.SCENE)
      // After page1(age=0) -> page2(age=1) -> page3(age=2) -> page4(age=3) -> page5(age=4) -> page6 would be age 5 > 4, expired
      let currentPage = page1;
      // Simulate aging the SCENE promise (pr-1) through pages. Reset from page1 to avoid resolution.
      // Build a fresh chain where SCENE promise survives to expiry.
      const scenePage1 = buildPage(
        createMockFinalResult(),
        makeOpeningContext({
          analystPromisesDetected: [
            {
              description: 'Scene-scoped hint',
              promiseType: PromiseType.CHEKHOV_GUN,
              scope: PromiseScope.SCENE,
              resolutionHint: 'Use it soon',
              suggestedUrgency: Urgency.LOW,
            },
          ],
        })
      );

      // Age through pages 2-5 (age 0 -> 1 -> 2 -> 3 -> 4)
      currentPage = scenePage1;
      for (let i = 2; i <= 6; i++) {
        currentPage = buildPage(
          createMockFinalResult(),
          makeContinuationContext(i, currentPage)
        );
      }

      // After 5 continuations, the SCENE promise has age 5 which exceeds threshold 4
      expect(currentPage.accumulatedPromises).toHaveLength(0);
    });
  });

  describe('NPC agenda and relationship accumulation', () => {
    it('stores initial agendas on opening and updates on continuation page', () => {
      const initialAgenda: NpcAgenda = {
        npcName: 'Bartender',
        currentGoal: 'Serve drinks',
        leverage: 'Knows the local gossip',
        fear: 'Losing the tavern',
        offScreenBehavior: 'Cleaning glasses',
      };

      // Opening page with initial NPC agendas
      const page1 = buildPage(
        createMockFinalResult(),
        makeOpeningContext({
          parentAccumulatedNpcAgendas: { Bartender: initialAgenda },
        })
      );

      expect(page1.accumulatedNpcAgendas).toEqual({ Bartender: initialAgenda });

      // Continuation page with agenda update
      const updatedAgenda: NpcAgenda = {
        npcName: 'Bartender',
        currentGoal: 'Close the tavern early',
        leverage: 'Knows the local gossip',
        fear: 'The approaching storm',
        offScreenBehavior: 'Boarding up windows',
      };

      const relationship: NpcRelationship = {
        npcName: 'Bartender',
        valence: 2,
        dynamic: 'ally',
        history: 'Met at the tavern',
        currentTension: 'Disagreement about the storm',
        leverage: 'Information about the back road',
      };

      const page2 = buildPage(
        createMockFinalResult(),
        makeContinuationContext(2, page1, {
          npcAgendaUpdates: [updatedAgenda],
          npcRelationshipUpdates: [relationship],
        })
      );

      // Agenda updated
      expect(page2.accumulatedNpcAgendas['Bartender']).toEqual(updatedAgenda);
      expect(page2.npcAgendaUpdates).toEqual([updatedAgenda]);

      // Relationship stored
      expect(page2.npcRelationshipUpdates).toEqual([relationship]);
      expect(page2.accumulatedNpcRelationships['Bartender']).toEqual(relationship);
    });
  });

  describe('analyst thread resolution augmentation', () => {
    it('augments empty threadsResolved from analyst threadPayoffAssessments and flows to resolvedThreadMeta and threadAges', () => {
      // Build page 1 with an open thread
      const page1Result = createMockFinalResult({
        threadsAdded: [
          { text: 'Mystery of the missing key', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
        ],
      });
      const page1 = buildPage(page1Result, makeOpeningContext());

      // Verify thread exists on page 1
      expect(page1.accumulatedActiveState.openThreads).toHaveLength(1);
      expect(page1.accumulatedActiveState.openThreads[0]!.id).toBe('td-1');
      expect(page1.threadAges).toEqual({ 'td-1': 0 });

      // Page 2: analyst detects thread payoff but reconciler misses the resolution
      const analystResult = createMockAnalystResult({
        threadPayoffAssessments: [
          {
            threadId: 'td-1',
            threadText: 'Mystery of the missing key',
            satisfactionLevel: 'WELL_EARNED',
            reasoning: 'Properly set up and paid off',
          },
        ],
      });

      const page2 = buildPage(
        createMockFinalResult({ threadsResolved: [] }),
        makeContinuationContext(2, page1, { analystResult })
      );

      // Analyst augmentation should have resolved td-1
      expect(page2.resolvedThreadMeta).toEqual({
        'td-1': { threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
      });

      // td-1 should NOT appear in threadAges (it was resolved)
      expect(page2.threadAges).toEqual({});

      // td-1 should not be in accumulated open threads
      expect(page2.accumulatedActiveState.openThreads).toHaveLength(0);
    });
  });

  describe('story bible and analyst result storage', () => {
    it('stores non-null storyBible and analystResult on the page', () => {
      const storyBible: StoryBible = {
        sceneWorldContext: 'A dark medieval tavern in the frontier town.',
        relevantCharacters: [
          {
            name: 'Bartender',
            role: 'NPC ally',
            relevantProfile: 'Gruff but kind',
            speechPatterns: 'Short sentences, gravel voice',
            protagonistRelationship: 'Friendly',
            currentState: 'Cleaning glasses',
          },
        ],
        relevantCanonFacts: ['The town is under siege'],
        relevantHistory: 'The protagonist arrived two days ago seeking shelter.',
      };

      const analystResult: AnalystResult = createMockAnalystResult({
        narrativeSummary: 'The protagonist confronted the bartender about the locked room.',
        beatConcluded: true,
        beatResolution: 'Trust established',
      });

      const page = buildPage(
        createMockFinalResult(),
        makeContinuationContext(2, buildPage(createMockFinalResult(), makeOpeningContext()), {
          storyBible,
          analystResult,
        })
      );

      expect(page.storyBible).toEqual(storyBible);
      expect(page.analystResult).toEqual(analystResult);
      expect(page.analystResult!.narrativeSummary).toBe(
        'The protagonist confronted the bartender about the locked room.'
      );
      expect(page.analystResult!.beatConcluded).toBe(true);
    });
  });

  describe('multi-page state accumulation chain', () => {
    it('accumulates inventory, threats, and threads correctly across 3 pages', () => {
      // Page 1: add inventory + threat + thread
      const page1 = buildPage(
        createMockFinalResult({
          currentLocation: 'Tavern',
          inventoryAdded: ['Rusty sword'],
          inventoryRemoved: [],
          threatsAdded: [{ text: 'Goblin scouts', threatType: ThreatType.CREATURE }],
          threatsRemoved: [],
          threadsAdded: [
            { text: 'Find the hidden passage', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
          ],
          threadsResolved: [],
        }),
        makeOpeningContext()
      );

      expect(page1.accumulatedInventory).toHaveLength(1);
      expect(page1.accumulatedInventory[0]!.text).toBe('Rusty sword');
      expect(page1.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page1.accumulatedActiveState.openThreads).toHaveLength(1);
      expect(page1.threadAges).toEqual({ 'td-1': 0 });

      // Page 2: add more inventory + another thread, keep existing
      const page2 = buildPage(
        createMockFinalResult({
          currentLocation: 'Cellar',
          inventoryAdded: ['Torch'],
          inventoryRemoved: [],
          threatsAdded: [],
          threatsRemoved: [],
          threadsAdded: [
            { text: 'Strange noises below', threadType: ThreadType.DANGER, urgency: Urgency.HIGH },
          ],
          threadsResolved: [],
        }),
        makeContinuationContext(2, page1)
      );

      expect(page2.accumulatedInventory).toHaveLength(2);
      expect(page2.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page2.accumulatedActiveState.openThreads).toHaveLength(2);
      expect(page2.threadAges).toEqual({ 'td-1': 1, 'td-2': 0 });
      expect(page2.accumulatedActiveState.currentLocation).toBe('Cellar');

      // Page 3: remove inventory item, resolve a thread, remove threat
      const page3 = buildPage(
        createMockFinalResult({
          currentLocation: 'Hidden chamber',
          inventoryAdded: ['Ancient key'],
          inventoryRemoved: ['inv-1'], // Remove rusty sword
          threatsAdded: [],
          threatsRemoved: ['th-1'], // Remove goblin scouts
          threadsAdded: [],
          threadsResolved: ['td-1'], // Resolve "find the hidden passage"
        }),
        makeContinuationContext(3, page2)
      );

      // Inventory: removed rusty sword, added ancient key, kept torch
      expect(page3.accumulatedInventory).toHaveLength(2);
      const inventoryTexts = page3.accumulatedInventory.map((i) => i.text);
      expect(inventoryTexts).toContain('Torch');
      expect(inventoryTexts).toContain('Ancient key');
      expect(inventoryTexts).not.toContain('Rusty sword');

      // Threats: goblin scouts removed
      expect(page3.accumulatedActiveState.activeThreats).toHaveLength(0);

      // Threads: td-1 resolved, td-2 still open
      expect(page3.accumulatedActiveState.openThreads).toHaveLength(1);
      expect(page3.accumulatedActiveState.openThreads[0]!.id).toBe('td-2');

      // Thread ages: td-1 gone (resolved), td-2 aged from 0→1
      expect(page3.threadAges).toEqual({ 'td-2': 1 });

      // Resolved thread meta
      expect(page3.resolvedThreadMeta).toEqual({
        'td-1': { threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
      });
    });
  });

  describe('page structural position fields', () => {
    it('stores pageActIndex and pageBeatIndex from context', () => {
      const page = buildPage(
        createMockFinalResult(),
        makeOpeningContext({
          pageActIndex: 2,
          pageBeatIndex: 3,
        })
      );

      expect(page.pageActIndex).toBe(2);
      expect(page.pageBeatIndex).toBe(3);
    });

    it('preserves structural position through continuation', () => {
      const page1 = buildPage(createMockFinalResult(), makeOpeningContext());

      const page2 = buildPage(
        createMockFinalResult(),
        makeContinuationContext(2, page1, {
          pageActIndex: 1,
          pageBeatIndex: 2,
        })
      );

      expect(page2.pageActIndex).toBe(1);
      expect(page2.pageBeatIndex).toBe(2);
    });
  });
});
