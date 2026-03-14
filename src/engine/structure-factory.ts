import type { StoryAct, StoryStructure } from '../models/story-arc';
import {
  materializeStoryMilestone,
  normalizeAnchorMoments,
  normalizeStructureActFields,
} from '../models/story-structure-normalization';
import type { StructureGenerationResult } from './structure-types';

export {
  parseApproachVectors,
  parseCrisisType,
  parseEscalationType,
  parseGapMagnitude,
  parseMidpointType,
} from '../models/story-structure-normalization';

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to milestones (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(result: StructureGenerationResult): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const milestones = actData.milestones.map((milestoneData, milestoneIndex) => {
      const milestoneId = `${actId}.${milestoneIndex + 1}`;
      return materializeStoryMilestone(
        {
          id: milestoneId,
          name: milestoneData.name,
          description: milestoneData.description,
          objective: milestoneData.objective,
          causalLink: milestoneData.causalLink,
          exitCondition: milestoneData.exitCondition,
          role: milestoneData.role,
          escalationType: milestoneData.escalationType,
          secondaryEscalationType: milestoneData.secondaryEscalationType,
          crisisType: milestoneData.crisisType,
          expectedGapMagnitude: milestoneData.expectedGapMagnitude,
          isMidpoint: milestoneData.isMidpoint,
          midpointType: milestoneData.midpointType,
          uniqueScenarioHook: milestoneData.uniqueScenarioHook,
          approachVectors: milestoneData.approachVectors,
          setpieceSourceIndex: milestoneData.setpieceSourceIndex,
          obligatorySceneTag: milestoneData.obligatorySceneTag,
        },
        'Structure milestone'
      );
    });
    const actFields = normalizeStructureActFields(actData);

    return {
      id: actId,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      ...actFields,
      milestones,
    };
  });

  return {
    acts,
    overallTheme: result.overallTheme,
    premise: result.premise,
    openingImage: result.openingImage,
    closingImage: result.closingImage,
    pacingBudget: result.pacingBudget,
    anchorMoments: normalizeAnchorMoments(result.anchorMoments, acts.length),
    generatedAt: new Date(),
  };
}
