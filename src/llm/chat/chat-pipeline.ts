import type { GenerationStageCallback, GenerationStage } from '../../engine/types.js';
import { runGenerationStage } from '../../engine/generation-pipeline-helpers.js';
import {
  assembleChatBible,
  ChatDomainError,
  type ChatBible,
  type ChatSession,
  type ChatTurn,
} from '../../models/chat/index.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import { generateChatCharacterContext } from './chat-character-context-generation.js';
import { generateChatTurnPlan } from './chat-planner-generation.js';
import { generateChatSceneContext } from './chat-scene-context-generation.js';
import { generateChatStateUpdate } from './chat-state-updater-generation.js';
import { generateChatSummary } from './chat-summary-generation.js';
import { generateChatWriterTurn } from './chat-writer-generation.js';
import { applyChatStateUpdate } from './chat-state-applier.js';

export interface ChatPipelineContext {
  readonly chatSession: ChatSession;
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacter: StandaloneDecomposedCharacter;
  readonly decomposedWorld: DecomposedWorld;
  readonly recentTurns: readonly ChatTurn[];
  readonly allTurns: readonly ChatTurn[];
  readonly latestUserTurn: ChatTurn;
  readonly isSessionResume: boolean;
}

export interface ChatPipelineResult {
  readonly characterTurn: ChatTurn;
  readonly updatedSession: ChatSession;
  readonly bibleWasRefreshed: boolean;
  readonly summaryWasGenerated: boolean;
}

const CHAT_SCENE_STAGE: GenerationStage = 'CURATING_CHAT_SCENE';
const CHAT_CHARACTER_STAGE: GenerationStage = 'CURATING_CHAT_CHARACTER';
const CHAT_PLANNER_STAGE: GenerationStage = 'PLANNING_CHAT_TURN';
const CHAT_WRITER_STAGE: GenerationStage = 'WRITING_CHAT_TURN';
const CHAT_STATE_STAGE: GenerationStage = 'UPDATING_CHAT_STATE';
const CHAT_SUMMARY_STAGE: GenerationStage = 'SUMMARIZING_CHAT_MEMORY';

function getLatestPriorCharacterTurn(allTurns: readonly ChatTurn[], latestUserTurn: ChatTurn): ChatTurn | null {
  for (let index = allTurns.length - 1; index >= 0; index -= 1) {
    const turn = allTurns[index];
    if (turn === undefined) {
      continue;
    }

    if (turn.turnNumber >= latestUserTurn.turnNumber) {
      continue;
    }

    if (turn.speaker === 'CHARACTER') {
      return turn;
    }
  }

  return null;
}

function shouldRefreshChatBible(context: ChatPipelineContext): boolean {
  if (context.isSessionResume || context.chatSession.chatBible === null) {
    return true;
  }

  if (context.chatSession.turnCount > 0 && context.chatSession.turnCount % 10 === 0) {
    return true;
  }

  return (
    getLatestPriorCharacterTurn(context.allTurns, context.latestUserTurn)?.stateUpdate
      ?.shouldRefreshChatBible === true
  );
}

function shouldGenerateSummary(
  session: ChatSession,
  characterTurn: ChatTurn,
  isSessionResume: boolean
): boolean {
  const stateUpdateRequested = characterTurn.stateUpdate?.shouldTriggerSummary === true;
  const cadenceRequested = session.turnCount > 0 && session.turnCount % 8 === 0;
  const resumeRequested = isSessionResume && session.turnCount > 8 && session.rollingSummary === null;

  return stateUpdateRequested || cadenceRequested || resumeRequested;
}

function buildCharacterTurn(latestUserTurn: ChatTurn, completedAt: string, writerTurn: {
  readonly blocks: readonly ChatTurn['blocks'][number][];
  readonly turnMeta: NonNullable<ChatTurn['turnMeta']>;
}, turnPlan: NonNullable<ChatTurn['plannerOutput']>, stateUpdate: NonNullable<ChatTurn['stateUpdate']>): ChatTurn {
  return {
    turnNumber: latestUserTurn.turnNumber + 1,
    speaker: 'CHARACTER',
    blocks: writerTurn.blocks,
    turnMeta: writerTurn.turnMeta,
    plannerOutput: turnPlan,
    stateUpdate,
    timestamp: completedAt,
  };
}

export async function runChatPipeline(
  context: ChatPipelineContext,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback
): Promise<ChatPipelineResult> {
  if (context.latestUserTurn.speaker !== 'USER') {
    throw new ChatDomainError(
      'Chat pipeline requires latestUserTurn to have speaker USER',
      'INVARIANT_VIOLATION'
    );
  }

  const bibleWasRefreshed = shouldRefreshChatBible(context);
  const chatBible: ChatBible = (() : ChatBible | null => {
    if (context.chatSession.chatBible !== null && !bibleWasRefreshed) {
      return context.chatSession.chatBible;
    }

    return null;
  })() ?? (await (async (): Promise<ChatBible> => {
    const bibleContext = {
      targetCharacter: context.targetCharacter,
      interlocutorCharacter: context.interlocutorCharacter,
      decomposedWorld: context.decomposedWorld,
      relationshipState: context.chatSession.relationshipState,
      knowledgeState: context.chatSession.knowledgeState,
      physicalContext: context.chatSession.physicalContext,
      leadInContext: context.chatSession.leadInContext,
      rollingSummary: context.chatSession.rollingSummary,
      recentTurns: context.recentTurns,
    };

    const sceneResult = await runGenerationStage(onGenerationStage, CHAT_SCENE_STAGE, async () =>
      generateChatSceneContext(bibleContext, apiKey)
    );
    const characterResult = await runGenerationStage(
      onGenerationStage,
      CHAT_CHARACTER_STAGE,
      async () => generateChatCharacterContext(bibleContext, sceneResult.sceneContext, apiKey)
    );

    return assembleChatBible(sceneResult.sceneContext, characterResult.characterContext);
  })());

  const turnPlan = (
    await runGenerationStage(
      onGenerationStage,
      CHAT_PLANNER_STAGE,
      async () =>
        generateChatTurnPlan(
          {
            targetCharacter: context.targetCharacter,
            interlocutorCharacterName: context.chatSession.interlocutorCharacterName,
            chatBible,
            recentTurns: context.recentTurns,
            latestUserTurn: context.latestUserTurn,
          },
          apiKey
        )
    )
  ).turnPlan;

  const writerTurn = (
    await runGenerationStage(
      onGenerationStage,
      CHAT_WRITER_STAGE,
      async () =>
        generateChatWriterTurn(
          {
            targetCharacter: context.targetCharacter,
            interlocutorCharacterName: context.chatSession.interlocutorCharacterName,
            chatBible,
            turnPlan,
            recentTurns: context.recentTurns,
            latestUserTurn: context.latestUserTurn,
          },
          apiKey
        )
    )
  ).writerTurn;

  const stateUpdate = (
    await runGenerationStage(
      onGenerationStage,
      CHAT_STATE_STAGE,
      async () =>
        generateChatStateUpdate(
          {
            targetCharacterName: context.targetCharacter.name,
            interlocutorCharacterName: context.chatSession.interlocutorCharacterName,
            chatBible,
            latestUserTurn: context.latestUserTurn,
            turnPlan,
            writerTurn,
          },
          apiKey
        )
    )
  ).stateUpdate;

  const completedAt = new Date().toISOString();
  const characterTurn = buildCharacterTurn(context.latestUserTurn, completedAt, writerTurn, turnPlan, stateUpdate);
  let updatedSession = applyChatStateUpdate(
    {
      ...context.chatSession,
      chatBible,
    },
    stateUpdate,
    completedAt
  );

  const summaryWasGenerated = shouldGenerateSummary(updatedSession, characterTurn, context.isSessionResume);

  if (summaryWasGenerated) {
    const summary = (
      await runGenerationStage(
        onGenerationStage,
        CHAT_SUMMARY_STAGE,
        async () =>
          generateChatSummary(
            {
              targetCharacterName: context.targetCharacter.name,
              interlocutorCharacterName: context.chatSession.interlocutorCharacterName,
              existingSummary: updatedSession.rollingSummary,
              turnsToCompress: [...context.allTurns, characterTurn],
            },
            apiKey
          )
      )
    ).summary;

    updatedSession = {
      ...updatedSession,
      rollingSummary: summary,
      updatedAt: completedAt,
    };
  }

  return {
    characterTurn,
    updatedSession,
    bibleWasRefreshed,
    summaryWasGenerated,
  };
}
