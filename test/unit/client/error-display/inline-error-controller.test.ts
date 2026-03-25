import fs from 'fs';
import path from 'path';
import vm from 'vm';

interface InlineErrorController {
  show: (message: string) => void;
  clear: () => void;
}

type CreateInlineErrorController = (errorElement: HTMLElement) => InlineErrorController;

const ERROR_DISPLAY_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../../public/js/src/07-error-display.js'),
  'utf8'
);

function loadCreateInlineErrorController(): CreateInlineErrorController {
  const context = vm.createContext({});
  const script = new vm.Script(ERROR_DISPLAY_SOURCE + '\ncreateInlineErrorController;');

  return script.runInContext(context) as CreateInlineErrorController;
}

describe('inline error controller helper', () => {
  let createInlineErrorController: CreateInlineErrorController;

  beforeEach(() => {
    createInlineErrorController = loadCreateInlineErrorController();
  });

  it('shows and clears a provided error element without DOM lookup', () => {
    const errorElement = document.createElement('div');
    errorElement.style.display = 'none';

    const controller = createInlineErrorController(errorElement);

    controller.show('Inline error message');
    expect(errorElement.textContent).toBe('Inline error message');
    expect(errorElement.style.display).toBe('block');

    controller.clear();
    expect(errorElement.textContent).toBe('');
    expect(errorElement.style.display).toBe('none');
  });

  it('fails fast when no error element is provided', () => {
    expect(() => {
      createInlineErrorController(undefined as unknown as HTMLElement);
    }).toThrow('createInlineErrorController requires an error element');
  });
});
