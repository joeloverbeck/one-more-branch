import type { Page, Story, StoryAct } from '../../models/index.js';
import { getCurrentAct, getCurrentBeat, getStructureVersion, Urgency } from '../../models/index.js';

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
  if (urgency in URGENCY_PRIORITY) {
    return URGENCY_PRIORITY[urgency as Urgency];
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
    if (thread.urgency === Urgency.HIGH) {
      hiddenHigh += 1;
      continue;
    }
    if (thread.urgency === Urgency.MEDIUM) {
      hiddenMedium += 1;
      continue;
    }
    if (thread.urgency === Urgency.LOW) {
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
    page.accumulatedStructureState,
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

export function getOpenThreadPanelRows(openThreads: readonly OpenThreadLike[]): OpenThreadPanelRow[] {
  return getSortedThreads(openThreads).slice(0, OPEN_THREAD_PANEL_LIMIT).map(thread => ({
      id: thread.id,
      text: thread.text,
      threadType: thread.threadType,
      urgency: thread.urgency,
      displayLabel: `(${thread.threadType}/${thread.urgency}) ${thread.text}`,
    }));
}

export function getOpenThreadPanelData(openThreads: readonly OpenThreadLike[]): OpenThreadPanelData {
  const sortedThreads = getSortedThreads(openThreads);
  const visibleRows = sortedThreads.slice(0, OPEN_THREAD_PANEL_LIMIT).map(thread => ({
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
