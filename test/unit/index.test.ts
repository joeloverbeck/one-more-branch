describe('entry point bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not start server when module is imported', () => {
    const loadConfig = jest.fn();
    const startServer = jest.fn();

    jest.doMock('../../src/config/index', () => ({
      loadConfig,
    }));
    jest.doMock('../../src/server/index', () => ({
      startServer,
    }));

    jest.isolateModules(() => {
      require('../../src/index');
    });

    expect(loadConfig).not.toHaveBeenCalled();
    expect(startServer).not.toHaveBeenCalled();
  });

  it('exports bootstrap function', () => {
    const loadConfig = jest.fn();
    const startServer = jest.fn();

    jest.doMock('../../src/config/index', () => ({
      loadConfig,
    }));
    jest.doMock('../../src/server/index', () => ({
      startServer,
    }));

    let bootstrap: (() => void) | undefined;
    jest.isolateModules(() => {
      ({ bootstrap } = require('../../src/index') as { bootstrap: () => void });
    });

    expect(typeof bootstrap).toBe('function');
  });

  it('loads config before starting server when bootstrap is called', () => {
    const callOrder: string[] = [];
    const loadConfig = jest.fn(() => {
      callOrder.push('loadConfig');
    });
    const startServer = jest.fn(() => {
      callOrder.push('startServer');
    });

    jest.doMock('../../src/config/index', () => ({
      loadConfig,
    }));
    jest.doMock('../../src/server/index', () => ({
      startServer,
    }));

    jest.isolateModules(() => {
      const { bootstrap } = require('../../src/index') as { bootstrap: () => void };
      bootstrap();
    });

    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(startServer).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['loadConfig', 'startServer']);
  });
});
