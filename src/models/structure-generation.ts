import type { NpcAgenda } from './state/npc-agenda.js';

export interface GeneratedMilestone {
  name: string;
  description: string;
  objective: string;
  causalLink: string;
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
  milestones: GeneratedMilestone[];
}

export interface StructureGenerationResult {
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  acts: GeneratedAct[];
  initialNpcAgendas?: NpcAgenda[];
  rawResponse: string;
}
