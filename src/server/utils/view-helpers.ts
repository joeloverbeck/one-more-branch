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

type OpenThreadLike = {
  readonly id: string;
  readonly text: string;
  readonly threadType: string;
  readonly urgency: string;
};

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
    .map(({ thread }) => ({
      id: thread.id,
      text: thread.text,
      threadType: thread.threadType,
      urgency: thread.urgency,
      displayLabel: `(${thread.threadType}/${thread.urgency}) ${thread.text}`,
    }));
}
