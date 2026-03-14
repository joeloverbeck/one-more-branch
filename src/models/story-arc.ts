export type MilestoneStatus = 'pending' | 'active' | 'concluded';

export const MILESTONE_ROLES = [
  'setup',
  'escalation',
  'turning_point',
  'reflection',
  'resolution',
] as const;

export type MilestoneRole = (typeof MILESTONE_ROLES)[number];

export const ESCALATION_TYPES = [
  'THREAT_ESCALATION',
  'REVELATION_SHIFT',
  'REVERSAL_OF_FORTUNE',
  'BETRAYAL_OR_ALLIANCE_SHIFT',
  'RESOURCE_OR_CAPABILITY_LOSS',
  'MORAL_OR_ETHICAL_PRESSURE',
  'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE',
  'COMPLICATION_CASCADE',
  'COMPETENCE_DEMAND_SPIKE',
] as const;

export type EscalationType = (typeof ESCALATION_TYPES)[number];

export const CRISIS_TYPES = ['BEST_BAD_CHOICE', 'IRRECONCILABLE_GOODS'] as const;

export type CrisisType = (typeof CRISIS_TYPES)[number];

export const MIDPOINT_TYPES = ['FALSE_VICTORY', 'FALSE_DEFEAT'] as const;

export type MidpointType = (typeof MIDPOINT_TYPES)[number];

export const GAP_MAGNITUDES = ['NARROW', 'MODERATE', 'WIDE', 'CHASM'] as const;

export type GapMagnitude = (typeof GAP_MAGNITUDES)[number];

export const APPROACH_VECTORS = [
  'DIRECT_FORCE',
  'SWIFT_ACTION',
  'STEALTH_SUBTERFUGE',
  'ANALYTICAL_REASONING',
  'CAREFUL_OBSERVATION',
  'INTUITIVE_LEAP',
  'PERSUASION_INFLUENCE',
  'EMPATHIC_CONNECTION',
  'ENDURANCE_RESILIENCE',
  'SELF_EXPRESSION',
] as const;

export type ApproachVector = (typeof APPROACH_VECTORS)[number];

export interface StoryMilestone {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly causalLink: string;
  readonly role: MilestoneRole;
  readonly escalationType: EscalationType | null;
  readonly secondaryEscalationType: EscalationType | null;
  readonly crisisType: CrisisType | null;
  readonly expectedGapMagnitude: GapMagnitude | null;
  readonly isMidpoint: boolean;
  readonly midpointType: MidpointType | null;
  readonly uniqueScenarioHook: string | null;
  readonly approachVectors: readonly ApproachVector[] | null;
  readonly setpieceSourceIndex: number | null;
  readonly obligatorySceneTag: string | null;
}

export interface StoryAct {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly stakes: string;
  readonly entryCondition: string;
  readonly milestones: readonly StoryMilestone[];
}

export interface PacingBudget {
  readonly targetPagesMin: number;
  readonly targetPagesMax: number;
}

export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string;
  readonly premise: string;
  readonly openingImage: string;
  readonly closingImage: string;
  readonly pacingBudget: PacingBudget;
  readonly generatedAt: Date;
}

export interface MilestoneProgression {
  readonly milestoneId: string;
  readonly status: MilestoneStatus;
  readonly resolution?: string;
}

export interface AccumulatedStructureState {
  readonly currentActIndex: number;
  readonly currentMilestoneIndex: number;
  readonly milestoneProgressions: readonly MilestoneProgression[];
  readonly pagesInCurrentMilestone: number;
  readonly pacingNudge: string | null;
}

export function createEmptyAccumulatedStructureState(): AccumulatedStructureState {
  return {
    currentActIndex: 0,
    currentMilestoneIndex: 0,
    milestoneProgressions: [],
    pagesInCurrentMilestone: 0,
    pacingNudge: null,
  };
}

/**
 * Creates initial AccumulatedStructureState for first page.
 * Sets first milestone of first act as 'active', all others 'pending'.
 */
export function createInitialStructureState(structure: StoryStructure): AccumulatedStructureState {
  const milestoneProgressions: MilestoneProgression[] = [];

  structure.acts.forEach((act, actIdx) => {
    act.milestones.forEach((milestone, milestoneIdx) => {
      const isFirst = actIdx === 0 && milestoneIdx === 0;
      milestoneProgressions.push({
        milestoneId: milestone.id,
        status: isFirst ? 'active' : 'pending',
      });
    });
  });

  return {
    currentActIndex: 0,
    currentMilestoneIndex: 0,
    milestoneProgressions,
    pagesInCurrentMilestone: 0,
    pacingNudge: null,
  };
}

export function getCurrentAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): StoryAct | undefined {
  return structure.acts[state.currentActIndex];
}

export function getCurrentMilestone(
  structure: StoryStructure,
  state: AccumulatedStructureState
): StoryMilestone | undefined {
  return getCurrentAct(structure, state)?.milestones[state.currentMilestoneIndex];
}

export function getMilestoneProgression(
  state: AccumulatedStructureState,
  milestoneId: string
): MilestoneProgression | undefined {
  return state.milestoneProgressions.find(
    (milestoneProgression) => milestoneProgression.milestoneId === milestoneId
  );
}

export function isLastMilestoneOfAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): boolean {
  const currentAct = getCurrentAct(structure, state);
  if (!currentAct || currentAct.milestones.length === 0) {
    return false;
  }

  return state.currentMilestoneIndex === currentAct.milestones.length - 1;
}

export function isLastAct(structure: StoryStructure, state: AccumulatedStructureState): boolean {
  if (structure.acts.length === 0) {
    return false;
  }

  return state.currentActIndex === structure.acts.length - 1;
}

export interface MilestoneDeviation {
  readonly detected: true;
  readonly reason: string;
  readonly invalidatedMilestoneIds: readonly string[];
  readonly sceneSummary: string;
}

export interface NoDeviation {
  readonly detected: false;
}

export type DeviationResult = MilestoneDeviation | NoDeviation;

export function isDeviation(result: DeviationResult): result is MilestoneDeviation {
  return result.detected === true;
}

export function isNoDeviation(result: DeviationResult): result is NoDeviation {
  return result.detected === false;
}

export function createMilestoneDeviation(
  reason: string,
  invalidatedMilestoneIds: readonly string[],
  sceneSummary: string
): MilestoneDeviation {
  if (invalidatedMilestoneIds.length === 0) {
    throw new Error('MilestoneDeviation must have at least one invalidated milestone ID');
  }

  return {
    detected: true,
    reason,
    invalidatedMilestoneIds,
    sceneSummary,
  };
}

export function createNoDeviation(): NoDeviation {
  return { detected: false };
}

export function validateDeviationTargets(
  deviation: MilestoneDeviation,
  structureState: AccumulatedStructureState
): boolean {
  const concludedIds = new Set(
    structureState.milestoneProgressions
      .filter((milestoneProgression) => milestoneProgression.status === 'concluded')
      .map((milestoneProgression) => milestoneProgression.milestoneId)
  );

  return deviation.invalidatedMilestoneIds.every((milestoneId) => !concludedIds.has(milestoneId));
}
