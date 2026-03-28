import type { SpeechFingerprint } from '../../../models/decomposed-character.js';
import type {
  ChatBible,
  ChatBlock,
  RollingSummaryOutput,
  ChatSceneContext,
  ChatTurn,
  TurnMeta,
  TurnPlannerOutput,
} from '../../../models/chat/index.js';
import {
  tensionDeltaLabel,
  tensionLabel,
  valenceDeltaLabel,
  valenceLabel,
} from '../relationship-label-maps.js';

export function formatStringList(items: readonly string[]): string {
  if (items.length === 0) {
    return '- None';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

export interface SpeakerNames {
  readonly target: string;
  readonly interlocutor: string;
}

export function formatRecentTurns(
  turns: readonly ChatTurn[],
  speakerNames: SpeakerNames
): string {
  if (turns.length === 0) {
    return 'No prior turns in this session.';
  }

  return turns
    .map((turn) => {
      const speakerName =
        turn.speaker === 'CHARACTER' ? speakerNames.target : speakerNames.interlocutor;
      const lines = [`TURN ${turn.turnNumber} [${speakerName}]`];

      if (turn.rawText) {
        lines.push(`Raw Text: ${turn.rawText}`);
      }

      lines.push('Blocks:');
      for (const block of turn.blocks) {
        const prefix =
          block.type === 'ACTION' ? 'ACTION' : `SPEECH${block.delivery ? ` (${block.delivery})` : ''}`;
        lines.push(`- ${prefix}: ${block.text}`);
      }

      if (turn.turnMeta) {
        lines.push(
          `Turn Meta: expectsReply=${turn.turnMeta.expectsReply}; endsWithQuestion=${turn.turnMeta.endsWithQuestion}; visibleEmotion=${turn.turnMeta.visibleEmotion}; finalPressure=${turn.turnMeta.finalPressure ?? 'null'}`
        );
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

export function formatChatWriterTurn(writerTurn: {
  readonly blocks: readonly ChatBlock[];
  readonly turnMeta: TurnMeta;
}): string {
  const lines = ['Blocks:'];

  for (const block of writerTurn.blocks) {
    const prefix =
      block.type === 'ACTION' ? 'ACTION' : `SPEECH${block.delivery ? ` (${block.delivery})` : ''}`;
    lines.push(`- ${prefix}: ${block.text}`);
  }

  lines.push(
    `Turn Meta: expectsReply=${writerTurn.turnMeta.expectsReply}; endsWithQuestion=${writerTurn.turnMeta.endsWithQuestion}; visibleEmotion=${writerTurn.turnMeta.visibleEmotion}; finalPressure=${writerTurn.turnMeta.finalPressure ?? 'null'}`
  );

  return lines.join('\n');
}

export function formatSpeechFingerprint(fingerprint: SpeechFingerprint): string {
  return [
    `Vocabulary Profile: ${fingerprint.vocabularyProfile}`,
    `Sentence Patterns: ${fingerprint.sentencePatterns}`,
    'Catchphrases:',
    formatStringList(fingerprint.catchphrases),
    'Verbal Tics:',
    formatStringList(fingerprint.verbalTics),
    'Dialogue Samples:',
    formatStringList(fingerprint.dialogueSamples),
    `Metaphor Frames: ${fingerprint.metaphorFrames}`,
    'Anti-Examples:',
    formatStringList(fingerprint.antiExamples),
    'Discourse Markers:',
    formatStringList(fingerprint.discourseMarkers),
    `Register Shifts: ${fingerprint.registerShifts}`,
  ].join('\n');
}

export function formatChatBible(chatBible: ChatBible): string {
  return [
    `Session Premise: ${chatBible.sessionPremise}`,
    'Character Now:',
    `- Objective: ${chatBible.characterNow.currentObjective}`,
    `- Immediate Need: ${chatBible.characterNow.immediateNeedFromConversation}`,
    `- Emotional State: ${chatBible.characterNow.emotionalState}`,
    `- Willingness: ${chatBible.characterNow.willingnessToEngage}`,
    'Topics To Advance:',
    formatStringList(chatBible.characterNow.topicsToAdvance),
    'Topics To Protect:',
    formatStringList(chatBible.characterNow.topicsToProtect),
    'Relationship Now:',
    `- Dynamic: ${chatBible.relationshipNow.dynamic}`,
    `- Valence: ${valenceLabel(chatBible.relationshipNow.valence)}`,
    `- Tension: ${tensionLabel(chatBible.relationshipNow.tension)}`,
    `- Leverage: ${chatBible.relationshipNow.leverage}`,
    'Beliefs About Interlocutor:',
    formatStringList(chatBible.relationshipNow.whatCharacterBelievesAboutInterlocutor),
    'Knowledge Now:',
    'Known Facts:',
    formatStringList(chatBible.knowledgeNow.knownFacts),
    'Suspicions:',
    formatStringList(chatBible.knowledgeNow.suspicions),
    'False Beliefs:',
    formatStringList(chatBible.knowledgeNow.falseBeliefs),
    'Secrets Kept:',
    formatStringList(chatBible.knowledgeNow.secretsKept),
    'Knowledge Boundaries:',
    formatStringList(chatBible.knowledgeNow.knowledgeBoundaries),
    'Conversation Now:',
    'Active Threads:',
    formatStringList(chatBible.conversationNow.activeThreads),
    'Commitments:',
    formatStringList(chatBible.conversationNow.commitments),
    'Sensitive Topics:',
    formatStringList(chatBible.conversationNow.sensitiveTopics),
    `Last Turn Pressure: ${chatBible.conversationNow.lastTurnPressure ?? 'None'}`,
    'Continuity Guardrails:',
    formatStringList(chatBible.continuityGuardrails),
    'Response Constraints:',
    formatStringList(chatBible.responseConstraints),
  ].join('\n');
}

export function formatChatSceneContext(sceneContext: ChatSceneContext): string {
  return [
    `Session Premise: ${sceneContext.sessionPremise}`,
    'Physical Reality:',
    `- Location: ${sceneContext.physicalReality.location}`,
    `- Micro-Location: ${sceneContext.physicalReality.microLocation}`,
    `- Time of Day: ${sceneContext.physicalReality.timeOfDay}`,
    `- Privacy: ${sceneContext.physicalReality.privacy}`,
    `- Distance Band: ${sceneContext.physicalReality.distanceBand}`,
    `- Character Activity: ${sceneContext.physicalReality.characterActivity}`,
    'Interactable Objects:',
    formatStringList(sceneContext.physicalReality.interactableObjects),
    'Ambient Conditions:',
    formatStringList(sceneContext.physicalReality.ambientConditions),
    'Pre-Chat Momentum:',
    `- Lead-In Summary: ${sceneContext.preChatMomentum.leadInSummary}`,
    'Recent Events:',
    formatStringList(sceneContext.preChatMomentum.recentEvents),
    `- Why Now: ${sceneContext.preChatMomentum.whyNow}`,
    'Stakes Now:',
    formatStringList(sceneContext.preChatMomentum.stakesNow),
    'Unresolved Pressures:',
    formatStringList(sceneContext.preChatMomentum.unresolvedPressures),
    'Conversation Now:',
    'Active Threads:',
    formatStringList(sceneContext.conversationNow.activeThreads),
    'Commitments:',
    formatStringList(sceneContext.conversationNow.commitments),
    'Sensitive Topics:',
    formatStringList(sceneContext.conversationNow.sensitiveTopics),
    `- Last Turn Pressure: ${sceneContext.conversationNow.lastTurnPressure ?? 'None'}`,
  ].join('\n');
}

export function formatRollingSummaryText(summary: RollingSummaryOutput | null): string {
  return summary?.compressedSummary ?? 'None';
}

export function formatTurnPlan(turnPlan: TurnPlannerOutput): string {
  return [
    'Internal Self-Check:',
    `- What Do I Want: ${turnPlan.internalSelfCheck.whatDoIWant}`,
    `- What Do I Know: ${turnPlan.internalSelfCheck.whatDoIKnow}`,
    `- What Am I Hiding: ${turnPlan.internalSelfCheck.whatAmIHiding}`,
    `- How Honest Am I: ${turnPlan.internalSelfCheck.howHonestAmI}`,
    `Response Goal: ${turnPlan.responseGoal}`,
    `Speech Act: ${turnPlan.speechAct}`,
    `Honesty Mode: ${turnPlan.honestyMode}`,
    `Surface Emotion: ${turnPlan.surfaceEmotion}`,
    `Suppressed Emotion: ${turnPlan.suppressedEmotion ?? 'None'}`,
    `Subtext: ${turnPlan.subtext}`,
    'Must Address:',
    formatStringList(turnPlan.mustAddress),
    'Must Avoid:',
    formatStringList(turnPlan.mustAvoid),
    `Block Plan: ${turnPlan.blockPlan.join(' -> ')}`,
    'Action Plan:',
    turnPlan.actionPlan.length === 0
      ? '- None'
      : turnPlan.actionPlan
          .map(
            (item) =>
              `- ${item.kind}: ${item.text} (changesPhysicalState=${item.changesPhysicalState})`
          )
          .join('\n'),
    `Question Back: ${turnPlan.questionBack ?? 'None'}`,
    `Target Length: ${turnPlan.targetLength}`,
    'Expected Impact:',
    `- Relationship Delta Hint: ${valenceDeltaLabel(turnPlan.expectedImpact.relationshipDeltaHint)}`,
    `- Tension Delta Hint: ${tensionDeltaLabel(turnPlan.expectedImpact.tensionDeltaHint)}`,
    `- Reveals Secret: ${turnPlan.expectedImpact.revealsSecret}`,
  ].join('\n');
}
