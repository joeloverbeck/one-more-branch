export type WorldbuildingDevStage = 1 | 2;

export const WORLDBUILDING_STAGE_NAMES: Record<WorldbuildingDevStage, string> = {
  1: 'World Seed',
  2: 'World Elaboration',
};

export interface WorldbuildingPipelineInputs {
  readonly userNotes?: string;
  readonly contentPreferences?: string;
  readonly startingSituation?: string;
  readonly tone?: string;
}
