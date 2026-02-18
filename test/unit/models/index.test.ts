import { createChoice as createChoiceDirect } from '@/models/choice';
import {
  ChoiceType as ChoiceTypeDirect,
  PrimaryDelta as PrimaryDeltaDirect,
  CHOICE_TYPE_VALUES as CHOICE_TYPE_VALUES_Direct,
  PRIMARY_DELTA_VALUES as PRIMARY_DELTA_VALUES_Direct,
  CHOICE_TYPE_COLORS as CHOICE_TYPE_COLORS_Direct,
  PRIMARY_DELTA_LABELS as PRIMARY_DELTA_LABELS_Direct,
} from '@/models/choice-enums';
import { createPage as createPageDirect } from '@/models/page';
import { createEmptyAccumulatedStructureState as createEmptyAccumulatedStructureStateDirect } from '@/models/story-arc';
import { createStory as createStoryDirect } from '@/models/story';
import { validateStory as validateStoryDirect } from '@/models/validation';
import {
  GENRE_FRAMES as GENRE_FRAMES_DIRECT,
  computeOverallScore as computeOverallScoreDirect,
} from '@/models/concept-generator';
import * as models from '@/models';

describe('models barrel exports', () => {
  it('re-exports model utilities from each module', () => {
    expect(models.createChoice).toBe(createChoiceDirect);
    expect(models.createPage).toBe(createPageDirect);
    expect(models.createStory).toBe(createStoryDirect);
    expect(models.validateStory).toBe(validateStoryDirect);
    expect(models.createEmptyAccumulatedStructureState).toBe(
      createEmptyAccumulatedStructureStateDirect
    );
  });

  it('re-exports choice enum types and constants', () => {
    expect(models.ChoiceType).toBe(ChoiceTypeDirect);
    expect(models.PrimaryDelta).toBe(PrimaryDeltaDirect);
    expect(models.CHOICE_TYPE_VALUES).toBe(CHOICE_TYPE_VALUES_Direct);
    expect(models.PRIMARY_DELTA_VALUES).toBe(PRIMARY_DELTA_VALUES_Direct);
    expect(models.CHOICE_TYPE_COLORS).toBe(CHOICE_TYPE_COLORS_Direct);
    expect(models.PRIMARY_DELTA_LABELS).toBe(PRIMARY_DELTA_LABELS_Direct);
  });

  it('re-exports concept generator domain contracts from models barrel', () => {
    expect(models.GENRE_FRAMES).toBe(GENRE_FRAMES_DIRECT);
    expect(models.computeOverallScore).toBe(computeOverallScoreDirect);
  });

  it('supports creating and validating model objects via barrel imports', () => {
    const story = models.createStory({
      title: 'Test Story',
      characterConcept: 'A brave knight seeking glory and adventure',
    });
    const pageId = models.generatePageId(0);
    const page = models.createPage({
      id: pageId,
      narrativeText: 'A'.repeat(60),
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [models.createChoice('Option A'), models.createChoice('Option B')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    expect(models.validateStory(story).valid).toBe(true);
    expect(models.validatePage(page).valid).toBe(true);
  });
});
