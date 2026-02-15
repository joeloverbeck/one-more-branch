import {
  BeatRole,
  Story,
  StoryId,
  StoryMetadata,
  StoryStructure,
  VersionedStoryStructure,
  parsePageId,
  parseStoryId,
  parseStructureVersionId,
} from '../models';
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
import {
  deleteDirectory,
  directoryExists,
  ensureDirectory,
  ensureStoriesDir,
  getStoriesDir,
  getStoryDir,
  getStoryFilePath,
  listDirectories,
  listFiles,
  readJsonFile,
  writeJsonFile,
} from './file-utils';
import { withLock } from './lock-manager';

interface SpeechFingerprintFileData {
  catchphrases: string[];
  vocabularyProfile: string;
  sentencePatterns: string;
  verbalTics: string[];
  dialogueSamples: string[];
  metaphorFrames: string;
  antiExamples: string[];
  discourseMarkers: string[];
  registerShifts: string;
}

interface DecomposedRelationshipFileData {
  valence: number;
  dynamic: string;
  history: string;
  currentTension: string;
  leverage: string;
}

interface DecomposedCharacterFileData {
  name: string;
  speechFingerprint: SpeechFingerprintFileData;
  coreTraits: string[];
  motivations: string;
  protagonistRelationship?: DecomposedRelationshipFileData | null;
  knowledgeBoundaries: string;
  falseBeliefs?: string[];
  secretsKept?: string[];
  decisionPattern: string;
  coreBeliefs: string[];
  conflictPriority: string;
  appearance: string;
  rawDescription: string;
}

interface WorldFactFileData {
  domain: string;
  fact: string;
  scope: string;
  factType?: string;
}

interface DecomposedWorldFileData {
  facts: WorldFactFileData[];
  rawWorldbuilding: string;
}

interface CanonFactFileData {
  text: string;
  factType: string;
}

interface SpineFileData {
  centralDramaticQuestion: string;
  protagonistNeedVsWant: { need: string; want: string; dynamic: string };
  primaryAntagonisticForce: { description: string; pressureMechanism: string };
  storySpineType: string;
  conflictType: string;
  characterArcType: string;
}

interface StoryFileData {
  id: string;
  title: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  toneKeywords?: string[];
  toneAntiKeywords?: string[];
  npcs: Array<{ name: string; description: string }> | null;
  startingSituation: string | null;
  globalCanon: CanonFactFileData[];
  globalCharacterCanon: Record<string, string[]>;
  structure: StoryStructureFileData | null;
  structureVersions: VersionedStoryStructureFileData[];
  spine?: SpineFileData;
  decomposedCharacters?: DecomposedCharacterFileData[];
  decomposedWorld?: DecomposedWorldFileData;
  createdAt: string;
  updatedAt: string;
}

interface VersionedStoryStructureFileData {
  id: string;
  structure: StoryStructureFileData;
  previousVersionId: string | null;
  createdAtPageId: number | null;
  rewriteReason: string | null;
  preservedBeatIds: string[];
  createdAt: string;
}

interface StoryStructureFileData {
  acts: Array<{
    id: string;
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      id: string;
      name: string;
      description: string;
      objective: string;
      role: string;
    }>;
  }>;
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  generatedAt: string;
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
        role: beat.role,
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

function storyToFileData(story: Story): StoryFileData {
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
    ...(story.toneKeywords ? { toneKeywords: [...story.toneKeywords] } : {}),
    ...(story.toneAntiKeywords ? { toneAntiKeywords: [...story.toneAntiKeywords] } : {}),
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
            conflictType: story.spine.conflictType,
            characterArcType: story.spine.characterArcType,
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
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

const VALID_WORLD_FACT_TYPES: ReadonlySet<string> = new Set([
  'LAW',
  'NORM',
  'BELIEF',
  'DISPUTED',
  'RUMOR',
  'MYSTERY',
]);

function deserializeCanonFact(raw: CanonFactFileData): CanonFact {
  const factType = raw.factType && VALID_WORLD_FACT_TYPES.has(raw.factType)
    ? raw.factType as WorldFactType
    : 'NORM' as WorldFactType;
  return { text: raw.text, factType };
}

function fileDataToStory(data: StoryFileData): Story {
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
    ...(data.toneKeywords ? { toneKeywords: [...data.toneKeywords] } : {}),
    ...(data.toneAntiKeywords ? { toneAntiKeywords: [...data.toneAntiKeywords] } : {}),
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
            conflictType: data.spine.conflictType as ConflictType,
            characterArcType: data.spine.characterArcType as CharacterArcType,
          } as StorySpine,
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
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

export async function saveStory(story: Story): Promise<void> {
  ensureStoriesDir();

  await withLock(story.id, async () => {
    const storyDir = getStoryDir(story.id);
    await ensureDirectory(storyDir);
    await writeJsonFile(getStoryFilePath(story.id), storyToFileData(story));
  });
}

export async function updateStory(story: Story): Promise<void> {
  await withLock(story.id, async () => {
    const exists = await directoryExists(getStoryDir(story.id));
    if (!exists) {
      throw new Error(`Story ${story.id} does not exist`);
    }

    await writeJsonFile(getStoryFilePath(story.id), storyToFileData(story));
  });
}

export async function loadStory(storyId: StoryId): Promise<Story | null> {
  const data = await readJsonFile<StoryFileData>(getStoryFilePath(storyId));

  if (!data) {
    return null;
  }

  if (data.id !== storyId) {
    throw new Error(`Story ID mismatch: expected ${storyId}, found ${data.id}`);
  }

  return fileDataToStory(data);
}

export async function storyExists(storyId: StoryId): Promise<boolean> {
  return directoryExists(getStoryDir(storyId));
}

export async function deleteStory(storyId: StoryId): Promise<void> {
  await withLock(storyId, async () => {
    await deleteDirectory(getStoryDir(storyId));
  });
}

export async function listStories(): Promise<StoryMetadata[]> {
  ensureStoriesDir();

  const storyIds = await listDirectories(getStoriesDir());
  const stories: StoryMetadata[] = [];

  for (const storyId of storyIds) {
    let story: Story | null;
    try {
      story = await loadStory(storyId as StoryId);
    } catch {
      continue;
    }

    if (!story) {
      continue;
    }

    const pageCount = await getPageCount(story.id);

    stories.push({
      id: story.id,
      title: story.title,
      characterConcept: story.characterConcept,
      tone: story.tone,
      overallTheme: story.structure?.overallTheme,
      premise: story.structure?.premise,
      createdAt: story.createdAt,
      pageCount,
      hasEnding: false,
    });
  }

  stories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return stories;
}

export async function getPageCount(storyId: StoryId): Promise<number> {
  const pageFiles = await listFiles(getStoryDir(storyId), /^page_\d+\.json$/);
  return pageFiles.length;
}
