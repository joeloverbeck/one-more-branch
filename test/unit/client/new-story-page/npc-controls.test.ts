import { buildNewStoryPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('NPC controls', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    // Prevent form submit from causing issues
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'completed' }),
    });

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'npc-test-uuid' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(options = {}): void {
    document.body.innerHTML = buildNewStoryPageHtml(options);
    loadAppAndInit();
  }

  it('adds NPC entry on add button click', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    nameInput.value = 'Gandalf';
    descInput.value = 'A wise wizard who guides heroes';
    addBtn.click();

    const entries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(entries.length).toBe(1);

    const name = entries[0].querySelector('.npc-entry-header strong');
    expect(name?.textContent).toBe('Gandalf');

    const desc = entries[0].querySelector('.npc-entry-description');
    expect(desc?.textContent).toBe('A wise wizard who guides heroes');
  });

  it('clears inputs after adding NPC', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    nameInput.value = 'Sauron';
    descInput.value = 'The dark lord';
    addBtn.click();

    expect(nameInput.value).toBe('');
    expect(descInput.value).toBe('');
  });

  it('focuses name input after adding NPC', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    const focusSpy = jest.spyOn(nameInput, 'focus');

    nameInput.value = 'Frodo';
    descInput.value = 'A hobbit';
    addBtn.click();

    expect(focusSpy).toHaveBeenCalled();
  });

  it('ignores empty name', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    nameInput.value = '';
    descInput.value = 'Some description';
    addBtn.click();

    const entries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(entries.length).toBe(0);
  });

  it('ignores empty description', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    nameInput.value = 'Gandalf';
    descInput.value = '';
    addBtn.click();

    const entries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(entries.length).toBe(0);
  });

  it('removes NPC entry on remove button click', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    // Add two NPCs
    nameInput.value = 'Gandalf';
    descInput.value = 'Wizard';
    addBtn.click();

    nameInput.value = 'Sauron';
    descInput.value = 'Dark lord';
    addBtn.click();

    const entries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(entries.length).toBe(2);

    // Remove the first one
    const removeBtn = entries[0].querySelector('.npc-remove-btn') as HTMLButtonElement;
    removeBtn.click();

    const remainingEntries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(remainingEntries.length).toBe(1);
    expect(
      remainingEntries[0].querySelector('.npc-entry-header strong')?.textContent
    ).toBe('Sauron');
  });

  it('removes server-rendered NPC entries', () => {
    setupPage({
      npcs: [
        { name: 'Pre-existing NPC', description: 'Already here' },
      ],
    });

    const entries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(entries.length).toBe(1);

    const removeBtn = entries[0].querySelector('.npc-remove-btn') as HTMLButtonElement;
    removeBtn.click();

    const remainingEntries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(remainingEntries.length).toBe(0);
  });

  it('can add multiple NPCs', () => {
    setupPage();

    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;

    ['Alice', 'Bob', 'Charlie'].forEach((name) => {
      nameInput.value = name;
      descInput.value = `Description for ${name}`;
      addBtn.click();
    });

    const entries = document.querySelectorAll('#npc-entries .npc-entry');
    expect(entries.length).toBe(3);
  });
});
