import { createChoice as createChoiceDirect } from '@/models/choice';
import { createPage as createPageDirect } from '@/models/page';
import { createStory as createStoryDirect } from '@/models/story';
import { validateStory as validateStoryDirect } from '@/models/validation';
import * as models from '@/models';

describe('models barrel exports', () => {
  it('re-exports model utilities from each module', () => {
    expect(models.createChoice).toBe(createChoiceDirect);
    expect(models.createPage).toBe(createPageDirect);
    expect(models.createStory).toBe(createStoryDirect);
    expect(models.validateStory).toBe(validateStoryDirect);
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
      choices: [models.createChoice('Option A'), models.createChoice('Option B')],
      stateChanges: { added: [], removed: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    expect(models.validateStory(story).valid).toBe(true);
    expect(models.validatePage(page).valid).toBe(true);
  });
});
