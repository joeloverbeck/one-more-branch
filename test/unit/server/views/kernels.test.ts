import fs from 'fs';
import path from 'path';

describe('kernels page template', () => {
  const kernelsPath = path.join(__dirname, '../../../../src/server/views/pages/kernels.ejs');

  it('includes kernel seed fields, API key input, and result containers', () => {
    expect(fs.existsSync(kernelsPath)).toBe(true);

    const template = fs.readFileSync(kernelsPath, 'utf8');

    expect(template).toContain('<form id="kernel-generate-form">');
    expect(template).toContain('id="thematicInterests"');
    expect(template).toContain('id="emotionalCore"');
    expect(template).toContain('id="sparkLine"');
    expect(template).toContain('id="kernelApiKey"');
    expect(template).toContain('id="generate-kernels-btn"');
    expect(template).toContain('id="kernel-progress-section"');
    expect(template).toContain('id="generated-kernels"');
    expect(template).toContain('id="saved-kernels"');
    expect(template).toContain('<script src="/js/app.js"></script>');
  });
});
