import { type Request, type Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import { listConcepts, loadConcept } from '../../persistence/concept-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { listCharacterWebs } from '../../persistence/character-web-repository.js';
import { listDevelopedCharactersByWebId } from '../../persistence/developed-character-repository.js';
import { listWorldbuildings, loadWorldbuildingById } from '../../services/worldbuilding-service.js';
import { generateCharacterBrainstorm } from '../../llm/character-brainstormer-generation.js';
import type { ExistingCharacterSummary } from '../../llm/character-brainstormer-types.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const characterBrainstormerRoutes = Router();

interface GenerateBody {
  readonly conceptId?: unknown;
  readonly worldbuildingId?: unknown;
  readonly userNotes?: unknown;
  readonly apiKey?: unknown;
  readonly progressId?: unknown;
}

characterBrainstormerRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const [concepts, worldbuildings] = await Promise.all([listConcepts(), listWorldbuildings()]);

    res.render('pages/character-brainstormer', {
      title: 'Brainstorm Characters - One More Branch',
      concepts,
      worldbuildings,
    });
  })
);

characterBrainstormerRoutes.post(
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as GenerateBody;

    const conceptId =
      typeof body.conceptId === 'string' ? body.conceptId.trim() : '';
    const worldbuildingId =
      typeof body.worldbuildingId === 'string' ? body.worldbuildingId.trim() : '';
    const apiKey =
      typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const userNotes =
      typeof body.userNotes === 'string' ? body.userNotes.trim() : '';

    if (!conceptId) {
      res.status(400).json({ success: false, error: 'conceptId is required' });
      return;
    }

    if (!worldbuildingId) {
      res.status(400).json({ success: false, error: 'worldbuildingId is required' });
      return;
    }

    if (!apiKey) {
      res.status(400).json({ success: false, error: 'apiKey is required' });
      return;
    }

    const progress = createRouteGenerationProgress(body.progressId, 'character-brainstorming');

    try {
      const [concept, wb] = await Promise.all([
        loadConcept(conceptId),
        loadWorldbuildingById(worldbuildingId),
      ]);

      if (!concept) {
        res.status(404).json({ success: false, error: `Concept not found: ${conceptId}` });
        return;
      }

      const kernel = await loadKernel(concept.sourceKernelId);
      if (!kernel) {
        res.status(404).json({
          success: false,
          error: `Kernel not found: ${concept.sourceKernelId}`,
        });
        return;
      }

      const existingCharacterSummaries = await collectExistingCharacterSummaries(conceptId);

      progress.onGenerationStage?.({
        stage: 'BRAINSTORMING_CHARACTERS',
        status: 'started',
        attempt: 1,
      });

      const result = await generateCharacterBrainstorm(
        {
          conceptSpec: concept.evaluatedConcept.concept,
          storyKernel: kernel.evaluatedKernel.kernel,
          decomposedWorld: wb?.decomposedWorld ?? null,
          rawWorldbuilding: wb?.rawWorldMarkdown ?? wb?.rawSourceText ?? null,
          existingCharacterNames: existingCharacterSummaries,
          userNotes,
        },
        apiKey
      );

      progress.onGenerationStage?.({
        stage: 'BRAINSTORMING_CHARACTERS',
        status: 'completed',
        attempt: 1,
      });

      progress.complete();
      res.json({ success: true, result });
    } catch (error: unknown) {
      progress.fail();

      if (error instanceof LLMError) {
        logger.error('LLM error during character brainstorming', {
          code: error.code,
          retryable: error.retryable,
        });
        const { response } = buildLlmRouteErrorResult(error);
        res.status(500).json(response);
        return;
      }

      logger.error('Character brainstormer generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

async function collectExistingCharacterSummaries(
  conceptId: string
): Promise<readonly ExistingCharacterSummary[]> {
  const allWebs = await listCharacterWebs();
  const conceptWebs = allWebs.filter((w) => w.sourceConceptId === conceptId);

  const summaries: ExistingCharacterSummary[] = [];

  for (const web of conceptWebs) {
    const devChars = await listDevelopedCharactersByWebId(web.id);

    for (const assignment of web.assignments) {
      const devChar = devChars.find((c) => c.characterName === assignment.characterName);
      summaries.push({
        name: assignment.characterName,
        storyFunction: assignment.storyFunction ?? null,
        narrativeRole: assignment.narrativeRole ?? null,
        superObjective: devChar?.characterKernel?.superObjective ?? null,
      });
    }
  }

  return summaries;
}
