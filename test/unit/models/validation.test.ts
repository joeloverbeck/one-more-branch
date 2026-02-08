import { createChoice } from '@/models/choice';
import { PageId } from '@/models/id';
import { createPage } from '@/models/page';
import { createStory } from '@/models/story';
import {
  validateNoCycle,
  validatePage,
  validateStory,
  validateStoryIntegrity,
} from '@/models/validation';

describe('Validation', () => {
  describe('validateStory', () => {
    it('returns valid=true for story with characterConcept >= 10 chars', () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A brave knight seeking glory and adventure',
      });

      const result = validateStory(story);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns valid=false with short-length error for < 10 chars", () => {
      const story = { ...createStory({ title: 'Test Story', characterConcept: 'Valid enough' }), characterConcept: 'short' };

      const result = validateStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Character concept is too short (minimum 10 characters)');
    });

    it("returns valid=false with long-length error for > 5000 chars", () => {
      const story = {
        ...createStory({ title: 'Test Story', characterConcept: 'Valid enough' }),
        characterConcept: 'a'.repeat(5001),
      };

      const result = validateStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Character concept is too long (maximum 5000 characters)');
    });

    it("returns valid=false with structure error for non-Story input", () => {
      const result = validateStory({ characterConcept: 'missing required fields' });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Object is not a valid Story structure']);
    });
  });

  describe('validatePage', () => {
    it('returns valid=true for page with narrativeText >= 50 chars and 2-5 choices', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(50),
        choices: [createChoice('Option A'), createChoice('Option B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const result = validatePage(page);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns valid=false with short narrative error for < 50 chars", () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(49),
        choices: [createChoice('Option A'), createChoice('Option B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const result = validatePage(page);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Narrative text is too short (minimum 50 characters)');
    });

    it("returns valid=false with long narrative error for > 10000 chars", () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(10001),
        choices: [createChoice('Option A'), createChoice('Option B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const result = validatePage(page);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Narrative text is too long (maximum 10000 characters)');
    });

    it("returns valid=false with min-choice error for non-ending with 1 choice", () => {
      // Create a valid non-ending page first
      const basePage = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });

      // Modify to have only 1 choice (below min of 2)
      const invalidPage = {
        ...basePage,
        choices: [createChoice('Only option')],
      };

      const result = validatePage(invalidPage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Non-ending pages must have at least 2 choices');
    });

    it("returns valid=false with max-choice error for non-ending with 6 choices", () => {
      // Create a valid non-ending page first
      const basePage = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });

      // Modify to have 6 choices (exceeds max of 5)
      const invalidPage = {
        ...basePage,
        choices: [
          createChoice('A'),
          createChoice('B'),
          createChoice('C'),
          createChoice('D'),
          createChoice('E'),
          createChoice('F'),
        ],
      };

      const result = validatePage(invalidPage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too many choices (maximum 5)');
    });

    it("returns valid=false with ending-choice error for ending page with choices", () => {
      // Create a valid non-ending page first, then modify to test the invariant
      const basePage = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('Choice A'), createChoice('Choice B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });

      // Modify to create an invalid ending page with choices
      const invalidPage = {
        ...basePage,
        isEnding: true,
        choices: [createChoice('Should not exist')],
      };

      const result = validatePage(invalidPage);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Ending pages must have no choices');
    });

    it("returns valid=false with duplicate-choice error for duplicate choices", () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('Go north'), createChoice('go NORTH')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      const result = validatePage(page);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate choice texts detected');
    });
  });

  describe('validateNoCycle', () => {
    it('returns valid=true when no cycles exist', () => {
      const page1 = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A', 2 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const page2 = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A', 3 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });
      const page3 = createPage({
        id: 3 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 2 as PageId,
        parentChoiceIndex: 0,
      });

      const pages = new Map<PageId, ReturnType<typeof createPage>>([
        [page1.id, page1],
        [page2.id, page2],
        [page3.id, page3],
      ]);

      const result = validateNoCycle(page3, id => pages.get(id));
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid=false when choice points to ancestor page', () => {
      const page1 = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A', 2 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const page2 = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A', 3 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });
      const page3 = createPage({
        id: 3 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('Loop', 1 as PageId), createChoice('Continue')],
        isEnding: false,
        parentPageId: 2 as PageId,
        parentChoiceIndex: 0,
      });

      const pages = new Map<PageId, ReturnType<typeof createPage>>([
        [page1.id, page1],
        [page2.id, page2],
        [page3.id, page3],
      ]);

      const result = validateNoCycle(page3, id => pages.get(id));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Choice 0 creates a cycle by pointing to ancestor page 1');
    });
  });

  describe('validateStoryIntegrity', () => {
    it('returns valid=true for story with page 1 and valid references', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A brave knight seeking adventure' });
      const page1 = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A', 2 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const page2 = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });
      const pages = new Map<PageId, ReturnType<typeof createPage>>([
        [page1.id, page1],
        [page2.id, page2],
      ]);

      const result = validateStoryIntegrity(story, pages);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns valid=false with 'Story must have page 1' when pages map is empty", () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A brave knight seeking adventure' });
      const pages = new Map<PageId, ReturnType<typeof createPage>>();

      const result = validateStoryIntegrity(story, pages);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Story must have page 1']);
    });

    it('returns valid=false when parent references non-existent page', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A brave knight seeking adventure' });
      const page1 = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const orphan = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 99 as PageId,
        parentChoiceIndex: 0,
      });
      const pages = new Map<PageId, ReturnType<typeof createPage>>([
        [page1.id, page1],
        [orphan.id, orphan],
      ]);

      const result = validateStoryIntegrity(story, pages);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Page 2 references non-existent parent 99');
    });

    it('returns valid=false when choice references non-existent page', () => {
      const story = createStory({ title: 'Test Story', characterConcept: 'A brave knight seeking adventure' });
      const page1 = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A', 3 as PageId), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const page2 = createPage({
        id: 2 as PageId,
        narrativeText: 'A'.repeat(60),
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 1,
      });
      const pages = new Map<PageId, ReturnType<typeof createPage>>([
        [page1.id, page1],
        [page2.id, page2],
      ]);

      const result = validateStoryIntegrity(story, pages);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Page 1 choice 0 references non-existent page 3');
    });
  });
});
