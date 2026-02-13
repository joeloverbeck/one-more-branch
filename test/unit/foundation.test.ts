import * as fs from 'fs';
import * as path from 'path';

describe('Project Foundation', () => {
  it('should have TypeScript configured correctly', () => {
    // Verify tsconfig can be loaded
    const tsconfigPath = path.join(__dirname, '../../tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) as {
      compilerOptions: { strict: boolean };
    };
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('should have required source directories', () => {
    const requiredDirs = ['src/models', 'src/persistence', 'src/llm', 'src/engine', 'src/server'];

    requiredDirs.forEach((dir) => {
      const fullPath = path.join(__dirname, '../..', dir);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  it('should have required test directories', () => {
    const requiredDirs = [
      'test/unit',
      'test/integration',
      'test/e2e',
      'test/performance',
      'test/memory',
      'test/fixtures',
    ];

    requiredDirs.forEach((dir) => {
      const fullPath = path.join(__dirname, '../..', dir);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  it('should have stories directory for runtime data', () => {
    const storiesPath = path.join(__dirname, '../../stories');
    expect(fs.existsSync(storiesPath)).toBe(true);
  });
});
