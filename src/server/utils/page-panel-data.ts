import type { Page } from '../../models/index.js';
import type {
  ConstraintPanelData,
  KeyedEntryPanelData,
  KnowledgeStatePanelData,
  NpcAgendaPanelData,
  NpcRelationshipPanelData,
  OpenThreadPanelData,
  ThreatPanelData,
  TrackedPromisePanelData,
} from './view-helpers.js';
import {
  getConstraintPanelData,
  getKeyedEntryPanelData,
  getKnowledgeStatePanelData,
  getNpcAgendaPanelData,
  getNpcRelationshipPanelData,
  getOpenThreadPanelData,
  getThreatPanelData,
  getTrackedPromisesPanelData,
} from './view-helpers.js';

export interface PagePanelData {
  readonly openThreadPanelData: OpenThreadPanelData;
  readonly threatsPanelData: ThreatPanelData;
  readonly constraintsPanelData: ConstraintPanelData;
  readonly inventoryPanelData: KeyedEntryPanelData;
  readonly healthPanelData: KeyedEntryPanelData;
  readonly trackedPromisesPanelData: TrackedPromisePanelData;
  readonly npcRelationshipPanelData: NpcRelationshipPanelData;
  readonly npcAgendaPanelData: NpcAgendaPanelData;
  readonly knowledgeStatePanelData: KnowledgeStatePanelData;
  readonly insightsThreadMeta: Record<string, { threadType: string; urgency: string }>;
  readonly insightsPromiseMeta: Record<string, { promiseType: string; scope: string; urgency: string }>;
}

export function buildInsightsThreadMeta(
  page: Page,
  parentPage: Page | null
): Record<string, { threadType: string; urgency: string }> {
  const meta: Record<string, { threadType: string; urgency: string }> = {};
  if (parentPage) {
    const parentThreadById = new Map(
      parentPage.accumulatedActiveState.openThreads.map((thread) => [thread.id, thread])
    );
    for (const threadId of page.activeStateChanges.threadsResolved) {
      const resolvedThread = parentThreadById.get(threadId);
      if (resolvedThread) {
        meta[threadId] = {
          threadType: resolvedThread.threadType,
          urgency: resolvedThread.urgency,
        };
      }
    }
  }

  for (const thread of page.accumulatedActiveState.openThreads) {
    meta[thread.id] ??= { threadType: thread.threadType, urgency: thread.urgency };
  }
  return meta;
}

export function buildInsightsPromiseMeta(
  page: Page,
  parentPage: Page | null
): Record<string, { promiseType: string; scope: string; urgency: string }> {
  if (!parentPage || !page.analystResult) {
    return {};
  }

  const parentPromiseById = new Map(
    parentPage.accumulatedPromises.map((promise) => [promise.id, promise])
  );
  const meta: Record<string, { promiseType: string; scope: string; urgency: string }> = {};
  for (const promiseId of page.analystResult.promisesResolved) {
    const resolvedPromise = parentPromiseById.get(promiseId);
    if (resolvedPromise) {
      meta[promiseId] = {
        promiseType: resolvedPromise.promiseType,
        scope: resolvedPromise.scope,
        urgency: resolvedPromise.suggestedUrgency,
      };
    }
  }
  return meta;
}

export function buildPagePanelData(page: Page, parentPage: Page | null = null): PagePanelData {
  return {
    openThreadPanelData: getOpenThreadPanelData(page.accumulatedActiveState.openThreads),
    threatsPanelData: getThreatPanelData(page.accumulatedActiveState.activeThreats),
    constraintsPanelData: getConstraintPanelData(page.accumulatedActiveState.activeConstraints),
    inventoryPanelData: getKeyedEntryPanelData(page.accumulatedInventory, 10),
    healthPanelData: getKeyedEntryPanelData(page.accumulatedHealth, 10),
    trackedPromisesPanelData: getTrackedPromisesPanelData(page.accumulatedPromises),
    npcRelationshipPanelData: getNpcRelationshipPanelData(page.accumulatedNpcRelationships),
    npcAgendaPanelData: getNpcAgendaPanelData(page.accumulatedNpcAgendas),
    knowledgeStatePanelData: getKnowledgeStatePanelData(page.accumulatedKnowledgeState),
    insightsThreadMeta: buildInsightsThreadMeta(page, parentPage),
    insightsPromiseMeta: buildInsightsPromiseMeta(page, parentPage),
  };
}
