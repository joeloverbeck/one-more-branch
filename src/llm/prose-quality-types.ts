import type { GenreFrame } from '../models/concept-generator.js';
import type { StorySpine } from '../models/story-spine.js';

export type ThematicCharge = 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS';
export type NarrativeFocus = 'DEEPENING' | 'BROADENING' | 'BALANCED';

export interface ProseQualityResult {
  toneAdherent: boolean;
  toneDriftDescription: string;
  thematicCharge: ThematicCharge;
  thematicChargeDescription: string;
  narrativeFocus: NarrativeFocus;
}

export interface ProseQualityContext {
  readonly narrative: string;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly thematicQuestion: string;
  readonly antithesis: string;
  readonly spine?: StorySpine;
  readonly genreFrame?: GenreFrame;
}
