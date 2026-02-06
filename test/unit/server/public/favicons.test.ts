import fs from 'fs';
import path from 'path';

describe('public favicon assets', () => {
  const publicDir = path.join(__dirname, '../../../../public');
  const requiredAssets = [
    'apple-touch-icon.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'favicon.ico',
    'site.webmanifest',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
  ];

  it.each(requiredAssets)('includes %s', (asset) => {
    const assetPath = path.join(publicDir, asset);
    expect(fs.existsSync(assetPath)).toBe(true);
  });

  it('contains manifest icon references', () => {
    const manifestPath = path.join(publicDir, 'site.webmanifest');
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    expect(manifest).toContain('android-chrome-192x192.png');
    expect(manifest).toContain('android-chrome-512x512.png');
  });
});
