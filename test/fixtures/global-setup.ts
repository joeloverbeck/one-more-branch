/**
 * Jest globalSetup script.
 * Runs once before all test suites to clean stale temp directories
 * left behind by interrupted test runs.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const STALE_PREFIXES = ['omb-test-storage-', 'omb-test-config-'];

function cleanStaleTestDirs(baseDir: string): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(baseDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const isStale = STALE_PREFIXES.some((prefix) => entry.startsWith(prefix));
    if (!isStale) continue;

    const fullPath = path.join(baseDir, entry);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; skip dirs that are locked by a running test
    }
  }
}

export default function globalSetup(): void {
  // Clean /tmp (current os.tmpdir())
  cleanStaleTestDirs(os.tmpdir());

  // Clean project-local tmp/ (historical accumulation)
  const projectTmp = path.resolve(__dirname, '..', '..', 'tmp');
  cleanStaleTestDirs(projectTmp);
}
