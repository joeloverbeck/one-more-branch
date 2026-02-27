import type { NpcAgenda } from './state/npc-agenda.js';

export interface GeneratedBeat {
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
}

export interface GeneratedAct {
  name: string;
  objective: string;
  stakes: string;
  entryCondition: string;
  beats: GeneratedBeat[];
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
