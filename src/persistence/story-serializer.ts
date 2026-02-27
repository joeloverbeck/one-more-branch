/**
 * Story serialization/deserialization logic.
 * Converts between in-memory Story models and the JSON file format.
 */

import {
  BeatRole,
  Story,
  StoryStructure,
  VersionedStoryStructure,
  parsePageId,
  parseStoryId,
  parseStructureVersionId,
} from '../models';
import {
  parseApproachVectors,
  parseCrisisType,
  parseEscalationType,
  parseGapMagnitude,
  parseMidpointType,
} from '../engine/structure-factory';
import { isGenreObligationTag } from '../models/genre-obligations';
import type { CanonFact } from '../models/state/canon';
import type { DecomposedCharacter } from '../models/decomposed-character';
import type { DecomposedWorld, WorldFactDomain, WorldFactType } from '../models/decomposed-world';
import type {
  StorySpine,
  StorySpineType,
  ConflictType,
  CharacterArcType,
  NeedWantDynamic,
} from '../models/story-spine';
import { isConflictAxis } from '../models/story-spine';
import type {
  CanonFactFileData,
  StoryFileData,
  StoryStructureFileData,
  VersionedStoryStructureFileData,
} from './story-serializer-types';

export type { StoryFileData } from './story-serializer-types';

const VALID_WORLD_FACT_TYPES: ReadonlySet<string> = new Set([
  'LAW',
  'NORM',
  'BELIEF',
  'DISPUTED',
  'RUMOR',
  'MYSTERY',
]);

function parsePersistedCausalLink(value: unknown, beatId: string): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  throw new Error(`Persisted story beat ${beatId} is missing required causalLink`);
}

function structureToFileData(structure: StoryStructure): StoryStructureFileData {
  return {
    acts: structure.acts.map((act) => ({
      id: act.id,
      name: act.name,
      objective: act.objective,
      stakes: act.stakes,
      entryCondition: act.entryCondition,
      beats: act.beats.map((beat) => ({
        id: beat.id,
        name: beat.name,
        description: beat.description,
        objective: beat.objective,
        causalLink: beat.causalLink,
        role: beat.role,
        escalationType: beat.escalationType,
        secondaryEscalationType: beat.secondaryEscalationType,
        crisisType: beat.crisisType,
        expectedGapMagnitude: beat.expectedGapMagnitude,
        isMidpoint: beat.isMidpoint === true,
        midpointType: parseMidpointType(beat.midpointType) ?? null,
        uniqueScenarioHook: beat.uniqueScenarioHook,
        approachVectors: beat.approachVectors ? [...beat.approachVectors] : null,
        setpieceSourceIndex: beat.setpieceSourceIndex,
        obligatorySceneTag: beat.obligatorySceneTag,
      })),
    })),
    overallTheme: structure.overallTheme,
    premise: structure.premise,
    openingImage: structure.openingImage,
    closingImage: structure.closingImage,
    pacingBudget: structure.pacingBudget,
    generatedAt: structure.generatedAt.toISOString(),
  };
}

function fileDataToStructure(data: StoryStructureFileData): StoryStructure {
  const acts = data.acts.map((act) => ({
    id: act.id,
    name: act.name,
    objective: act.objective,
    stakes: act.stakes,
    entryCondition: act.entryCondition,
    beats: act.beats.map((beat) => {
      const midpointType = parseMidpointType(beat.midpointType);
      const isMidpoint = beat.isMidpoint === true;
      if (isMidpoint) {
        if (midpointType === null) {
          throw new Error(
            `Persisted story beat ${beat.id} is midpoint-tagged but missing midpointType`
          );
        }
      } else if (midpointType !== null) {
        throw new Error(`Persisted story beat ${beat.id} has midpointType but isMidpoint is false`);
      }

      return {
        id: beat.id,
        name: beat.name,
        description: beat.description,
        objective: beat.objective,
        causalLink: parsePersistedCausalLink(beat.causalLink, beat.id),
        role: beat.role as BeatRole,
        escalationType: parseEscalationType(beat.escalationType),
        secondaryEscalationType: parseEscalationType(beat.secondaryEscalationType),
        crisisType: parseCrisisType(beat.crisisType),
        expectedGapMagnitude: parseGapMagnitude(beat.expectedGapMagnitude),
        isMidpoint,
        midpointType,
        uniqueScenarioHook: beat.uniqueScenarioHook ?? null,
        approachVectors: parseApproachVectors(beat.approachVectors) ?? null,
        setpieceSourceIndex:
          typeof beat.setpieceSourceIndex === 'number' &&
          Number.isInteger(beat.setpieceSourceIndex) &&
          beat.setpieceSourceIndex >= 0 &&
          beat.setpieceSourceIndex <= 5
            ? beat.setpieceSourceIndex
            : null,
        obligatorySceneTag: isGenreObligationTag(beat.obligatorySceneTag)
          ? beat.obligatorySceneTag
          : null,
      };
    }),
  }));

  return {
    acts,
    overallTheme: data.overallTheme,
    premise: data.premise,
    openingImage: data.openingImage,
    closingImage: data.closingImage,
    pacingBudget: data.pacingBudget,
    generatedAt: new Date(data.generatedAt),
  };
}

function versionedStructureToFileData(
  version: VersionedStoryStructure
): VersionedStoryStructureFileData {
  return {
    id: version.id,
    structure: structureToFileData(version.structure),
    previousVersionId: version.previousVersionId,
    createdAtPageId: version.createdAtPageId,
    rewriteReason: version.rewriteReason,
    preservedBeatIds: [...version.preservedBeatIds],
    createdAt: version.createdAt.toISOString(),
  };
}

function fileDataToVersionedStructure(
  data: VersionedStoryStructureFileData
): VersionedStoryStructure {
  return {
    id: parseStructureVersionId(data.id),
    structure: fileDataToStructure(data.structure),
    previousVersionId:
      data.previousVersionId === null ? null : parseStructureVersionId(data.previousVersionId),
    createdAtPageId: data.createdAtPageId === null ? null : parsePageId(data.createdAtPageId),
    rewriteReason: data.rewriteReason,
    preservedBeatIds: [...data.preservedBeatIds],
    createdAt: new Date(data.createdAt),
  };
}

function deserializeCanonFact(raw: CanonFactFileData): CanonFact {
  const factType =
    raw.factType && VALID_WORLD_FACT_TYPES.has(raw.factType)
      ? (raw.factType as WorldFactType)
      : ('NORM' as WorldFactType);
  return { text: raw.text, factType };
}

export function serializeStory(story: Story): StoryFileData {
  const globalCharacterCanon: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(story.globalCharacterCanon)) {
    globalCharacterCanon[name] = [...facts];
  }

  return {
    id: story.id,
    title: story.title,
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    ...(story.toneFeel ? { toneFeel: [...story.toneFeel] } : {}),
    ...(story.toneAvoid ? { toneAvoid: [...story.toneAvoid] } : {}),
    npcs: story.npcs
      ? story.npcs.map((npc) => ({ name: npc.name, description: npc.description }))
      : null,
    startingSituation: story.startingSituation ?? null,
    globalCanon: story.globalCanon.map(
      (fact): CanonFactFileData => ({ text: fact.text, factType: fact.factType })
    ),
    globalCharacterCanon,
    structure: story.structure ? structureToFileData(story.structure) : null,
    structureVersions: (story.structureVersions ?? []).map(versionedStructureToFileData),
    ...(story.spine
      ? {
          spine: {
            centralDramaticQuestion: story.spine.centralDramaticQuestion,
            protagonistNeedVsWant: {
              need: story.spine.protagonistNeedVsWant.need,
              want: story.spine.protagonistNeedVsWant.want,
              dynamic: story.spine.protagonistNeedVsWant.dynamic,
            },
            primaryAntagonisticForce: {
              description: story.spine.primaryAntagonisticForce.description,
              pressureMechanism: story.spine.primaryAntagonisticForce.pressureMechanism,
            },
            storySpineType: story.spine.storySpineType,
            conflictAxis: story.spine.conflictAxis,
            conflictType: story.spine.conflictType,
            characterArcType: story.spine.characterArcType,
            toneFeel: [...story.spine.toneFeel],
            toneAvoid: [...story.spine.toneAvoid],
          },
        }
      : {}),
    ...(story.conceptSpec
      ? {
          conceptSpec: {
            ...story.conceptSpec,
            actionVerbs: [...story.conceptSpec.actionVerbs],
            settingAxioms: [...story.conceptSpec.settingAxioms],
            constraintSet: [...story.conceptSpec.constraintSet],
            keyInstitutions: [...story.conceptSpec.keyInstitutions],
          },
        }
      : {}),
    premisePromises: [...(story.premisePromises ?? [])],
    ...(story.decomposedCharacters
      ? {
          decomposedCharacters: story.decomposedCharacters.map((char) => ({
            name: char.name,
            speechFingerprint: {
              catchphrases: [...char.speechFingerprint.catchphrases],
              vocabularyProfile: char.speechFingerprint.vocabularyProfile,
              sentencePatterns: char.speechFingerprint.sentencePatterns,
              verbalTics: [...char.speechFingerprint.verbalTics],
              dialogueSamples: [...char.speechFingerprint.dialogueSamples],
              metaphorFrames: char.speechFingerprint.metaphorFrames,
              antiExamples: [...char.speechFingerprint.antiExamples],
              discourseMarkers: [...char.speechFingerprint.discourseMarkers],
              registerShifts: char.speechFingerprint.registerShifts,
            },
            coreTraits: [...char.coreTraits],
            motivations: char.motivations,
            thematicStance: char.thematicStance,
            protagonistRelationship: char.protagonistRelationship
              ? { ...char.protagonistRelationship }
              : null,
            knowledgeBoundaries: char.knowledgeBoundaries,
            ...(char.falseBeliefs && char.falseBeliefs.length > 0
              ? { falseBeliefs: [...char.falseBeliefs] }
              : {}),
            ...(char.secretsKept && char.secretsKept.length > 0
              ? { secretsKept: [...char.secretsKept] }
              : {}),
            decisionPattern: char.decisionPattern,
            coreBeliefs: [...char.coreBeliefs],
            conflictPriority: char.conflictPriority,
            appearance: char.appearance,
            rawDescription: char.rawDescription,
          })),
        }
      : {}),
    ...(story.decomposedWorld
      ? {
          decomposedWorld: {
            facts: story.decomposedWorld.facts.map((f) => ({
              domain: f.domain,
              fact: f.fact,
              scope: f.scope,
              ...(f.factType ? { factType: f.factType } : {}),
            })),
            rawWorldbuilding: story.decomposedWorld.rawWorldbuilding,
          },
        }
      : {}),
    ...(story.initialNpcAgendas && story.initialNpcAgendas.length > 0
      ? {
          initialNpcAgendas: story.initialNpcAgendas.map((a) => ({
            npcName: a.npcName,
            currentGoal: a.currentGoal,
            leverage: a.leverage,
            fear: a.fear,
            offScreenBehavior: a.offScreenBehavior,
          })),
        }
      : {}),
    ...(story.initialNpcRelationships && story.initialNpcRelationships.length > 0
      ? {
          initialNpcRelationships: story.initialNpcRelationships.map((r) => ({
            npcName: r.npcName,
            valence: r.valence,
            dynamic: r.dynamic,
            history: r.history,
            currentTension: r.currentTension,
            leverage: r.leverage,
          })),
        }
      : {}),
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

export function deserializeStory(data: StoryFileData): Story {
  const globalCharacterCanon: Record<string, readonly string[]> = {};
  for (const [name, facts] of Object.entries(data.globalCharacterCanon)) {
    globalCharacterCanon[name] = [...facts];
  }

  const structureVersions = data.structureVersions.map(fileDataToVersionedStructure);

  return {
    id: parseStoryId(data.id),
    title: data.title,
    characterConcept: data.characterConcept,
    worldbuilding: data.worldbuilding,
    tone: data.tone,
    ...(data.toneFeel ? { toneFeel: [...data.toneFeel] } : {}),
    ...(data.toneAvoid ? { toneAvoid: [...data.toneAvoid] } : {}),
    ...(data.npcs !== null && data.npcs.length > 0
      ? { npcs: data.npcs.map((npc) => ({ name: npc.name, description: npc.description })) }
      : {}),
    ...(data.startingSituation !== null ? { startingSituation: data.startingSituation } : {}),
    globalCanon: data.globalCanon.map(deserializeCanonFact),
    globalCharacterCanon,
    structure: data.structure ? fileDataToStructure(data.structure) : null,
    structureVersions,
    ...(data.spine
      ? {
          spine: {
            centralDramaticQuestion: data.spine.centralDramaticQuestion,
            protagonistNeedVsWant: {
              need: data.spine.protagonistNeedVsWant.need,
              want: data.spine.protagonistNeedVsWant.want,
              dynamic: data.spine.protagonistNeedVsWant.dynamic as NeedWantDynamic,
            },
            primaryAntagonisticForce: {
              description: data.spine.primaryAntagonisticForce.description,
              pressureMechanism: data.spine.primaryAntagonisticForce.pressureMechanism,
            },
            storySpineType: data.spine.storySpineType as StorySpineType,
            conflictAxis: isConflictAxis(data.spine.conflictAxis)
              ? data.spine.conflictAxis
              : (data.conceptSpec?.conflictAxis ?? 'INDIVIDUAL_VS_SYSTEM'),
            conflictType: data.spine.conflictType as ConflictType,
            characterArcType: data.spine.characterArcType as CharacterArcType,
            toneFeel: data.spine.toneFeel ?? [],
            toneAvoid: data.spine.toneAvoid ?? [],
          } as StorySpine,
        }
      : {}),
    ...(data.conceptSpec
      ? {
          conceptSpec: {
            ...data.conceptSpec,
            actionVerbs: [...data.conceptSpec.actionVerbs],
            settingAxioms: [...data.conceptSpec.settingAxioms],
            constraintSet: [...data.conceptSpec.constraintSet],
            keyInstitutions: [...data.conceptSpec.keyInstitutions],
          },
        }
      : {}),
    premisePromises: [...(data.premisePromises ?? [])],
    ...(data.decomposedCharacters
      ? {
          decomposedCharacters: data.decomposedCharacters.map(
            (char): DecomposedCharacter => ({
              name: char.name,
              speechFingerprint: {
                catchphrases: [...char.speechFingerprint.catchphrases],
                vocabularyProfile: char.speechFingerprint.vocabularyProfile,
                sentencePatterns: char.speechFingerprint.sentencePatterns,
                verbalTics: [...char.speechFingerprint.verbalTics],
                dialogueSamples: [...char.speechFingerprint.dialogueSamples],
                metaphorFrames: char.speechFingerprint.metaphorFrames,
                antiExamples: [...char.speechFingerprint.antiExamples],
                discourseMarkers: [...char.speechFingerprint.discourseMarkers],
                registerShifts: char.speechFingerprint.registerShifts,
              },
              coreTraits: [...char.coreTraits],
              motivations: char.motivations,
              thematicStance: char.thematicStance,
              protagonistRelationship: char.protagonistRelationship
                ? { ...char.protagonistRelationship }
                : null,
              knowledgeBoundaries: char.knowledgeBoundaries,
              ...(char.falseBeliefs ? { falseBeliefs: [...char.falseBeliefs] } : {}),
              ...(char.secretsKept ? { secretsKept: [...char.secretsKept] } : {}),
              decisionPattern: char.decisionPattern,
              coreBeliefs: [...char.coreBeliefs],
              conflictPriority: char.conflictPriority,
              appearance: char.appearance,
              rawDescription: char.rawDescription,
            })
          ),
        }
      : {}),
    ...(data.decomposedWorld
      ? {
          decomposedWorld: {
            facts: data.decomposedWorld.facts.map((f) => ({
              domain: f.domain as WorldFactDomain,
              fact: f.fact,
              scope: f.scope,
              ...(f.factType ? { factType: f.factType as WorldFactType } : {}),
            })),
            rawWorldbuilding: data.decomposedWorld.rawWorldbuilding,
          } as DecomposedWorld,
        }
      : {}),
    ...(data.initialNpcAgendas && data.initialNpcAgendas.length > 0
      ? { initialNpcAgendas: data.initialNpcAgendas }
      : {}),
    ...(data.initialNpcRelationships && data.initialNpcRelationships.length > 0
      ? { initialNpcRelationships: data.initialNpcRelationships }
      : {}),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}
