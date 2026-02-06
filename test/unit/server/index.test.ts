import path from 'path';
import type { Request, Response } from 'express';
import { createApp } from '../../../src/server';
import { storyEngine } from '../../../src/engine';

type RouterLayer = {
  handle?: {
    stack?: Array<{
      route?: {
        path?: string;
        methods?: Record<string, boolean>;
        stack?: Array<{ handle: (req: Request, res: Response) => void }>;
      };
    }>;
  };
  name?: string;
};

describe('server app setup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an express application from createApp()', () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();

    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
  });

  it("sets view engine to 'ejs'", () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();

    expect(app.get('view engine')).toBe('ejs');
  });

  it('configures a views directory path', () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();
    const views = app.get('views') as string;

    expect(typeof views).toBe('string');
    expect(path.isAbsolute(views)).toBe(true);
    expect(views.endsWith(path.join('src', 'server', 'views'))).toBe(true);
  });

  it('registers static middleware for the public directory', () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();
    const stack = (app as unknown as { _router: { stack: Array<{ name: string }> } })._router.stack;

    expect(stack.some((layer) => layer.name === 'serveStatic')).toBe(true);
  });

  it('registers JSON and URL-encoded body parser middleware', () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();
    const stack = (app as unknown as { _router: { stack: Array<{ name: string }> } })._router.stack;

    expect(stack.some((layer) => layer.name === 'jsonParser')).toBe(true);
    expect(stack.some((layer) => layer.name === 'urlencodedParser')).toBe(true);
  });

  it('registers the error handler after the router', () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();
    const stack = (app as unknown as { _router: { stack: Array<{ name: string }> } })._router.stack;
    const routerIndex = stack.findIndex((layer) => layer.name === 'router');
    const errorHandlerIndex = stack.findIndex((layer) => layer.name === 'errorHandler');

    expect(routerIndex).toBeGreaterThan(-1);
    expect(errorHandlerIndex).toBeGreaterThan(routerIndex);
  });

  it('responds to GET / with 200 status from placeholder route', () => {
    jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    const app = createApp();
    const stack = (app as unknown as { _router: { stack: RouterLayer[] } })._router.stack;
    const routerLayer = stack.find((layer) => layer.name === 'router');
    const routeLayer = routerLayer?.handle?.stack?.find(
      (layer) => layer.route?.path === '/' && layer.route?.methods?.get,
    );

    const status = jest.fn().mockReturnThis();
    const send = jest.fn();

    routeLayer?.route?.stack?.[0]?.handle({} as Request, {
      status,
      send,
    } as unknown as Response);

    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith('One More Branch - Coming Soon');
  });

  it('calls storyEngine.init() during app creation', () => {
    const initSpy = jest.spyOn(storyEngine, 'init').mockImplementation(() => {
      // no-op to avoid persistence side effects in unit test
    });

    createApp();

    expect(initSpy).toHaveBeenCalledTimes(1);
  });
});
