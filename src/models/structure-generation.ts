import type { NpcAgenda } from './state/npc-agenda.js';
import type { AnchorMoments } from './story-arc.js';

export interface GeneratedMilestone {
  name: string;
  description: string;
  objective: string;
  causalLink: string;
  exitCondition: string;
  role: string;
  escalationType?: string | null;
  secondaryEscalationType?: string | null;
  crisisType?: string | null;
  expectedGapMagnitude?: string | null;
  isMidpoint?: boolean;
  midpointType?: string | null;
  uniqueScenarioHook?: string | null;
  approachVectors?: string[] | null;
  setpieceSourceIndex?: number | null;
  obligatorySceneTag?: string | null;
}

export interface GeneratedAct {
  name: string;
  objective: string;
  stakes: string;
  entryCondition: string;
  actQuestion: string;
  exitReversal: string;
  promiseTargets: string[];
  obligationTargets: string[];
  milestones: GeneratedMilestone[];
}

export interface MacroAct {
  name: string;
  objective: string;
  stakes: string;
  entryCondition: string;
  actQuestion: string;
  exitReversal: string;
  promiseTargets: string[];
  obligationTargets: string[];
}

export interface MacroArchitectureResult {
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  anchorMoments: AnchorMoments;
  acts: MacroAct[];
  initialNpcAgendas?: NpcAgenda[];
  rawResponse: string;
}

export interface StructureGenerationResult {
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  anchorMoments: AnchorMoments;
  acts: GeneratedAct[];
  initialNpcAgendas?: NpcAgenda[];
  rawResponse: string;
}
