import fs from 'node:fs';
import path from 'node:path';
import {
  ENTITY_DECOMPOSER_CORE_PRINCIPLES,
  ENTITY_DECOMPOSER_USER_INSTRUCTIONS,
} from '../../../src/llm/entity-decomposer-prompt-contract';

const REPO_ROOT = path.resolve(__dirname, '../../..');

interface PromptDocContract {
  readonly promptType: string;
  readonly sourcePath: string;
  readonly docPath: string;
}

const PROMPT_DOC_CONTRACTS: readonly PromptDocContract[] = [
  {
    promptType: 'kernelIdeator',
    sourcePath: 'src/llm/prompts/kernel-ideator-prompt.ts',
    docPath: 'prompts/kernel-ideator-prompt.md',
  },
  {
    promptType: 'kernelEvaluator',
    sourcePath: 'src/llm/prompts/kernel-evaluator-prompt.ts',
    docPath: 'prompts/kernel-evaluator-prompt.md',
  },
  {
    promptType: 'conceptSeeder',
    sourcePath: 'src/llm/prompts/concept-seeder-prompt.ts',
    docPath: 'prompts/concept-seeder-prompt.md',
  },
  {
    promptType: 'conceptEvolverSeeder',
    sourcePath: 'src/llm/prompts/concept-evolver-seeder-prompt.ts',
    docPath: 'prompts/concept-evolver-seeder-prompt.md',
  },
  {
    promptType: 'conceptArchitect',
    sourcePath: 'src/llm/prompts/concept-architect-prompt.ts',
    docPath: 'prompts/concept-architect-prompt.md',
  },
  {
    promptType: 'conceptEngineer',
    sourcePath: 'src/llm/prompts/concept-engineer-prompt.ts',
    docPath: 'prompts/concept-engineer-prompt.md',
  },
  {
    promptType: 'conceptEvaluator',
    sourcePath: 'src/llm/prompts/concept-evaluator-prompt.ts',
    docPath: 'prompts/concept-evaluator-prompt.md',
  },
  {
    promptType: 'conceptStressTester',
    sourcePath: 'src/llm/prompts/concept-stress-tester-prompt.ts',
    docPath: 'prompts/concept-stress-tester-prompt.md',
  },
  {
    promptType: 'opening',
    sourcePath: 'src/llm/prompts/opening-prompt.ts',
    docPath: 'prompts/opening-prompt.md',
  },
  {
    promptType: 'structureEvaluator',
    sourcePath: 'src/llm/prompts/structure-evaluator-prompt.ts',
    docPath: 'prompts/structure-evaluator-prompt.md',
  },
  {
    promptType: 'promiseTracker',
    sourcePath: 'src/llm/prompts/promise-tracker-prompt.ts',
    docPath: 'prompts/promise-tracker-prompt.md',
  },
  {
    promptType: 'proseQuality',
    sourcePath: 'src/llm/prompts/prose-quality-prompt.ts',
    docPath: 'prompts/prose-quality-prompt.md',
  },
  {
    promptType: 'npcIntelligence',
    sourcePath: 'src/llm/prompts/npc-intelligence-prompt.ts',
    docPath: 'prompts/npc-intelligence-prompt.md',
  },
  {
    promptType: 'conceptSpecificity',
    sourcePath: 'src/llm/prompts/concept-specificity-prompt.ts',
    docPath: 'prompts/concept-specificity-prompt.md',
  },
  {
    promptType: 'conceptScenario',
    sourcePath: 'src/llm/prompts/concept-scenario-prompt.ts',
    docPath: 'prompts/concept-scenario-prompt.md',
  },
  {
    promptType: 'planner',
    sourcePath: 'src/llm/prompts/page-planner-prompt.ts',
    docPath: 'prompts/page-planner-prompt.md',
  },
  {
    promptType: 'accountant',
    sourcePath: 'src/llm/prompts/state-accountant-prompt.ts',
    docPath: 'prompts/state-accountant-prompt.md',
  },
  {
    promptType: 'lorekeeper',
    sourcePath: 'src/llm/prompts/lorekeeper-prompt.ts',
    docPath: 'prompts/lorekeeper-prompt.md',
  },
  {
    promptType: 'macroArchitecture',
    sourcePath: 'src/llm/prompts/macro-architecture-prompt.ts',
    docPath: 'prompts/macro-architecture-prompt.md',
  },
  {
    promptType: 'milestoneGeneration',
    sourcePath: 'src/llm/prompts/milestone-generation-prompt.ts',
    docPath: 'prompts/milestone-generation-prompt.md',
  },
  {
    promptType: 'structure',
    sourcePath: 'src/llm/prompts/structure-prompt.ts',
    docPath: 'prompts/structure-prompt.md',
  },
  {
    promptType: 'structureRewrite',
    sourcePath: 'src/llm/prompts/structure-rewrite-prompt.ts',
    docPath: 'prompts/structure-rewrite-prompt.md',
  },
  {
    promptType: 'structureRepair',
    sourcePath: 'src/llm/prompts/structure-repair-prompt.ts',
    docPath: 'prompts/structure-repair-prompt.md',
  },
  {
    promptType: 'spine',
    sourcePath: 'src/llm/prompts/spine-prompt.ts',
    docPath: 'prompts/spine-prompt.md',
  },
  {
    promptType: 'spineRewrite',
    sourcePath: 'src/llm/prompts/spine-rewrite-prompt.ts',
    docPath: 'prompts/spine-rewrite-prompt.md',
  },
  {
    promptType: 'agendaResolver',
    sourcePath: 'src/llm/prompts/agenda-resolver-prompt.ts',
    docPath: 'prompts/agenda-resolver-prompt.md',
  },
  {
    promptType: 'entityDecomposer',
    sourcePath: 'src/llm/prompts/entity-decomposer-prompt.ts',
    docPath: 'prompts/entity-decomposer-prompt.md',
  },
  {
    promptType: 'characterContextualizer',
    sourcePath: 'src/llm/prompts/character-contextualizer-prompt.ts',
    docPath: 'prompts/character-contextualizer-prompt.md',
  },
  {
    promptType: 'worldbuildingDecomposer',
    sourcePath: 'src/llm/prompts/worldbuilding-decomposer-prompt.ts',
    docPath: 'prompts/worldbuilding-decomposer-prompt.md',
  },
  {
    promptType: 'characterDecomposer',
    sourcePath: 'src/llm/prompts/character-decomposer-prompt.ts',
    docPath: 'prompts/character-decomposer-prompt.md',
  },
  {
    promptType: 'conceptSingleEvaluator',
    sourcePath: 'src/llm/prompts/concept-single-evaluator-prompt.ts',
    docPath: 'prompts/concept-single-evaluator-prompt.md',
  },
];

function readRepoFile(relativePath: string): string {
  const fullPath = path.join(REPO_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

describe('prompt documentation alignment', () => {
  it('keeps production prompt source files mapped to prompt docs', () => {
    for (const contract of PROMPT_DOC_CONTRACTS) {
      const sourcePath = path.join(REPO_ROOT, contract.sourcePath);
      const docPath = path.join(REPO_ROOT, contract.docPath);
      expect(fs.existsSync(sourcePath)).toBe(true);
      expect(fs.existsSync(docPath)).toBe(true);
    }
  });

  it('keeps prompt docs anchored to their source files', () => {
    for (const contract of PROMPT_DOC_CONTRACTS) {
      const docContent = readRepoFile(contract.docPath);
      expect(docContent).toContain(`- Source: \`${contract.sourcePath}\``);
    }
  });

  it('documents concept evaluator enrichment rubric details', () => {
    const docContent = readRepoFile('prompts/concept-evaluator-prompt.md');
    expect(docContent).toContain('whatIfQuestion');
    expect(docContent).toContain('playerFantasy');
    expect(docContent).toContain('ironicTwist');
  });

  it('documents kernel evaluator scoring and deep-eval payload shapes', () => {
    const docContent = readRepoFile('prompts/kernel-evaluator-prompt.md');
    expect(docContent).toContain('scoredKernels');
    expect(docContent).toContain('evaluatedKernels');
    expect(docContent).toContain('dramaticClarity');
    expect(docContent).toContain('conflictTension');
  });

  it('keeps entity decomposer core principles and instructions aligned with docs', () => {
    const docContent = readRepoFile('prompts/entity-decomposer-prompt.md');

    for (const principle of ENTITY_DECOMPOSER_CORE_PRINCIPLES) {
      expect(docContent).toContain(principle);
    }

    for (const instruction of ENTITY_DECOMPOSER_USER_INSTRUCTIONS) {
      expect(docContent).toContain(instruction);
    }
  });
});
