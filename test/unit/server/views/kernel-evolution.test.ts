import fs from 'fs';
import path from 'path';

describe('kernel evolution page template', () => {
  const templatePath = path.join(
    __dirname,
    '../../../../src/server/views/pages/kernel-evolution.ejs'
  );

  it('includes the dedicated inline error element and loading overlay', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('id="kernel-evolution-page"');
    expect(template).toContain('id="kernel-evolution-error"');
    expect(template).toContain('role="alert"');
    expect(template).toContain('aria-live="polite"');
    expect(template).toContain('id="kernel-evo-loading"');
  });
});
