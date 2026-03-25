import fs from 'fs';
import path from 'path';

describe('concept seeds page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/concept-seeds.ejs');

  it('includes the dedicated inline error element and loading overlay', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('id="concept-seeds-page"');
    expect(template).toContain('id="concept-seeds-error"');
    expect(template).toContain('role="alert"');
    expect(template).toContain('aria-live="polite"');
    expect(template).toContain('id="loading"');
  });
});
