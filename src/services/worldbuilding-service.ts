import { randomUUID } from 'node:crypto';
import type { GenerationStage, GenerationStageCallback } from '../engine/types.js';
import type { SavedWorldbuilding } from '../models/saved-worldbuilding.js';
import type { WorldbuildingPipelineInputs } from '../models/worldbuilding-pipeline-types.js';
import {
  saveWorldbuilding,
  loadWorldbuilding,
  listWorldbuildings as listAll,
  deleteWorldbuilding as removeWorldbuilding,
  updateWorldbuilding,
} from '../persistence/worldbuilding-repository.js';
import { generateWorldSeed } from '../llm/worldbuilding-seed-generation.js';
import { generateWorldElaboration } from '../llm/worldbuilding-elaboration-generation.js';
import { decomposeWorldbuilding } from '../llm/worldbuilding-decomposer.js';
import { canonicalizeDecomposedWorld } from './worldbuilding-canonicalizer.js';

function emitStage(
  onStage: GenerationStageCallback | undefined,
  stage: GenerationStage,
): void {
  onStage?.({ stage, status: 'started', attempt: 1 });
}

export async function createWorldbuilding(
  name: string,
  inputs: WorldbuildingPipelineInputs,
  sourceConceptId?: string,
): Promise<SavedWorldbuilding> {
  const now = new Date().toISOString();
  const wb: SavedWorldbuilding = {
    id: randomUUID(),
    name,
    sourceKind: 'PIPELINE',
    createdAt: now,
    updatedAt: now,
    ...(sourceConceptId ? { sourceConceptId } : {}),
    inputs,
    worldSeed: null,
    rawWorldMarkdown: null,
    rawSourceText: null,
    decomposedWorld: null,
    completedStages: [],
  };

  await saveWorldbuilding(wb);
  return wb;
}

export async function runWorldSeedGeneration(
  id: string,
  apiKey: string,
  onStage?: GenerationStageCallback,
): Promise<SavedWorldbuilding> {
  const wb = await loadWorldbuilding(id);
  if (!wb) throw new Error(`Worldbuilding not found: ${id}`);

  emitStage(onStage, 'GENERATING_WORLD_SEED');

  const result = await generateWorldSeed(
    {
      userNotes: wb.inputs.userNotes,
      contentPreferences: wb.inputs.contentPreferences,
      startingSituation: wb.inputs.startingSituation,
      tone: wb.inputs.tone,
    },
    apiKey,
  );

  return updateWorldbuilding(id, (existing) => ({
    ...existing,
    worldSeed: result.worldSeed,
    rawWorldMarkdown: null,
    decomposedWorld: null,
    completedStages: [1],
    updatedAt: new Date().toISOString(),
  }));
}

export async function runWorldElaborationGeneration(
  id: string,
  apiKey: string,
  onStage?: GenerationStageCallback,
): Promise<SavedWorldbuilding> {
  const wb = await loadWorldbuilding(id);
  if (!wb) throw new Error(`Worldbuilding not found: ${id}`);
  if (!wb.worldSeed) throw new Error('World seed must be generated before elaboration');

  emitStage(onStage, 'ELABORATING_WORLD');

  const result = await generateWorldElaboration(
    {
      worldSeed: wb.worldSeed,
      userNotes: wb.inputs.userNotes,
      tone: wb.inputs.tone,
    },
    apiKey,
  );

  const canonicalized = canonicalizeDecomposedWorld(result.decomposedWorld);

  return updateWorldbuilding(id, (existing) => ({
    ...existing,
    rawWorldMarkdown: result.rawWorldMarkdown,
    decomposedWorld: canonicalized,
    completedStages: [1, 2],
    updatedAt: new Date().toISOString(),
  }));
}

export async function decomposeRawWorldbuilding(
  name: string,
  rawText: string,
  apiKey: string,
  tone: string,
  onStage?: GenerationStageCallback,
): Promise<SavedWorldbuilding> {
  const now = new Date().toISOString();

  emitStage(onStage, 'DECOMPOSING_WORLD');

  const result = await decomposeWorldbuilding(
    { worldbuilding: rawText, tone },
    apiKey,
  );

  const canonicalized = canonicalizeDecomposedWorld(result.decomposedWorld);

  const wb: SavedWorldbuilding = {
    id: randomUUID(),
    name,
    sourceKind: 'RAW_DECOMPOSED',
    createdAt: now,
    updatedAt: now,
    inputs: {},
    worldSeed: null,
    rawWorldMarkdown: null,
    rawSourceText: rawText,
    decomposedWorld: canonicalized,
    completedStages: [],
  };

  await saveWorldbuilding(wb);
  return wb;
}

export async function loadWorldbuildingById(
  id: string,
): Promise<SavedWorldbuilding | null> {
  return loadWorldbuilding(id);
}

export async function listWorldbuildings(): Promise<SavedWorldbuilding[]> {
  return listAll();
}

export async function listWorldbuildingsByConcept(
  conceptId: string,
): Promise<SavedWorldbuilding[]> {
  const all = await listAll();
  return all.filter((wb) => wb.sourceConceptId === conceptId);
}

export async function patchWorldbuilding(
  id: string,
  updates: Partial<Pick<SavedWorldbuilding, 'name' | 'inputs'>>,
): Promise<SavedWorldbuilding> {
  return updateWorldbuilding(id, (existing) => ({
    ...existing,
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.inputs !== undefined ? { inputs: updates.inputs } : {}),
    updatedAt: new Date().toISOString(),
  }));
}

export async function deleteWorldbuildingById(id: string): Promise<void> {
  return removeWorldbuilding(id);
}
