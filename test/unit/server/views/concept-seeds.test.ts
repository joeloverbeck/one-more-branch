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

  it('uses concept-field-value spans and data-field-key attributes for inline editing', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('concept-field-value');
    expect(template).toContain('data-field-key="name"');
    expect(template).toContain('data-field-key="oneLineHook"');
    expect(template).toContain('data-field-key="coreCompetence"');
    expect(template).toContain('data-field-key="actionVerbs"');
    expect(template).toContain('data-field-type="text"');
    expect(template).toContain('data-field-type="array"');
  });

  it('does not contain the Edit Name button', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).not.toContain('seed-edit-btn');
    expect(template).not.toContain('Edit Name');
  });
});
