import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('new-story.ejs template field order', () => {
  const templatePath = resolve(__dirname, '../../../../src/server/views/pages/new-story.ejs');
  const template = readFileSync(templatePath, 'utf-8');

  it('should render tone field before startingSituation field', () => {
    const toneIndex = template.indexOf('name="tone"');
    const startingSituationIndex = template.indexOf('name="startingSituation"');

    expect(toneIndex).toBeGreaterThan(-1);
    expect(startingSituationIndex).toBeGreaterThan(-1);
    expect(toneIndex).toBeLessThan(startingSituationIndex);
  });

  it('should use a textarea for the tone field', () => {
    const toneNameIndex = template.indexOf('name="tone"');
    const precedingChunk = template.substring(Math.max(0, toneNameIndex - 200), toneNameIndex);

    expect(precedingChunk).toContain('<textarea');
    expect(precedingChunk).not.toMatch(/<input[^>]*$/);
  });
});
