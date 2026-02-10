import { getStoriesDir } from '../src/persistence/file-utils.js';
import { migrateStoriesToKeyedEntries } from '../src/persistence/migrate-keyed-entries.js';

export async function runMigration(): Promise<void> {
  const storiesDir = getStoriesDir();
  const report = await migrateStoriesToKeyedEntries(storiesDir);
  console.log(
    `Migration complete: ${report.storiesProcessed} stories, ${report.pagesVisited} pages visited, ${report.pagesMigrated} pages migrated, ${report.warnings} warnings.`,
  );
}

if (require.main === module) {
  runMigration().catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  });
}
