const mockUse = jest.fn();
const mockRouter = { use: mockUse };

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter),
}));

const homeRoutes = {};
const characterRoutes = {};
const characterBrainstormerRoutes = {};
const characterWebRoutes = {};
const chatRoutes = {};
const conceptSeedRoutes = {};
const conceptRoutes = {};
const contentPacketRoutes = {};
const createStoryRoutes = {};
const evolutionRoutes = {};
const kernelEvolutionRoutes = {};
const kernelRoutes = {};
const logRoutes = {};
const playRoutes = {};
const progressRoutes = {};
const spineRoutes = {};
const storyRoutes = {};
const worldbuildingRoutes = {};

jest.mock('@/server/routes/home', () => ({ homeRoutes }));
jest.mock('@/server/routes/characters', () => ({ characterRoutes }));
jest.mock('@/server/routes/character-brainstormer', () => ({ characterBrainstormerRoutes }));
jest.mock('@/server/routes/character-webs', () => ({ characterWebRoutes }));
jest.mock('@/server/routes/chat', () => ({ chatRoutes }));
jest.mock('@/server/routes/concept-seeds', () => ({ conceptSeedRoutes }));
jest.mock('@/server/routes/concepts', () => ({ conceptRoutes }));
jest.mock('@/server/routes/content-packets', () => ({ contentPacketRoutes }));
jest.mock('@/server/routes/create-story', () => ({ createStoryRoutes }));
jest.mock('@/server/routes/evolution', () => ({ evolutionRoutes }));
jest.mock('@/server/routes/kernel-evolution', () => ({ kernelEvolutionRoutes }));
jest.mock('@/server/routes/kernels', () => ({ kernelRoutes }));
jest.mock('@/server/routes/logs', () => ({ logRoutes }));
jest.mock('@/server/routes/play', () => ({ playRoutes }));
jest.mock('@/server/routes/progress', () => ({ progressRoutes }));
jest.mock('@/server/routes/spines', () => ({ spineRoutes }));
jest.mock('@/server/routes/stories', () => ({ storyRoutes }));
jest.mock('@/server/routes/worldbuilding', () => ({ worldbuildingRoutes }));

import '@/server/routes/index';

describe('root router registration', () => {
  it('mounts the chat routes at /chat', () => {
    expect(mockUse).toHaveBeenCalledWith('/chat', chatRoutes);
  });
});
