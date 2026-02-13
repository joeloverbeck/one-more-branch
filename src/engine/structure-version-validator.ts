import {
  getLatestStructureVersion,
  getStructureVersion,
  Page,
  Story,
  VersionedStoryStructure,
} from '../models';
import { EngineError } from './types';

/**
 * Validates structure version consistency for first page generation.
 * Throws if story has structure but no structure versions.
 */
export function validateFirstPageStructureVersion(story: Story): void {
  if (story.structure && !getLatestStructureVersion(story)) {
    throw new EngineError(
      'Story has structure but no structure versions. This is an invalid state.',
      'INVALID_STRUCTURE_VERSION'
    );
  }
}

/**
 * Validates structure version consistency for continuation page generation.
 * Throws if story has structure but no versions, or if parent page lacks version ID.
 */
export function validateContinuationStructureVersion(story: Story, parentPage: Page): void {
  if (!story.structure) {
    return;
  }

  const latestVersion = getLatestStructureVersion(story);
  if (!latestVersion) {
    throw new EngineError(
      'Story has structure but no structure versions. This is an invalid state.',
      'INVALID_STRUCTURE_VERSION'
    );
  }

  if (!parentPage.structureVersionId) {
    throw new EngineError(
      `Parent page ${parentPage.id} has null structureVersionId but story has structure. ` +
        'All pages in structured stories must have a valid structureVersionId.',
      'INVALID_STRUCTURE_VERSION'
    );
  }
}

/**
 * Resolves the active structure version for continuation generation.
 * Uses parent page's version for branch isolation, with fallback to latest.
 */
export function resolveActiveStructureVersion(
  story: Story,
  parentPage: Page
): VersionedStoryStructure | null {
  if (!parentPage.structureVersionId) {
    return null;
  }

  return (
    getStructureVersion(story, parentPage.structureVersionId) ?? getLatestStructureVersion(story)
  );
}
