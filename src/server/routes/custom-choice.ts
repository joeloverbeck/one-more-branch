import type { Request, Response } from 'express';
import {
  ChoiceType,
  CHOICE_TYPE_VALUES,
  PageId,
  PrimaryDelta,
  PRIMARY_DELTA_VALUES,
  StoryId,
} from '../../models/index.js';
import { addChoice } from '../../persistence/index.js';
import { logger } from '../../logging/index.js';
import { parseCustomChoiceText } from '../utils/index.js';

type CustomChoiceBody = {
  pageId?: number;
  choiceText?: string;
  choiceType?: string;
  primaryDelta?: string;
};

export async function customChoiceHandler(req: Request, res: Response): Promise<Response> {
  const { storyId } = req.params;
  const {
    pageId,
    choiceText,
    choiceType: rawChoiceType,
    primaryDelta: rawPrimaryDelta,
  } = req.body as CustomChoiceBody;

  if (pageId === undefined || typeof choiceText !== 'string') {
    return res.status(400).json({ error: 'Missing pageId or choiceText' });
  }

  const choiceTextResult = parseCustomChoiceText(choiceText);
  if (choiceTextResult.error) {
    return res.status(400).json({ error: choiceTextResult.error });
  }
  const trimmedChoiceText = choiceTextResult.value;
  if (!trimmedChoiceText) {
    return res.status(400).json({ error: 'Missing pageId or choiceText' });
  }

  const choiceType =
    rawChoiceType && CHOICE_TYPE_VALUES.includes(rawChoiceType as ChoiceType)
      ? (rawChoiceType as ChoiceType)
      : ChoiceType.TACTICAL_APPROACH;

  const primaryDelta =
    rawPrimaryDelta && PRIMARY_DELTA_VALUES.includes(rawPrimaryDelta as PrimaryDelta)
      ? (rawPrimaryDelta as PrimaryDelta)
      : PrimaryDelta.GOAL_SHIFT;

  try {
    const updatedPage = await addChoice(
      storyId as StoryId,
      pageId as PageId,
      trimmedChoiceText,
      choiceType,
      primaryDelta
    );

    return res.json({
      choices: updatedPage.choices.map((c) => ({
        text: c.text,
        choiceType: c.choiceType,
        primaryDelta: c.primaryDelta,
        nextPageId: c.nextPageId,
      })),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message.includes('ending page')) {
      return res.status(409).json({ error: err.message });
    }

    logger.error('Error adding custom choice:', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Failed to add custom choice' });
  }
}
