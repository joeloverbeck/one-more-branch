export interface WorldInvariant {
  readonly invariant: string;
  readonly consequence: string;
  readonly humanCost: string;
}

export interface PowerStructure {
  readonly holder: string;
  readonly mechanism: string;
  readonly vulnerability: string;
}

export interface CulturalFaultLine {
  readonly tension: string;
  readonly groups: readonly string[];
  readonly narrativePotential: string;
}

export interface WorldPressure {
  readonly pressure: string;
  readonly affectedGroups: readonly string[];
  readonly escalationPath: string;
  readonly storyFunction: 'EPIC' | 'EPISTEMIC' | 'DRAMATIC';
}

export interface AnchorLocation {
  readonly name: string;
  readonly publicFace: string;
  readonly hiddenPressure: string;
  readonly sensorySignature: string;
  readonly likelySceneUse: string;
}

export interface EverydayPractice {
  readonly practice: string;
  readonly whoPerformsIt: string;
  readonly socialMeaning: string;
  readonly costOfRefusal: string;
  readonly sensoryCue: string;
}

export interface PublicMystery {
  readonly mystery: string;
  readonly commonExplanation: string;
  readonly hiddenTruthHint: string;
}

export interface NamingLexicon {
  readonly personNameStyle: string;
  readonly placeNameStyle: string;
  readonly titles: readonly string[];
  readonly idioms: readonly string[];
  readonly tabooTerms: readonly string[];
}

export interface StoryVector {
  readonly vector: string;
  readonly type: 'EPIC' | 'EPISTEMIC' | 'DRAMATIC';
  readonly centralQuestion: string;
  readonly stakes: string;
  readonly likelyOpposition: string;
}

export interface SensoryPalette {
  readonly textures: readonly string[];
  readonly sounds: readonly string[];
  readonly smells: readonly string[];
  readonly colors: readonly string[];
}

export interface WorldSeed {
  readonly signatureElements: readonly string[];
  readonly invariants: readonly WorldInvariant[];
  readonly powerStructures: readonly PowerStructure[];
  readonly culturalFaultLines: readonly CulturalFaultLine[];
  readonly pressures: readonly WorldPressure[];
  readonly anchorLocations: readonly AnchorLocation[];
  readonly everydayPractices: readonly EverydayPractice[];
  readonly publicMysteries: readonly PublicMystery[];
  readonly namingLexicon: NamingLexicon;
  readonly storyVectors: readonly StoryVector[];
  readonly sensoryPalette: SensoryPalette;
}
