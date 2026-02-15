import type { Page, Story, StoryAct } from '../../models/index.js';
import type { TrackedPromise } from '../../models/state/index.js';
import type { AccumulatedNpcRelationships } from '../../models/state/npc-relationship.js';
import {
  ConstraintType,
  getCurrentAct,
  getCurrentBeat,
  getStructureVersion,
  ThreatType,
  isUrgency,
  Urgency,
} from '../../models/index.js';

export interface ActDisplayInfo {
  readonly actNumber: number;
  readonly actName: string;
  readonly beatId: string;
  readonly beatName: string;
  readonly displayString: string;
}

export interface OpenThreadPanelRow {
  readonly id: string;
  readonly text: string;
  readonly threadType: string;
  readonly urgency: string;
  readonly displayLabel: string;
}

export interface OpenThreadPanelData {
  readonly rows: OpenThreadPanelRow[];
  readonly overflowSummary: string | null;
}

type OpenThreadLike = {
  readonly id: string;
  readonly text: string;
  readonly threadType: string;
  readonly urgency: string;
};

const OPEN_THREAD_PANEL_LIMIT = 6;

const URGENCY_PRIORITY: Record<Urgency, number> = {
  [Urgency.HIGH]: 0,
  [Urgency.MEDIUM]: 1,
  [Urgency.LOW]: 2,
};

function getUrgencyPriority(urgency: string): number {
  if (isUrgency(urgency)) {
    return URGENCY_PRIORITY[urgency];
  }

  return 3;
}

function getSortedThreads(openThreads: readonly OpenThreadLike[]): OpenThreadLike[] {
  return openThreads
    .map((thread, index) => ({ thread, index }))
    .sort((left, right) => {
      const urgencyDelta =
        getUrgencyPriority(left.thread.urgency) - getUrgencyPriority(right.thread.urgency);
      if (urgencyDelta !== 0) {
        return urgencyDelta;
      }

      return left.index - right.index;
    })
    .map(({ thread }) => thread);
}

function getOverflowSummary(hiddenThreads: readonly OpenThreadLike[]): string | null {
  if (hiddenThreads.length === 0) {
    return null;
  }

  let hiddenHigh = 0;
  let hiddenMedium = 0;
  let hiddenLow = 0;

  for (const thread of hiddenThreads) {
    const urgency = isUrgency(thread.urgency) ? thread.urgency : null;
    if (urgency === Urgency.HIGH) {
      hiddenHigh += 1;
      continue;
    }
    if (urgency === Urgency.MEDIUM) {
      hiddenMedium += 1;
      continue;
    }
    if (urgency === Urgency.LOW) {
      hiddenLow += 1;
    }
  }

  const hiddenParts: string[] = [];
  if (hiddenHigh > 0) hiddenParts.push(`${hiddenHigh} (high)`);
  if (hiddenMedium > 0) hiddenParts.push(`${hiddenMedium} (medium)`);
  if (hiddenLow > 0) hiddenParts.push(`${hiddenLow} (low)`);

  if (hiddenParts.length === 0) {
    return null;
  }

  return `Not shown: ${hiddenParts.join(', ')}`;
}

function extractActNumber(actId: string, fallbackIndex: number): number {
  const match = actId.match(/^act-(\d+)$/);
  return match?.[1] ? parseInt(match[1], 10) : fallbackIndex + 1;
}

export function getActDisplayInfo(story: Story, page: Page): ActDisplayInfo | null {
  if (!page.structureVersionId) return null;

  const versions = story.structureVersions;
  if (!versions?.length) return null;

  const structureVersion = getStructureVersion(story, page.structureVersionId);
  if (!structureVersion) return null;

  const currentAct: StoryAct | undefined = getCurrentAct(
    structureVersion.structure,
    page.accumulatedStructureState
  );
  if (!currentAct) return null;

  const actNumber = extractActNumber(currentAct.id, page.accumulatedStructureState.currentActIndex);
  const currentBeat = getCurrentBeat(structureVersion.structure, page.accumulatedStructureState);
  if (!currentBeat) return null;

  return {
    actNumber,
    actName: currentAct.name,
    beatId: currentBeat.id,
    beatName: currentBeat.name,
    displayString: `Act ${actNumber}: ${currentAct.name} - Beat ${currentBeat.id}: ${currentBeat.name}`,
  };
}

export function getOpenThreadPanelRows(
  openThreads: readonly OpenThreadLike[]
): OpenThreadPanelRow[] {
  return getSortedThreads(openThreads)
    .slice(0, OPEN_THREAD_PANEL_LIMIT)
    .map((thread) => ({
      id: thread.id,
      text: thread.text,
      threadType: thread.threadType,
      urgency: thread.urgency,
      displayLabel: `(${thread.threadType}/${thread.urgency}) ${thread.text}`,
    }));
}

export interface KeyedEntryPanelRow {
  readonly id: string;
  readonly text: string;
}

export interface KeyedEntryPanelData {
  readonly rows: readonly KeyedEntryPanelRow[];
  readonly overflowSummary: string | null;
}

export interface ThreatPanelRow extends KeyedEntryPanelRow {
  readonly threatType: ThreatType;
  readonly displayLabel: string;
}

export interface ThreatPanelData {
  readonly rows: readonly ThreatPanelRow[];
  readonly overflowSummary: string | null;
}

export interface ConstraintPanelRow extends KeyedEntryPanelRow {
  readonly constraintType: ConstraintType;
  readonly displayLabel: string;
}

export interface ConstraintPanelData {
  readonly rows: readonly ConstraintPanelRow[];
  readonly overflowSummary: string | null;
}

const KEYED_ENTRY_PANEL_LIMIT = 6;

export function getKeyedEntryPanelData(
  entries: readonly { readonly id: string; readonly text: string }[],
  limit: number = KEYED_ENTRY_PANEL_LIMIT
): KeyedEntryPanelData {
  const visibleRows: KeyedEntryPanelRow[] = entries.slice(0, limit).map((entry) => ({
    id: entry.id,
    text: entry.text,
  }));
  const hiddenCount = entries.length - limit;
  return {
    rows: visibleRows,
    overflowSummary: hiddenCount > 0 ? `+${hiddenCount} more not shown` : null,
  };
}

export function getThreatPanelData(
  entries: readonly { readonly id: string; readonly text: string; readonly threatType: ThreatType }[],
  limit: number = KEYED_ENTRY_PANEL_LIMIT
): ThreatPanelData {
  const visibleRows: ThreatPanelRow[] = entries.slice(0, limit).map((entry) => ({
    id: entry.id,
    text: entry.text,
    threatType: entry.threatType,
    displayLabel: `(${entry.threatType}) ${entry.text}`,
  }));
  const hiddenCount = entries.length - limit;
  return {
    rows: visibleRows,
    overflowSummary: hiddenCount > 0 ? `+${hiddenCount} more not shown` : null,
  };
}

export function getConstraintPanelData(
  entries: readonly {
    readonly id: string;
    readonly text: string;
    readonly constraintType: ConstraintType;
  }[],
  limit: number = KEYED_ENTRY_PANEL_LIMIT
): ConstraintPanelData {
  const visibleRows: ConstraintPanelRow[] = entries.slice(0, limit).map((entry) => ({
    id: entry.id,
    text: entry.text,
    constraintType: entry.constraintType,
    displayLabel: `(${entry.constraintType}) ${entry.text}`,
  }));
  const hiddenCount = entries.length - limit;
  return {
    rows: visibleRows,
    overflowSummary: hiddenCount > 0 ? `+${hiddenCount} more not shown` : null,
  };
}

export function getOpenThreadPanelData(
  openThreads: readonly OpenThreadLike[]
): OpenThreadPanelData {
  const sortedThreads = getSortedThreads(openThreads);
  const visibleRows = sortedThreads.slice(0, OPEN_THREAD_PANEL_LIMIT).map((thread) => ({
    id: thread.id,
    text: thread.text,
    threadType: thread.threadType,
    urgency: thread.urgency,
    displayLabel: `(${thread.threadType}/${thread.urgency}) ${thread.text}`,
  }));
  const hiddenThreads = sortedThreads.slice(OPEN_THREAD_PANEL_LIMIT);

  return {
    rows: visibleRows,
    overflowSummary: getOverflowSummary(hiddenThreads),
  };
}

export interface TrackedPromisePanelRow {
  readonly id: string;
  readonly text: string;
  readonly promiseType: string;
  readonly suggestedUrgency: string;
  readonly age: number;
  readonly displayLabel: string;
}

export interface TrackedPromisePanelData {
  readonly rows: readonly TrackedPromisePanelRow[];
  readonly overflowSummary: string | null;
}

export function getTrackedPromisesPanelData(
  promises: readonly TrackedPromise[],
  limit: number = KEYED_ENTRY_PANEL_LIMIT
): TrackedPromisePanelData {
  const sorted = [...promises]
    .map((p, index) => ({ promise: p, index }))
    .sort((left, right) => {
      const urgencyDelta =
        getUrgencyPriority(left.promise.suggestedUrgency) -
        getUrgencyPriority(right.promise.suggestedUrgency);
      if (urgencyDelta !== 0) {
        return urgencyDelta;
      }
      return left.index - right.index;
    })
    .map(({ promise }) => promise);

  const visible = sorted.slice(0, limit);
  const hidden = sorted.slice(limit);

  const visibleRows: TrackedPromisePanelRow[] = visible.map((p) => ({
    id: p.id,
    text: p.description,
    promiseType: p.promiseType,
    suggestedUrgency: p.suggestedUrgency,
    age: p.age,
    displayLabel: `(${p.promiseType}/${p.suggestedUrgency}) ${p.description}`,
  }));

  const overflowSummary = getOverflowSummary(
    hidden.map((p) => ({
      id: p.id,
      text: p.description,
      threadType: p.promiseType,
      urgency: p.suggestedUrgency,
    }))
  );

  return {
    rows: visibleRows,
    overflowSummary,
  };
}

export interface NpcRelationshipPanelRow {
  readonly npcName: string;
  readonly valence: number;
  readonly dynamic: string;
  readonly history: string;
  readonly currentTension: string;
  readonly leverage: string;
  readonly valencePercent: number;
}

export interface NpcRelationshipPanelData {
  readonly rows: readonly NpcRelationshipPanelRow[];
}

export function getNpcRelationshipPanelData(
  relationships: AccumulatedNpcRelationships
): NpcRelationshipPanelData {
  const entries = Object.values(relationships);
  if (entries.length === 0) {
    return { rows: [] };
  }

  const rows: NpcRelationshipPanelRow[] = entries.map((rel) => ({
    npcName: rel.npcName,
    valence: rel.valence,
    dynamic: rel.dynamic,
    history: rel.history,
    currentTension: rel.currentTension,
    leverage: rel.leverage,
    valencePercent: ((rel.valence + 5) / 10) * 100,
  }));

  return { rows };
}
