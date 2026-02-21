import fs from 'fs';
import path from 'path';

describe('evolution page template', () => {
  const evolutionPath = path.join(__dirname, '../../../../src/server/views/pages/evolution.ejs');

  it('exists and includes core evolution page anchors', () => {
    expect(fs.existsSync(evolutionPath)).toBe(true);

    const template = fs.readFileSync(evolutionPath, 'utf8');

    expect(template).toContain('id="evolution-page"');
    expect(template).toContain('id="evolution-kernel-selector"');
    expect(template).toContain('id="evolution-parent-concepts-section"');
    expect(template).toContain('id="evolution-parent-concepts"');
    expect(template).toContain('id="evolution-selection-counter"');
    expect(template).toContain('id="evolutionApiKey"');
    expect(template).toContain('id="evolve-btn"');
    expect(template).toContain('id="evolution-results-section"');
    expect(template).toContain('id="evolution-cards"');
    expect(template).toContain('id="evolution-loading"');
  });

  it('starts with hidden parent/results/loading sections and disabled evolve button', () => {
    const template = fs.readFileSync(evolutionPath, 'utf8');

    expect(template).toMatch(/id="evolution-parent-concepts-section"[^>]*style="display: none;"/);
    expect(template).toMatch(/id="evolution-results-section"[^>]*style="display: none;"/);
    expect(template).toMatch(/id="evolution-loading"[^>]*style="display: none;"/);
    expect(template).toMatch(/id="evolve-btn"[^>]*disabled/);
  });
});
