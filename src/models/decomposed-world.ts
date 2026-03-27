export type WorldFactDomain =
  | 'geography'
  | 'ecology'
  | 'history'
  | 'society'
  | 'culture'
  | 'religion'
  | 'governance'
  | 'economy'
  | 'faction'
  | 'technology'
  | 'magic'
  | 'language';

export type WorldFactType =
  | 'LAW'
  | 'NORM'
  | 'BELIEF'
  | 'DISPUTED'
  | 'RUMOR'
  | 'MYSTERY'
  | 'PRACTICE'
  | 'TABOO';

export type NarrativeWeight = 'LOW' | 'MEDIUM' | 'HIGH';

export type WorldStoryFunction = 'EPIC' | 'EPISTEMIC' | 'DRAMATIC' | 'ATMOSPHERIC' | 'THEMATIC';

export interface WorldFact {
  readonly id: string;
  readonly domain: WorldFactDomain;
  readonly fact: string;
  readonly scope: string;
  readonly factType?: WorldFactType;
  readonly narrativeWeight?: NarrativeWeight;
  readonly thematicTag?: string;
  readonly sensoryHook?: string;
  readonly exampleEvidence?: string;
  readonly tensionWithIds?: readonly string[];
  readonly implicationOfIds?: readonly string[];
  readonly storyFunctions?: readonly WorldStoryFunction[];
  readonly sceneAffordances?: readonly string[];
}

export interface DecomposedWorld {
  readonly worldLogline?: string;
  readonly facts: readonly WorldFact[];
  readonly openQuestions?: readonly string[];
  readonly rawWorldbuilding?: string;
}
