import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('knowledge state card toggles on initial page load', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-knowledge' },
      writable: true,
      configurable: true,
    });

    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('binds toggle handlers to server-rendered knowledge state cards and toggles both ways', () => {
    document.body.innerHTML = buildPlayPageHtml({
      knowledgeState: [
        {
          characterName: 'Alice',
          knownFacts: ['Knows the secret passage'],
          falseBeliefs: [],
          secrets: ['Is actually a spy'],
        },
      ],
    });
    loadAppAndInit();

    const details = document.querySelector('.knowledge-state-details') as HTMLElement;
    expect(details).not.toBeNull();
    expect(details.style.display).toBe('none');

    const header = document.querySelector('.knowledge-state-header') as HTMLElement;
    header.click();
    expect(details.style.display).toBe('block');

    header.click();
    expect(details.style.display).toBe('none');
  });
});
