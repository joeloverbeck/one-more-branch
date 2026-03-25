import fs from 'fs';
import path from 'path';
import { render as renderEjs } from 'ejs';

describe('create-story page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/create-story.ejs');

  it('renders an inline error container with alert semantics', () => {
    const template = fs.readFileSync(templatePath, 'utf8');
    const renderTemplate = renderEjs as (
      source: string,
      data: {
        title: string;
        savedSpines: Array<{
          id: string;
          name: string;
        }>;
      },
      options: { filename: string }
    ) => string;

    const html = renderTemplate(
      template,
      {
        title: 'Create Story - One More Branch',
        savedSpines: [
          {
            id: 'spine-1',
            name: 'Test Spine',
          },
        ],
      },
      { filename: templatePath }
    );

    expect(html).toContain('id="create-story-error"');
    expect(html).toContain('class="alert alert-error form-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
  });
});
