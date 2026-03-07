import { ChoiceType, PrimaryDelta } from '../models/choice-enums.js';

export interface ChoiceGeneratorResult {
  choices: Array<{ text: string; choiceType: ChoiceType; primaryDelta: PrimaryDelta }>;
  rawResponse: string;
}
