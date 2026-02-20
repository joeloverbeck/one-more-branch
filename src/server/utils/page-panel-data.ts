import type { Page } from '../../models/index.js';
import type {
  ConstraintPanelData,
  KeyedEntryPanelData,
  NpcRelationshipPanelData,
  OpenThreadPanelData,
  ThreatPanelData,
  TrackedPromisePanelData,
} from './view-helpers.js';
import {
  getConstraintPanelData,
  getKeyedEntryPanelData,
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
  readonly insightsThreadMeta: Record<string, { threadType: string; urgency: string }>;
}

export function buildInsightsThreadMeta(
  resolvedThreadMeta: Readonly<Record<string, { threadType: string; urgency: string }>>,
  openThreads: readonly { id: string; threadType: string; urgency: string }[]
): Record<string, { threadType: string; urgency: string }> {
  const meta: Record<string, { threadType: string; urgency: string }> = { ...resolvedThreadMeta };
  for (const thread of openThreads) {
    meta[thread.id] ??= { threadType: thread.threadType, urgency: thread.urgency };
  }
  return meta;
}

export function buildPagePanelData(page: Page): PagePanelData {
  return {
    openThreadPanelData: getOpenThreadPanelData(page.accumulatedActiveState.openThreads),
    threatsPanelData: getThreatPanelData(page.accumulatedActiveState.activeThreats),
    constraintsPanelData: getConstraintPanelData(page.accumulatedActiveState.activeConstraints),
    inventoryPanelData: getKeyedEntryPanelData(page.accumulatedInventory, 10),
    healthPanelData: getKeyedEntryPanelData(page.accumulatedHealth, 10),
    trackedPromisesPanelData: getTrackedPromisesPanelData(page.accumulatedPromises),
    npcRelationshipPanelData: getNpcRelationshipPanelData(page.accumulatedNpcRelationships),
    insightsThreadMeta: buildInsightsThreadMeta(
      page.resolvedThreadMeta ?? {},
      page.accumulatedActiveState.openThreads
    ),
  };
}
