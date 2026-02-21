import fs from 'node:fs';
import path from 'node:path';

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
    promptType: 'conceptIdeator',
    sourcePath: 'src/llm/prompts/concept-ideator-prompt.ts',
    docPath: 'prompts/concept-ideator-prompt.md',
  },
  {
    promptType: 'conceptEvolver',
    sourcePath: 'src/llm/prompts/concept-evolver-prompt.ts',
    docPath: 'prompts/concept-evolver-prompt.md',
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
    promptType: 'analyst',
    sourcePath: 'src/llm/prompts/analyst-prompt.ts',
    docPath: 'prompts/analyst-prompt.md',
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
    promptType: 'structure',
    sourcePath: 'src/llm/prompts/structure-prompt.ts',
    docPath: 'prompts/structure-prompt.md',
  },
  {
    promptType: 'structure-rewrite',
    sourcePath: 'src/llm/prompts/structure-rewrite-prompt.ts',
    docPath: 'prompts/structure-rewrite-prompt.md',
  },
  {
    promptType: 'spine',
    sourcePath: 'src/llm/prompts/spine-prompt.ts',
    docPath: 'prompts/spine-prompt.md',
  },
  {
    promptType: 'spine-rewrite',
    sourcePath: 'src/llm/prompts/spine-rewrite-prompt.ts',
    docPath: 'prompts/spine-rewrite-prompt.md',
  },
  {
    promptType: 'agenda-resolver',
    sourcePath: 'src/llm/prompts/agenda-resolver-prompt.ts',
    docPath: 'prompts/agenda-resolver-prompt.md',
  },
  {
    promptType: 'entity-decomposer',
    sourcePath: 'src/llm/prompts/entity-decomposer-prompt.ts',
    docPath: 'prompts/entity-decomposer-prompt.md',
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
});
