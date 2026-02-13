import { Page, isPage } from './page';
import { PageId } from './id';
import { Story, isStory } from './story';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStory(story: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isStory(story)) {
    return {
      valid: false,
      errors: ['Object is not a valid Story structure'],
    };
  }

  if (story.characterConcept.length < 10) {
    errors.push('Character concept is too short (minimum 10 characters)');
  }

  if (story.characterConcept.length > 5000) {
    errors.push('Character concept is too long (maximum 5000 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePage(page: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isPage(page)) {
    return {
      valid: false,
      errors: ['Object is not a valid Page structure'],
    };
  }

  if (page.narrativeText.length < 50) {
    errors.push('Narrative text is too short (minimum 50 characters)');
  }

  if (page.narrativeText.length > 10000) {
    errors.push('Narrative text is too long (maximum 10000 characters)');
  }

  if (!page.isEnding && page.choices.length < 2) {
    errors.push('Non-ending pages must have at least 2 choices');
  }

  if (!page.isEnding && page.choices.length > 5) {
    errors.push('Too many choices (maximum 5)');
  }

  if (page.isEnding && page.choices.length > 0) {
    errors.push('Ending pages must have no choices');
  }

  const choiceTexts = page.choices.map((choice) => choice.text.toLowerCase());
  if (new Set(choiceTexts).size !== choiceTexts.length) {
    errors.push('Duplicate choice texts detected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateNoCycle(
  page: Page,
  getPage: (id: PageId) => Page | undefined
): ValidationResult {
  const errors: string[] = [];
  const ancestorIds = new Set<PageId>();

  let current: Page | undefined = page;
  while (current && current.parentPageId !== null) {
    ancestorIds.add(current.id);
    current = getPage(current.parentPageId);
  }
  if (current) {
    ancestorIds.add(current.id);
  }

  page.choices.forEach((choice, index) => {
    if (choice.nextPageId !== null && ancestorIds.has(choice.nextPageId)) {
      errors.push(
        `Choice ${index} creates a cycle by pointing to ancestor page ${choice.nextPageId}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateStoryIntegrity(_story: Story, pages: Map<PageId, Page>): ValidationResult {
  const errors: string[] = [];

  const page1 = pages.get(1 as PageId);
  if (!page1) {
    return {
      valid: false,
      errors: ['Story must have page 1'],
    };
  }

  if (page1.isEnding && pages.size > 1) {
    errors.push('Page 1 cannot be an ending if there are more pages');
  }

  pages.forEach((page, pageId) => {
    if (page.parentPageId !== null && !pages.has(page.parentPageId)) {
      errors.push(`Page ${pageId} references non-existent parent ${page.parentPageId}`);
    }

    page.choices.forEach((choice, index) => {
      if (choice.nextPageId !== null && !pages.has(choice.nextPageId)) {
        errors.push(
          `Page ${pageId} choice ${index} references non-existent page ${choice.nextPageId}`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
