import { ChoiceType, ChoiceShape, PrimaryDelta } from '../models/choice-enums.js';

export interface ChoiceGeneratorResult {
  choices: Array<{
    text: string;
    choiceType: ChoiceType;
    primaryDelta: PrimaryDelta;
    choiceSubtype?: string;
    choiceShape?: ChoiceShape;
  }>;
  rawResponse: string;
}
