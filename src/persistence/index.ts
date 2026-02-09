export { Storage, storage } from './storage';

export {
  ensureStoriesDir,
  getStoriesDir,
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
  addChoice,
  findEndingPages,
  getMaxPageId,
  loadAllPages,
  loadPage,
  pageExists,
  savePage,
  updateChoiceLink,
  updatePage,
} from './page-repository';
