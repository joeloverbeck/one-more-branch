import * as fs from 'fs';
import * as path from 'path';

describe('EJS Views Availability', () => {
  const distViewsDir = path.join(__dirname, '../../../dist/server/views');
  const distPublicDir = path.join(__dirname, '../../../dist/public');
  const requiredPublicAssets = [
    'apple-touch-icon.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'favicon.ico',
    'site.webmanifest',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
  ];

  const requiredViews = [
    'pages/home.ejs',
    'pages/error.ejs',
    'pages/new-story.ejs',
    'pages/play.ejs',
    'layouts/main.ejs',
    'partials/header.ejs',
    'partials/footer.ejs',
  ];

  it('should have dist/server/views directory after build', () => {
    expect(fs.existsSync(distViewsDir)).toBe(true);
  });

  it.each(requiredViews)(
    'should have %s view file in dist/server/views',
    (viewFile) => {
      const viewPath = path.join(distViewsDir, viewFile);
      expect(fs.existsSync(viewPath)).toBe(true);
    }
  );

  it('should have matching content between src and dist views', () => {
    const srcViewsDir = path.join(__dirname, '../../../src/server/views');

    for (const viewFile of requiredViews) {
      const srcPath = path.join(srcViewsDir, viewFile);
      const distPath = path.join(distViewsDir, viewFile);

      if (fs.existsSync(srcPath) && fs.existsSync(distPath)) {
        const srcContent = fs.readFileSync(srcPath, 'utf-8');
        const distContent = fs.readFileSync(distPath, 'utf-8');
        expect(distContent).toBe(srcContent);
      }
    }
  });

  it.each(requiredPublicAssets)('should have %s in dist/public after build', (assetFile) => {
    const assetPath = path.join(distPublicDir, assetFile);
    expect(fs.existsSync(assetPath)).toBe(true);
  });
});
