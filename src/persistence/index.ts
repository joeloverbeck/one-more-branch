export { Storage, storage } from './storage';

export {
  STORIES_DIR,
  ensureStoriesDir,
  getStoryDir,
  getStoryFilePath,
  getPageFilePath,
} from './file-utils';

export { lockManager, withLock } from './lock-manager';

export {
  deleteStory,
  getPageCount,
  listStories,
  loadStory,
  saveStory,
  storyExists,
  updateStory,
} from './story-repository';

export {
  computeAccumulatedState,
  findEndingPages,
  getMaxPageId,
  loadAllPages,
  loadPage,
  pageExists,
  savePage,
  updateChoiceLink,
  updatePage,
} from './page-repository';
