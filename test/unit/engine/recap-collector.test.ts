import { collectRecapSummaries } from '@/engine/recap-collector';
import { createChoice, createPage, parseStoryId } from '@/models';
import { storage } from '@/persistence';

describe('recap-collector', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns current page summary for a single-page branch', async () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Opening scene.',
      sceneSummary: 'The story begins.',
      choices: [createChoice('Continue'), createChoice('Wait')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    const entries = await collectRecapSummaries(storyId, page);

    expect(entries).toEqual([{ pageId: 1, summary: 'The story begins.' }]);
  });

  it('returns all ancestor summaries in chronological order', async () => {
    const currentPage = createPage({
      id: 5,
      narrativeText: 'Scene five.',
      sceneSummary: 'Summary five.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 4,
      parentChoiceIndex: 0,
    });
    const page4 = createPage({
      id: 4,
      narrativeText: 'Scene four.',
      sceneSummary: 'Summary four.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 3,
      parentChoiceIndex: 0,
    });
    const page3 = createPage({
      id: 3,
      narrativeText: 'Scene three.',
      sceneSummary: 'Summary three.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 2,
      parentChoiceIndex: 0,
    });
    const page2 = createPage({
      id: 2,
      narrativeText: 'Scene two.',
      sceneSummary: 'Summary two.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 1,
      parentChoiceIndex: 0,
    });
    const page1 = createPage({
      id: 1,
      narrativeText: 'Scene one.',
      sceneSummary: 'Summary one.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    const loadPageSpy = jest.spyOn(storage, 'loadPage').mockImplementation((_, pageId) => {
      const pages = new Map<number, typeof page1>([
        [1, page1],
        [2, page2],
        [3, page3],
        [4, page4],
      ]);
      return Promise.resolve(pages.get(pageId) ?? null);
    });

    const entries = await collectRecapSummaries(storyId, currentPage);

    expect(entries).toEqual([
      { pageId: 1, summary: 'Summary one.' },
      { pageId: 2, summary: 'Summary two.' },
      { pageId: 3, summary: 'Summary three.' },
      { pageId: 4, summary: 'Summary four.' },
      { pageId: 5, summary: 'Summary five.' },
    ]);
    expect(loadPageSpy).toHaveBeenCalledTimes(4);
  });

  it('skips pages with empty sceneSummary', async () => {
    const currentPage = createPage({
      id: 3,
      narrativeText: 'Scene three.',
      sceneSummary: 'Summary three.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 2,
      parentChoiceIndex: 0,
    });
    const page2 = createPage({
      id: 2,
      narrativeText: 'Scene two.',
      sceneSummary: '',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 1,
      parentChoiceIndex: 0,
    });
    const page1 = createPage({
      id: 1,
      narrativeText: 'Scene one.',
      sceneSummary: 'Summary one.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
    });
    jest.spyOn(storage, 'loadPage').mockImplementation((_, pageId) => {
      if (pageId === 2) {
        return Promise.resolve(page2);
      }
      if (pageId === 1) {
        return Promise.resolve(page1);
      }
      return Promise.resolve(null);
    });

    const entries = await collectRecapSummaries(storyId, currentPage);

    expect(entries).toEqual([
      { pageId: 1, summary: 'Summary one.' },
      { pageId: 3, summary: 'Summary three.' },
    ]);
  });

  it('stops when an ancestor page cannot be loaded', async () => {
    const currentPage = createPage({
      id: 4,
      narrativeText: 'Scene four.',
      sceneSummary: 'Summary four.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 3,
      parentChoiceIndex: 0,
    });
    const page3 = createPage({
      id: 3,
      narrativeText: 'Scene three.',
      sceneSummary: 'Summary three.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 2,
      parentChoiceIndex: 0,
    });
    jest.spyOn(storage, 'loadPage').mockImplementation((_, pageId) => {
      if (pageId === 3) {
        return Promise.resolve(page3);
      }
      return Promise.resolve(null);
    });

    const entries = await collectRecapSummaries(storyId, currentPage);

    expect(entries).toEqual([
      { pageId: 3, summary: 'Summary three.' },
      { pageId: 4, summary: 'Summary four.' },
    ]);
  });
});
