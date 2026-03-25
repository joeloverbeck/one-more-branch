import fs from 'fs';
import path from 'path';
import vm from 'vm';

interface LoadingOverlaySession {
  begin: (progressId: string) => void;
  end: () => void;
  withProgress: <T>(run: (progressId: string) => Promise<T> | T) => Promise<T>;
  isActive: () => boolean;
}

interface LoadingOverlaySessionOptions {
  overlayElement: HTMLElement;
  progressElement: HTMLElement;
  buttonElement?: HTMLButtonElement;
  buttonElements?: HTMLButtonElement[];
  onShow?: () => void;
  onHide?: () => void;
}

interface LoadingProgressController {
  start: (progressId: string) => void;
  stop: () => void;
}

type CreateLoadingOverlaySession = (
  options: LoadingOverlaySessionOptions
) => LoadingOverlaySession;

const SESSION_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../../public/js/src/03a-loading-overlay-session.js'),
  'utf8'
);

function loadCreateLoadingOverlaySession(
  createLoadingProgressController: (progressElement: HTMLElement) => LoadingProgressController,
  createProgressId: () => string
): CreateLoadingOverlaySession {
  const context = vm.createContext({
    createLoadingProgressController,
    createProgressId,
  });
  const script = new vm.Script(SESSION_SOURCE + '\ncreateLoadingOverlaySession;');

  return script.runInContext(context) as CreateLoadingOverlaySession;
}

describe('loading overlay session helper', () => {
  let overlayElement: HTMLDivElement;
  let progressElement: HTMLDivElement;
  let primaryButton: HTMLButtonElement;
  let secondaryButton: HTMLButtonElement;
  let loadingProgress: LoadingProgressController;
  let startSpy: jest.MockedFunction<(progressId: string) => void>;
  let stopSpy: jest.MockedFunction<() => void>;
  let createLoadingProgressController: jest.MockedFunction<
    (progressElement: HTMLElement) => LoadingProgressController
  >;
  let createProgressId: jest.MockedFunction<() => string>;
  let createLoadingOverlaySession: CreateLoadingOverlaySession;

  beforeEach(() => {
    overlayElement = document.createElement('div');
    overlayElement.style.display = 'none';

    progressElement = document.createElement('div');
    primaryButton = document.createElement('button');
    secondaryButton = document.createElement('button');
    startSpy = jest.fn<(progressId: string) => void>();
    stopSpy = jest.fn<() => void>();

    loadingProgress = {
      start: (progressId): void => {
        startSpy(progressId);
      },
      stop: (): void => {
        stopSpy();
      },
    };

    createLoadingProgressController = jest
      .fn<(progressElement: HTMLElement) => LoadingProgressController>()
      .mockReturnValue(loadingProgress);
    createProgressId = jest.fn<() => string>().mockReturnValue('generated-progress-id');
    createLoadingOverlaySession = loadCreateLoadingOverlaySession(
      createLoadingProgressController,
      createProgressId
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('begins and ends a session while updating visibility, buttons, callbacks, and active state', () => {
    const events: string[] = [];
    const session = createLoadingOverlaySession({
      overlayElement,
      progressElement,
      buttonElements: [primaryButton, secondaryButton],
      onShow: () => events.push('show:' + overlayElement.style.display),
      onHide: () => events.push('hide:' + overlayElement.style.display),
    });

    expect(createLoadingProgressController).toHaveBeenCalledWith(progressElement);
    expect(session.isActive()).toBe(false);

    session.begin('progress-1');

    expect(overlayElement.style.display).toBe('flex');
    expect(primaryButton.disabled).toBe(true);
    expect(secondaryButton.disabled).toBe(true);
    expect(startSpy).toHaveBeenCalledWith('progress-1');
    expect(session.isActive()).toBe(true);

    session.end();

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(overlayElement.style.display).toBe('none');
    expect(primaryButton.disabled).toBe(false);
    expect(secondaryButton.disabled).toBe(false);
    expect(session.isActive()).toBe(false);
    expect(events).toEqual(['show:flex', 'hide:none']);
  });

  it('treats end() as a safe no-op when inactive', () => {
    const session = createLoadingOverlaySession({
      overlayElement,
      progressElement,
    });

    session.end();

    expect(stopSpy).not.toHaveBeenCalled();
    expect(overlayElement.style.display).toBe('none');
    expect(session.isActive()).toBe(false);
  });

  it('ends the prior session before beginning a new one', () => {
    const events: string[] = [];
    const session = createLoadingOverlaySession({
      overlayElement,
      progressElement,
      onHide: () => events.push('hide'),
      onShow: () => events.push('show'),
    });

    session.begin('progress-1');
    session.begin('progress-2');

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenNthCalledWith(1, 'progress-1');
    expect(startSpy).toHaveBeenNthCalledWith(2, 'progress-2');
    expect(events).toEqual(['show', 'hide', 'show']);
    expect(session.isActive()).toBe(true);
  });

  it('creates a progress id internally and cleans up after successful work', async () => {
    const session = createLoadingOverlaySession({
      overlayElement,
      progressElement,
      buttonElement: primaryButton,
    });

    const result = await session.withProgress((progressId) => {
      expect(progressId).toBe('generated-progress-id');
      expect(overlayElement.style.display).toBe('flex');
      expect(primaryButton.disabled).toBe(true);
      return 'done';
    });

    expect(result).toBe('done');
    expect(createProgressId).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledWith('generated-progress-id');
    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(overlayElement.style.display).toBe('none');
    expect(primaryButton.disabled).toBe(false);
    expect(session.isActive()).toBe(false);
  });

  it('rethrows the original error and still cleans up after failed work', async () => {
    const session = createLoadingOverlaySession({
      overlayElement,
      progressElement,
      buttonElements: [primaryButton],
    });
    const error = new Error('generation failed');

    await expect(
      session.withProgress(() => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(overlayElement.style.display).toBe('none');
    expect(primaryButton.disabled).toBe(false);
    expect(session.isActive()).toBe(false);
  });

  it('prefers buttonElements over buttonElement and leaves buttons untouched when omitted', () => {
    const sessionWithPrecedence = createLoadingOverlaySession({
      overlayElement,
      progressElement,
      buttonElement: primaryButton,
      buttonElements: [secondaryButton],
    });

    sessionWithPrecedence.begin('progress-1');
    expect(primaryButton.disabled).toBe(false);
    expect(secondaryButton.disabled).toBe(true);
    sessionWithPrecedence.end();

    const sessionWithoutButtons = createLoadingOverlaySession({
      overlayElement,
      progressElement,
    });

    sessionWithoutButtons.begin('progress-2');
    expect(primaryButton.disabled).toBe(false);
    expect(secondaryButton.disabled).toBe(false);
    sessionWithoutButtons.end();
  });

  it('supports single-node overlays where overlayElement and progressElement are the same node', async () => {
    const singleNodeOverlay = document.createElement('div');
    singleNodeOverlay.style.display = 'none';
    const session = createLoadingOverlaySession({
      overlayElement: singleNodeOverlay,
      progressElement: singleNodeOverlay,
    });

    await session.withProgress((progressId) => {
      expect(progressId).toBe('generated-progress-id');
      expect(singleNodeOverlay.style.display).toBe('flex');
    });

    expect(createLoadingProgressController).toHaveBeenLastCalledWith(singleNodeOverlay);
    expect(singleNodeOverlay.style.display).toBe('none');
  });
});
