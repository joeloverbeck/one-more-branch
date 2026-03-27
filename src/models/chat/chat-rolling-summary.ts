export interface RollingSummaryOutput {
  readonly compressedSummary: string;
  readonly keyCommitments: readonly string[];
  readonly keyRevelations: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly leverageShifts: readonly string[];
  readonly emotionalTrajectory: string;
}
