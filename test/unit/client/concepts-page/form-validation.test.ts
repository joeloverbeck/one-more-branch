import { buildConceptsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('concepts page form validation', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(): void {
    document.body.innerHTML = buildConceptsPageHtml();
    loadAppAndInit();
  }

  it('blocks generate when required API key is empty', () => {
    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const reportValiditySpy = jest.spyOn(apiKeyInput, 'reportValidity').mockReturnValue(false);

    const generateBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    generateBtn.click();

    expect(reportValiditySpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows inline error when no seed fields are provided', () => {
    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    apiKeyInput.value = 'sk-or-valid-test-key-12345';

    const generateBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    generateBtn.click();

    expect(fetchMock).not.toHaveBeenCalled();
    const errorDiv = document.querySelector('.alert-error');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe('At least one concept seed field is required');
  });
});
