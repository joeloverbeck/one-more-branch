#!/usr/bin/env node

/**
 * Migration script for promise epoch fields.
 *
 * Migrates existing page JSON files from old `age` field format to the new
 * `detectedAtPromiseEpoch` + `promiseAgeEpoch` format.
 *
 * Usage:
 *   node scripts/migrate-promise-epochs.js [--dry-run] [stories-dir]
 *
 * Options:
 *   --dry-run     Show what would change without writing files
 *   stories-dir   Path to stories directory (default: ../stories relative to script)
 */

const fs = require('fs');
const path = require('path');

const nonFlagArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const STORIES_DIR = nonFlagArgs.length > 0
  ? path.resolve(nonFlagArgs[0])
  : path.join(__dirname, '..', 'stories');
const DRY_RUN = process.argv.includes('--dry-run');

function migratePagePromiseEpochs(pageData, parentMigratedPromises) {
  const pageId = pageData.id;
  const promiseAgeEpoch = pageId - 1;
  let changed = false;

  if (pageData.promiseAgeEpoch !== promiseAgeEpoch) {
    pageData.promiseAgeEpoch = promiseAgeEpoch;
    changed = true;
  }

  const promises = pageData.accumulatedPromises;
  if (!promises || promises.length === 0) return changed;

  for (const p of promises) {
    if (typeof p.detectedAtPromiseEpoch === 'number') continue;

    changed = true;
    if (typeof p.age === 'number') {
      p.detectedAtPromiseEpoch = promiseAgeEpoch - p.age;
    } else if (parentMigratedPromises && parentMigratedPromises.has(p.id)) {
      p.detectedAtPromiseEpoch = parentMigratedPromises.get(p.id);
    } else {
      p.detectedAtPromiseEpoch = 0;
    }
    delete p.age;
  }

  return changed;
}

function getPageFiles(storyDir) {
  return fs
    .readdirSync(storyDir)
    .filter((f) => /^page_\d+\.json$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.replace('page_', '').replace('.json', ''), 10);
      const numB = parseInt(b.replace('page_', '').replace('.json', ''), 10);
      return numA - numB;
    });
}

function main() {
  if (!fs.existsSync(STORIES_DIR)) {
    console.log('No stories/ directory found. Nothing to migrate.');
    return;
  }

  const storyDirs = fs
    .readdirSync(STORIES_DIR)
    .filter((d) => fs.statSync(path.join(STORIES_DIR, d)).isDirectory());

  if (storyDirs.length === 0) {
    console.log('No stories found. Nothing to migrate.');
    return;
  }

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Migrating promise epochs...`);
  let totalMigrated = 0;

  for (const storyId of storyDirs) {
    const storyDir = path.join(STORIES_DIR, storyId);
    const pageFiles = getPageFiles(storyDir);
    let storyMigrated = 0;

    // Build parent promise map as we process pages in order
    let parentPromises = new Map();

    for (const pageFile of pageFiles) {
      const filePath = path.join(storyDir, pageFile);
      const pageData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const changed = migratePagePromiseEpochs(pageData, parentPromises);

      if (changed) {
        storyMigrated++;
        if (!DRY_RUN) {
          fs.writeFileSync(filePath, JSON.stringify(pageData, null, 2) + '\n', 'utf-8');
        }
        console.log(`  ${DRY_RUN ? 'Would migrate' : 'Migrated'}: ${storyId}/${pageFile}`);
      }

      // Build promise map for next page's parent lookup
      const promises = pageData.accumulatedPromises || [];
      parentPromises = new Map();
      for (const p of promises) {
        if (typeof p.detectedAtPromiseEpoch === 'number') {
          parentPromises.set(p.id, p.detectedAtPromiseEpoch);
        }
      }
    }

    if (storyMigrated > 0) {
      console.log(`  Story ${storyId}: ${storyMigrated} page(s) migrated`);
      totalMigrated += storyMigrated;
    } else {
      console.log(`  Story ${storyId}: already up to date`);
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total: ${totalMigrated} page(s) migrated.`);
}

main();
