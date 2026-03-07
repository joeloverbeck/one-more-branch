#!/usr/bin/env node

/**
 * Migration script for choice taxonomy overhaul.
 *
 * Migrates existing page JSON files from old ChoiceType/PrimaryDelta enum
 * values to the new taxonomy.
 *
 * Usage:
 *   node scripts/migrate-choice-taxonomy.js [--dry-run]
 *
 * Options:
 *   --dry-run   Show what would change without writing files
 */

const fs = require('fs');
const path = require('path');

const CHOICE_TYPE_MAP = {
  TACTICAL_APPROACH: 'INTERVENE',
  MORAL_DILEMMA: 'COMMIT',
  IDENTITY_EXPRESSION: 'REVEAL',
  RELATIONSHIP_SHIFT: 'CONNECT',
  RESOURCE_COMMITMENT: 'COMMIT',
  INVESTIGATION: 'INVESTIGATE',
  PATH_DIVERGENCE: 'NAVIGATE',
  CONFRONTATION: 'CONTEST',
  AVOIDANCE_RETREAT: 'WITHDRAW',
};

const PRIMARY_DELTA_MAP = {
  LOCATION_CHANGE: 'LOCATION_ACCESS_CHANGE',
  GOAL_SHIFT: 'GOAL_PRIORITY_CHANGE',
  RELATIONSHIP_CHANGE: 'RELATIONSHIP_ALIGNMENT_CHANGE',
  URGENCY_CHANGE: 'TIME_PRESSURE_CHANGE',
  ITEM_CONTROL: 'RESOURCE_CONTROL_CHANGE',
  EXPOSURE_CHANGE: 'SECRECY_EXPOSURE_CHANGE',
  CONDITION_CHANGE: 'CONDITION_STATUS_CHANGE',
  INFORMATION_REVEALED: 'INFORMATION_STATE_CHANGE',
  THREAT_SHIFT: 'THREAT_LEVEL_CHANGE',
  CONSTRAINT_CHANGE: 'OBLIGATION_RULE_CHANGE',
};

// Values that map to COMMIT (needs manual review)
const COMMIT_SOURCES = ['MORAL_DILEMMA', 'RESOURCE_COMMITMENT'];

const dryRun = process.argv.includes('--dry-run');
const storiesDir = path.join(__dirname, '..', 'stories');

function migrateChoices(choices) {
  let changed = false;
  const warnings = [];

  const migrated = choices.map((choice) => {
    const newChoice = { ...choice };
    let choiceChanged = false;

    if (CHOICE_TYPE_MAP[choice.choiceType]) {
      const oldType = choice.choiceType;
      newChoice.choiceType = CHOICE_TYPE_MAP[oldType];
      choiceChanged = true;

      if (COMMIT_SOURCES.includes(oldType)) {
        warnings.push(
          `  WARNING: "${choice.text}" mapped ${oldType} -> COMMIT (review for accuracy)`
        );
      }
    }

    if (PRIMARY_DELTA_MAP[choice.primaryDelta]) {
      newChoice.primaryDelta = PRIMARY_DELTA_MAP[choice.primaryDelta];
      choiceChanged = true;
    }

    if (choiceChanged) {
      changed = true;
    }

    return newChoice;
  });

  return { migrated, changed, warnings };
}

function processPageFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.choices) || data.choices.length === 0) {
    return { changed: false, warnings: [], choiceCount: 0, migratedCount: 0 };
  }

  const { migrated, changed, warnings } = migrateChoices(data.choices);

  if (changed && !dryRun) {
    data.choices = migrated;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  const migratedCount = migrated.filter(
    (c, i) =>
      c.choiceType !== data.choices[i]?.choiceType ||
      c.primaryDelta !== data.choices[i]?.primaryDelta
  ).length;

  return {
    changed,
    warnings,
    choiceCount: data.choices.length,
    migratedCount: changed ? migrated.length : 0,
  };
}

function run() {
  console.log(`Choice Taxonomy Migration${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(50));

  if (!fs.existsSync(storiesDir)) {
    console.log('No stories/ directory found. Nothing to migrate.');
    return;
  }

  const storyDirs = fs.readdirSync(storiesDir).filter((name) => {
    const storyPath = path.join(storiesDir, name);
    return fs.statSync(storyPath).isDirectory();
  });

  let totalFiles = 0;
  let totalChanged = 0;
  let totalChoices = 0;
  const allWarnings = [];

  for (const storyDir of storyDirs) {
    const storyPath = path.join(storiesDir, storyDir);
    const pageFiles = fs.readdirSync(storyPath).filter((f) => /^page_\d+\.json$/.test(f));

    for (const pageFile of pageFiles) {
      const filePath = path.join(storyPath, pageFile);
      totalFiles++;

      try {
        const result = processPageFile(filePath);
        totalChoices += result.choiceCount;

        if (result.changed) {
          totalChanged++;
          console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${storyDir}/${pageFile} (${result.choiceCount} choices)`);
        }

        for (const warning of result.warnings) {
          allWarnings.push(`${storyDir}/${pageFile}: ${warning}`);
        }
      } catch (err) {
        console.error(`  ERROR processing ${storyDir}/${pageFile}: ${err.message}`);
      }
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Stories scanned: ${storyDirs.length}`);
  console.log(`  Page files scanned: ${totalFiles}`);
  console.log(`  Total choices: ${totalChoices}`);
  console.log(`  Files ${dryRun ? 'needing update' : 'updated'}: ${totalChanged}`);

  if (allWarnings.length > 0) {
    console.log('');
    console.log('Warnings (manual review recommended):');
    for (const warning of allWarnings) {
      console.log(`  ${warning}`);
    }
  }

  console.log('');
  console.log(dryRun ? 'Dry run complete. No files were modified.' : 'Migration complete.');
}

run();
