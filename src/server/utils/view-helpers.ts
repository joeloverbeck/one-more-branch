import type { Page, Story, StoryAct } from '../../models/index.js';
import { getCurrentAct, getCurrentBeat, getStructureVersion } from '../../models/index.js';

export interface ActDisplayInfo {
  readonly actNumber: number;
  readonly actName: string;
  readonly beatId: string;
  readonly beatName: string;
  readonly displayString: string;
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
