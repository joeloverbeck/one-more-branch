import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { generateStorySpines } from '../../llm/spine-generator.js';
import type { SpineOption } from '../../llm/spine-generator.js';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { GenerationStage } from '../../engine/types.js';
import type { SavedSpine } from '../../models/saved-spine.js';
import { listConcepts, loadConcept } from '../../persistence/concept-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { loadCharacter, listCharacters } from '../../persistence/character-repository.js';
import {
  deleteSpine,
  listSpines,
  loadSpine,
  saveSpine,
  updateSpine,
} from '../../persistence/spine-repository.js';
import { listWorldbuildings, loadWorldbuildingById } from '../../services/worldbuilding-service.js';
import { generationProgressService } from '../services/index.js';
import { buildLlmRouteErrorResult, parseProgressId, wrapAsyncRoute } from '../utils/index.js';

export const spineRoutes = Router();

spineRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const [savedSpines, concepts, characters, worldbuildings] = await Promise.all([
      listSpines(),
      listConcepts(),
      listCharacters(),
      listWorldbuildings(),
    ]);
    return res.render('pages/spines', {
      title: 'Generate Spines - One More Branch',
      savedSpines,
      concepts,
      characters,
      worldbuildings,
    });
  })
);

spineRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const spines = await listSpines();
    return res.json({ success: true, spines });
  })
);

spineRoutes.get(
  '/api/:spineId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { spineId } = req.params;
    const spine = await loadSpine(spineId as string);
    if (!spine) {
      return res.status(404).json({ success: false, error: 'Spine not found' });
    }
    return res.json({ success: true, spine });
  })
);

spineRoutes.post(
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      conceptId?: string;
      protagonistCharacterId?: string;
      npcCharacterIds?: string[];
      worldbuildingId?: string;
      tone?: string;
      startingSituation?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const conceptId = body.conceptId?.trim();
    if (!conceptId) {
      return res.status(400).json({ success: false, error: 'Concept selection is required' });
    }

    const protagonistCharacterId = body.protagonistCharacterId?.trim();
    if (!protagonistCharacterId) {
      return res
        .status(400)
        .json({ success: false, error: 'Protagonist character selection is required' });
    }

    const worldbuildingId = body.worldbuildingId?.trim();
    if (!worldbuildingId) {
      return res.status(400).json({ success: false, error: 'Worldbuilding selection is required' });
    }

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'spine-generation');
    }

    try {
      const concept = await loadConcept(conceptId);
      if (!concept) {
        if (progressId) generationProgressService.fail(progressId, 'Concept not found');
        return res.status(404).json({ success: false, error: 'Selected concept not found' });
      }

      const kernel = await loadKernel(concept.sourceKernelId);
      if (!kernel) {
        if (progressId) generationProgressService.fail(progressId, 'Source kernel not found');
        return res.status(404).json({
          success: false,
          error: 'Source kernel for the selected concept not found',
        });
      }

      const allCharacterIds = [protagonistCharacterId, ...(body.npcCharacterIds ?? [])];
      const decomposedCharacters = (
        await Promise.all(allCharacterIds.map((id) => loadCharacter(id)))
      ).filter((c): c is NonNullable<typeof c> => c !== null);

      let decomposedWorld;
      const wb = await loadWorldbuildingById(worldbuildingId);
      if (wb?.decomposedWorld) {
        decomposedWorld = wb.decomposedWorld;
      }

      const derivedCharacterConcept = decomposedCharacters[0]?.rawDescription ?? '';

      const result = await generateStorySpines(
        {
          characterConcept: derivedCharacterConcept || undefined,
          worldbuilding: wb?.rawWorldMarkdown ?? wb?.rawSourceText ?? undefined,
          decomposedWorld,
          tone: body.tone?.trim() ?? 'fantasy adventure',
          decomposedCharacters: decomposedCharacters.length > 0 ? decomposedCharacters : undefined,
          startingSituation: body.startingSituation?.trim(),
          conceptSpec: concept.evaluatedConcept.concept,
          storyKernel: kernel.evaluatedKernel.kernel,
          conceptVerification: concept.verificationResult,
        },
        apiKey,
        undefined,
        progressId
          ? {
              onStageStarted: (stage: string): void =>
                generationProgressService.markStageStarted(progressId, stage as GenerationStage, 1),
              onStageCompleted: (stage: string): void =>
                generationProgressService.markStageCompleted(
                  progressId,
                  stage as GenerationStage,
                  1
                ),
            }
          : undefined
      );

      if (progressId) generationProgressService.complete(progressId);

      return res.json({ success: true, options: result.options });
    } catch (error) {
      if (error instanceof LLMError) {
        const { publicMessage, response } = buildLlmRouteErrorResult(error, {
          includeDebug: false,
        });
        if (progressId) generationProgressService.fail(progressId, publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) generationProgressService.fail(progressId, err.message);
      logger.error('Error generating spines:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);

spineRoutes.post(
  '/api/save',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      spineOption?: SpineOption;
      name?: string;
      sourceConceptId?: string;
      protagonistCharacterId?: string;
      npcCharacterIds?: string[];
      worldbuildingId?: string;
      tone?: string;
      startingSituation?: string;
    };

    if (!body.spineOption) {
      return res.status(400).json({ success: false, error: 'Spine option is required' });
    }
    if (!body.sourceConceptId?.trim()) {
      return res.status(400).json({ success: false, error: 'Source concept ID is required' });
    }
    if (!body.protagonistCharacterId?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'Protagonist character ID is required' });
    }
    if (!body.worldbuildingId?.trim()) {
      return res.status(400).json({ success: false, error: 'Worldbuilding ID is required' });
    }

    const now = new Date().toISOString();
    const spine: SavedSpine = {
      id: randomUUID(),
      name:
        body.name?.trim() ??
        `${body.spineOption.storySpineType} — ${body.spineOption.centralDramaticQuestion.slice(0, 60)}`,
      createdAt: now,
      updatedAt: now,
      spineOption: body.spineOption,
      sourceConceptId: body.sourceConceptId.trim(),
      protagonistCharacterId: body.protagonistCharacterId.trim(),
      npcCharacterIds: body.npcCharacterIds ?? [],
      worldbuildingId: body.worldbuildingId.trim(),
      tone: body.tone?.trim() ?? '',
      startingSituation: body.startingSituation?.trim() ?? '',
    };

    await saveSpine(spine);
    return res.json({ success: true, spine });
  })
);

spineRoutes.put(
  '/api/:spineId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { spineId } = req.params;
    const { name } = req.body as { name?: string };

    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    try {
      const updated = await updateSpine(spineId as string, (existing) => ({
        ...existing,
        name: name.trim(),
        updatedAt: new Date().toISOString(),
      }));
      return res.json({ success: true, spine: updated });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.message.includes('not found')) {
        return res.status(404).json({ success: false, error: 'Spine not found' });
      }
      throw error;
    }
  })
);

spineRoutes.delete(
  '/api/:spineId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { spineId } = req.params;
    await deleteSpine(spineId as string);
    return res.json({ success: true });
  })
);
