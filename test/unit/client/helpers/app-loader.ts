import fs from 'fs';
import path from 'path';

const APP_JS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../../public/js/app.js'),
  'utf8'
);

/**
 * Loads app.js into the jsdom global scope and fires DOMContentLoaded.
 * Since app.js is an IIFE that attaches everything via event listeners,
 * this is the only way to exercise it without exports.
 */
export function loadAppAndInit(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function(APP_JS_SOURCE);
  run();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

/**
 * Loads app.js but does NOT fire DOMContentLoaded.
 * Useful when you need to set up DOM before init runs.
 */
export function loadAppSource(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function(APP_JS_SOURCE);
  run();
}

/**
 * Fires DOMContentLoaded on the document.
 */
export function fireDomContentLoaded(): void {
  document.dispatchEvent(new Event('DOMContentLoaded'));
}
