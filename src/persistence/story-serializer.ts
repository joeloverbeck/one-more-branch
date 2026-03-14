/**
 * Story serialization/deserialization logic.
 * Converts between in-memory Story models and the JSON file format.
 */

import {
  MilestoneRole,
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
import { isEmotionSalience, isStoryFunction } from '../models/character-enums';
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

function parsePersistedCausalLink(value: unknown, milestoneId: string): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  throw new Error(`Persisted story milestone ${milestoneId} is missing required causalLink`);
}

function structureToFileData(structure: StoryStructure): StoryStructureFileData {
  return {
    acts: structure.acts.map((act) => ({
      id: act.id,
      name: act.name,
      objective: act.objective,
      stakes: act.stakes,
      entryCondition: act.entryCondition,
      milestones: act.milestones.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        objective: milestone.objective,
        causalLink: milestone.causalLink,
        role: milestone.role,
        escalationType: milestone.escalationType,
        secondaryEscalationType: milestone.secondaryEscalationType,
        crisisType: milestone.crisisType,
        expectedGapMagnitude: milestone.expectedGapMagnitude,
        isMidpoint: milestone.isMidpoint === true,
        midpointType: parseMidpointType(milestone.midpointType) ?? null,
        uniqueScenarioHook: milestone.uniqueScenarioHook,
        approachVectors: milestone.approachVectors ? [...milestone.approachVectors] : null,
        setpieceSourceIndex: milestone.setpieceSourceIndex,
        obligatorySceneTag: milestone.obligatorySceneTag,
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
    milestones: act.milestones.map((milestone) => {
      const midpointType = parseMidpointType(milestone.midpointType);
      const isMidpoint = milestone.isMidpoint === true;
      if (isMidpoint) {
        if (midpointType === null) {
          throw new Error(
            `Persisted story milestone ${milestone.id} is midpoint-tagged but missing midpointType`
          );
        }
      } else if (midpointType !== null) {
        throw new Error(`Persisted story milestone ${milestone.id} has midpointType but isMidpoint is false`);
      }

      return {
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        objective: milestone.objective,
        causalLink: parsePersistedCausalLink(milestone.causalLink, milestone.id),
        role: milestone.role as MilestoneRole,
        escalationType: parseEscalationType(milestone.escalationType),
        secondaryEscalationType: parseEscalationType(milestone.secondaryEscalationType),
        crisisType: parseCrisisType(milestone.crisisType),
        expectedGapMagnitude: parseGapMagnitude(milestone.expectedGapMagnitude),
        isMidpoint,
        midpointType,
        uniqueScenarioHook: milestone.uniqueScenarioHook ?? null,
        approachVectors: parseApproachVectors(milestone.approachVectors) ?? null,
        setpieceSourceIndex:
          typeof milestone.setpieceSourceIndex === 'number' &&
          Number.isInteger(milestone.setpieceSourceIndex) &&
          milestone.setpieceSourceIndex >= 0 &&
          milestone.setpieceSourceIndex <= 5
            ? milestone.setpieceSourceIndex
            : null,
        obligatorySceneTag: isGenreObligationTag(milestone.obligatorySceneTag)
          ? milestone.obligatorySceneTag
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
    preservedMilestoneIds: [...version.preservedMilestoneIds],
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
    preservedMilestoneIds: [...data.preservedMilestoneIds],
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
            wantNeedCollisionPoint: story.spine.wantNeedCollisionPoint,
            protagonistDeepestFear: story.spine.protagonistDeepestFear,
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
            ...(char.superObjective ? { superObjective: char.superObjective } : {}),
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
            ...(char.stakes && char.stakes.length > 0
              ? { stakes: [...char.stakes] }
              : {}),
            ...(char.pressurePoint ? { pressurePoint: char.pressurePoint } : {}),
            ...(char.personalDilemmas && char.personalDilemmas.length > 0
              ? { personalDilemmas: [...char.personalDilemmas] }
              : {}),
            ...(char.emotionSalience ? { emotionSalience: char.emotionSalience } : {}),
            ...(char.storyFunction ? { storyFunction: char.storyFunction } : {}),
            ...(char.narrativeRole ? { narrativeRole: char.narrativeRole } : {}),
          })),
        }
      : {}),
    ...(story.decomposedWorld
      ? {
          decomposedWorld: {
            facts: story.decomposedWorld.facts.map((f) => ({
              ...(f.id ? { id: f.id } : {}),
              domain: f.domain,
              fact: f.fact,
              scope: f.scope,
              ...(f.factType ? { factType: f.factType } : {}),
              ...(f.narrativeWeight ? { narrativeWeight: f.narrativeWeight } : {}),
              ...(f.thematicTag ? { thematicTag: f.thematicTag } : {}),
              ...(f.sensoryHook ? { sensoryHook: f.sensoryHook } : {}),
              ...(f.exampleEvidence ? { exampleEvidence: f.exampleEvidence } : {}),
              ...(f.tensionWithIds && f.tensionWithIds.length > 0 ? { tensionWithIds: [...f.tensionWithIds] } : {}),
              ...(f.implicationOfIds && f.implicationOfIds.length > 0 ? { implicationOfIds: [...f.implicationOfIds] } : {}),
              ...(f.storyFunctions && f.storyFunctions.length > 0 ? { storyFunctions: [...f.storyFunctions] } : {}),
              ...(f.sceneAffordances && f.sceneAffordances.length > 0 ? { sceneAffordances: [...f.sceneAffordances] } : {}),
            })),
            ...(story.decomposedWorld.rawWorldbuilding ? { rawWorldbuilding: story.decomposedWorld.rawWorldbuilding } : {}),
            ...(story.decomposedWorld.worldLogline ? { worldLogline: story.decomposedWorld.worldLogline } : {}),
            ...(story.decomposedWorld.openQuestions && story.decomposedWorld.openQuestions.length > 0 ? { openQuestions: [...story.decomposedWorld.openQuestions] } : {}),
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
            wantNeedCollisionPoint: data.spine.wantNeedCollisionPoint ?? '',
            protagonistDeepestFear: data.spine.protagonistDeepestFear ?? '',
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
            (char): DecomposedCharacter => {
              // Auto-migrate legacy motivations → superObjective
              const superObjective = char.superObjective ?? char.motivations;
              return {
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
                ...(superObjective ? { superObjective } : {}),
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
                ...(char.stakes && char.stakes.length > 0
                  ? { stakes: [...char.stakes] }
                  : {}),
                ...(char.pressurePoint ? { pressurePoint: char.pressurePoint } : {}),
                ...(char.personalDilemmas && char.personalDilemmas.length > 0
                  ? { personalDilemmas: [...char.personalDilemmas] }
                  : {}),
                ...(isEmotionSalience(char.emotionSalience)
                  ? { emotionSalience: char.emotionSalience }
                  : {}),
                ...(isStoryFunction(char.storyFunction)
                  ? { storyFunction: char.storyFunction }
                  : {}),
                ...(char.narrativeRole ? { narrativeRole: char.narrativeRole } : {}),
              };
            }
          ),
        }
      : {}),
    ...(data.decomposedWorld
      ? {
          decomposedWorld: {
            facts: data.decomposedWorld.facts.map((f, idx) => ({
              id: f.id ?? `wf-${idx + 1}`,
              domain: f.domain as WorldFactDomain,
              fact: f.fact,
              scope: f.scope,
              ...(f.factType ? { factType: f.factType as WorldFactType } : {}),
              ...(f.narrativeWeight ? { narrativeWeight: f.narrativeWeight } : {}),
              ...(f.thematicTag ? { thematicTag: f.thematicTag } : {}),
              ...(f.sensoryHook ? { sensoryHook: f.sensoryHook } : {}),
              ...(f.exampleEvidence ? { exampleEvidence: f.exampleEvidence } : {}),
              ...(f.tensionWithIds && f.tensionWithIds.length > 0 ? { tensionWithIds: f.tensionWithIds } : {}),
              ...(f.implicationOfIds && f.implicationOfIds.length > 0 ? { implicationOfIds: f.implicationOfIds } : {}),
              ...(f.storyFunctions ? { storyFunctions: f.storyFunctions } : {}),
              ...(f.sceneAffordances && f.sceneAffordances.length > 0 ? { sceneAffordances: f.sceneAffordances } : {}),
            })),
            ...(data.decomposedWorld.rawWorldbuilding ? { rawWorldbuilding: data.decomposedWorld.rawWorldbuilding } : {}),
            ...(data.decomposedWorld.worldLogline ? { worldLogline: data.decomposedWorld.worldLogline } : {}),
            ...(data.decomposedWorld.openQuestions && data.decomposedWorld.openQuestions.length > 0 ? { openQuestions: data.decomposedWorld.openQuestions } : {}),
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
