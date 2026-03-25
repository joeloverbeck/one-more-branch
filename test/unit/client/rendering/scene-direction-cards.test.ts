import fs from 'fs';
import path from 'path';

/**
 * Tests for the scene direction renderer (04f-scene-direction-renderer.js).
 *
 * We load the renderer + its escapeHtml dependency into jsdom by evaluating
 * the relevant source files inside a shared function scope.
 */

/* eslint-disable @typescript-eslint/no-unsafe-call */

const utilsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../../../public/js/src/02-utils.js'),
  'utf8'
);
const rendererSrc = fs.readFileSync(
  path.resolve(__dirname, '../../../../public/js/src/04f-scene-direction-renderer.js'),
  'utf8'
);

interface RendererFns {
  renderSceneDirectionOptions: (
    options: SceneOption[],
    container: HTMLElement,
    onSelect?: (opt: SceneOption) => void
  ) => void;
  captureSceneDirectionEdits: (container: HTMLElement) => SceneOption | null;
  getSelectedSceneDirection: () => SceneOption | null;
  clearSelectedSceneDirection: () => void;
}

interface SceneOption {
  scenePurpose: string;
  valuePolarityShift: string;
  pacingMode: string;
  sceneDirection: string;
  dramaticJustification: string;
}

function loadRenderer(): RendererFns {
  // Wrap both sources so we can return the functions we need
  const combined = `
    ${utilsSrc}
    ${rendererSrc}
    return {
      renderSceneDirectionOptions: renderSceneDirectionOptions,
      captureSceneDirectionEdits: captureSceneDirectionEdits,
      getSelectedSceneDirection: getSelectedSceneDirection,
      clearSelectedSceneDirection: clearSelectedSceneDirection,
    };
  `;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(combined);
  return factory() as RendererFns;
}

function makeOptions(count = 2): SceneOption[] {
  return Array.from({ length: count }, (_, i) => ({
    scenePurpose: 'CONFRONTATION',
    valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
    pacingMode: 'ACCELERATING',
    sceneDirection: `Direction ${i + 1}`,
    dramaticJustification: `Justification ${i + 1}`,
  }));
}

describe('scene direction cards', () => {
  let fns: RendererFns;
  let container: HTMLDivElement;

  beforeEach(() => {
    fns = loadRenderer();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a "Why?" toggle button on each card', () => {
    fns.renderSceneDirectionOptions(makeOptions(3), container);

    const toggles = container.querySelectorAll('.scene-direction-why-toggle');
    expect(toggles.length).toBe(3);
    toggles.forEach((btn) => {
      expect(btn.textContent).toBe('Why?');
      expect((btn as HTMLButtonElement).type).toBe('button');
    });
  });

  it('justification collapsible is NOT expanded by default', () => {
    fns.renderSceneDirectionOptions(makeOptions(), container);

    const collapsibles = container.querySelectorAll('.scene-direction-justification-collapsible');
    expect(collapsibles.length).toBe(2);
    collapsibles.forEach((el) => {
      expect(el.classList.contains('expanded')).toBe(false);
    });
  });

  it('clicking "Why?" toggles expanded class and button text', () => {
    fns.renderSceneDirectionOptions(makeOptions(), container);

    const toggle = container.querySelector('.scene-direction-why-toggle') as HTMLButtonElement;
    const collapsible = container.querySelector(
      '.scene-direction-justification-collapsible'
    ) as HTMLElement;

    // First click: expand
    toggle.click();
    expect(collapsible.classList.contains('expanded')).toBe(true);
    expect(toggle.textContent).toBe('Hide');

    // Second click: collapse
    toggle.click();
    expect(collapsible.classList.contains('expanded')).toBe(false);
    expect(toggle.textContent).toBe('Why?');
  });

  it('clicking "Why?" does NOT select the card (stopPropagation)', () => {
    const onSelect = jest.fn();
    fns.renderSceneDirectionOptions(makeOptions(), container, onSelect);

    const toggle = container.querySelector('.scene-direction-why-toggle') as HTMLButtonElement;
    toggle.click();

    // Card should not be selected
    expect(onSelect).not.toHaveBeenCalled();
    expect(fns.getSelectedSceneDirection()).toBeNull();
    const cards = container.querySelectorAll('.scene-direction-card-selected');
    expect(cards.length).toBe(0);
  });

  it('selecting a card auto-expands its justification', () => {
    fns.renderSceneDirectionOptions(makeOptions(), container);

    const card = container.querySelector('.scene-direction-card') as HTMLElement;
    card.click();

    const collapsible = card.querySelector(
      '.scene-direction-justification-collapsible'
    ) as HTMLElement;
    expect(collapsible.classList.contains('expanded')).toBe(true);

    const toggle = card.querySelector('.scene-direction-why-toggle') as HTMLButtonElement;
    expect(toggle.textContent).toBe('Hide');
  });

  it('deselecting a card collapses its justification', () => {
    fns.renderSceneDirectionOptions(makeOptions(), container);

    const cards = container.querySelectorAll('.scene-direction-card');
    const firstCard = cards[0] as HTMLElement;
    const secondCard = cards[1] as HTMLElement;

    // Select first card
    firstCard.click();
    const firstCollapsible = firstCard.querySelector(
      '.scene-direction-justification-collapsible'
    ) as HTMLElement;
    expect(firstCollapsible.classList.contains('expanded')).toBe(true);

    // Select second card — first should collapse
    secondCard.click();
    expect(firstCollapsible.classList.contains('expanded')).toBe(false);
    const firstToggle = firstCard.querySelector('.scene-direction-why-toggle') as HTMLButtonElement;
    expect(firstToggle.textContent).toBe('Why?');

    // Second should be expanded
    const secondCollapsible = secondCard.querySelector(
      '.scene-direction-justification-collapsible'
    ) as HTMLElement;
    expect(secondCollapsible.classList.contains('expanded')).toBe(true);
  });

  it('captureSceneDirectionEdits captures justification even when collapsed', () => {
    const options = makeOptions();
    fns.renderSceneDirectionOptions(options, container);

    // Select a card (this expands justification and shows textareas)
    const card = container.querySelector('.scene-direction-card') as HTMLElement;
    card.click();

    // Edit the justification textarea
    const textarea = card.querySelector('.scene-direction-justification') as HTMLTextAreaElement;
    textarea.value = 'Edited justification';

    // Manually collapse the justification (simulate user clicking "Hide")
    const toggle = card.querySelector('.scene-direction-why-toggle') as HTMLButtonElement;
    toggle.click();

    // Justification should be collapsed
    const collapsible = card.querySelector(
      '.scene-direction-justification-collapsible'
    ) as HTMLElement;
    expect(collapsible.classList.contains('expanded')).toBe(false);

    // captureSceneDirectionEdits should still capture the value
    const result = fns.captureSceneDirectionEdits(container);
    expect(result).not.toBeNull();
    expect(result!.dramaticJustification).toBe('Edited justification');
  });

  it('wraps justification inside a collapsible wrapper structure', () => {
    fns.renderSceneDirectionOptions(makeOptions(1), container);

    const card = container.querySelector('.scene-direction-card') as HTMLElement;
    const wrapper = card.querySelector('.scene-direction-justification-wrapper');
    expect(wrapper).not.toBeNull();

    const toggle = wrapper!.querySelector('.scene-direction-why-toggle');
    expect(toggle).not.toBeNull();

    const collapsible = wrapper!.querySelector('.scene-direction-justification-collapsible');
    expect(collapsible).not.toBeNull();

    const justificationField = collapsible!.querySelector('.scene-direction-field');
    expect(justificationField).not.toBeNull();
  });
});
