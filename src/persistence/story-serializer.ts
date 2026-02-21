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
import { parseApproachVectors, parseEscalationType } from '../engine/structure-factory';
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
import type { NpcRelationship } from '../models/state/npc-relationship';
import type {
  CanonFactFileData,
  DecomposedCharacterFileData,
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
        role: beat.role,
        escalationType: beat.escalationType,
        uniqueScenarioHook: beat.uniqueScenarioHook,
        approachVectors: beat.approachVectors ? [...beat.approachVectors] : null,
      })),
    })),
    overallTheme: structure.overallTheme,
    premise: structure.premise,
    pacingBudget: structure.pacingBudget,
    generatedAt: structure.generatedAt.toISOString(),
  };
}

function fileDataToStructure(data: StoryStructureFileData): StoryStructure {
  return {
    acts: data.acts.map((act) => ({
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
        role: beat.role as BeatRole,
        escalationType: parseEscalationType(beat.escalationType),
        uniqueScenarioHook: beat.uniqueScenarioHook ?? null,
        approachVectors: parseApproachVectors(beat.approachVectors) ?? null,
      })),
    })),
    overallTheme: data.overallTheme,
    premise: data.premise,
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

function deriveInitialNpcRelationshipsFromDecomposed(
  decomposedCharacters?: DecomposedCharacterFileData[]
): { initialNpcRelationships: NpcRelationship[] } | Record<string, never> {
  if (!decomposedCharacters) return {};
  const relationships: NpcRelationship[] = [];
  for (const char of decomposedCharacters) {
    if (!char.protagonistRelationship) continue;
    relationships.push({
      npcName: char.name,
      valence: char.protagonistRelationship.valence,
      dynamic: char.protagonistRelationship.dynamic,
      history: char.protagonistRelationship.history,
      currentTension: char.protagonistRelationship.currentTension,
      leverage: char.protagonistRelationship.leverage,
    });
  }
  return relationships.length > 0 ? { initialNpcRelationships: relationships } : {};
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
    ...((data.toneFeel ?? data.toneKeywords)
      ? { toneFeel: [...(data.toneFeel ?? data.toneKeywords ?? [])] }
      : {}),
    ...((data.toneAvoid ?? data.toneAntiKeywords)
      ? { toneAvoid: [...(data.toneAvoid ?? data.toneAntiKeywords ?? [])] }
      : {}),
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
            toneFeel: data.spine.toneFeel ?? data.spine.toneKeywords ?? [],
            toneAvoid: data.spine.toneAvoid ?? data.spine.toneAntiKeywords ?? [],
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
      : deriveInitialNpcRelationshipsFromDecomposed(data.decomposedCharacters)),
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}
