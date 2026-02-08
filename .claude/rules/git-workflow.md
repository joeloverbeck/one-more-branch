# Git Workflow

## Commit Message Format

```
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

Note: Attribution disabled globally via ~/.claude/settings.json.

## Pull Request Workflow

When creating PRs:
1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

## Feature Implementation Workflow

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format

## Git Worktree Cleanup

When finishing work in a git worktree, **always remove the worktree BEFORE deleting the branch**:

```bash
# CORRECT ORDER:
git worktree remove .worktrees/<name>   # Remove worktree first
git branch -d <branch-name>              # Then delete the branch

# WRONG - will fail:
git branch -d <branch-name>              # Error: branch used by worktree
```

**Why**: Git prevents deleting a branch that's checked out in any worktree. The worktree holds a reference to the branch, so you must remove the worktree first to release that reference.

## ESLint in Git Worktrees

When running ESLint in a git worktree, you may encounter a **duplicate plugin error**:

```
ESLint couldn't determine the plugin "@typescript-eslint" uniquely.
- /path/to/project/.worktrees/feature/node_modules/@typescript-eslint/...
- /path/to/project/node_modules/@typescript-eslint/...
```

**Why**: ESLint config inheritance walks up the directory tree, loading `.eslintrc.js` from both the worktree AND the parent repository. Both configs register the same plugins, causing the conflict.

**Solution**: Use `--no-eslintrc` to prevent config inheritance, then explicitly specify parser and plugins:

```bash
# WRONG - fails in worktrees (even with NODE_PATH):
npm run lint
NODE_PATH="$(pwd)/node_modules" npx eslint src/ test/ --quiet

# CORRECT - works in worktrees:
NODE_PATH="$(pwd)/node_modules" npx eslint --no-eslintrc \
  --parser @typescript-eslint/parser \
  --plugin @typescript-eslint \
  src/ test/ --quiet
```

**Why `--no-eslintrc` is required**: The worktree's `.eslintrc.js` extends or references the parent's config via relative paths (e.g., `../../.eslintrc.js`). Simply setting `NODE_PATH` doesn't prevent ESLint from loading both configs - you must disable config inheritance entirely.

**When to use**: Always use the `--no-eslintrc` approach when running ESLint inside a git worktree. The standard `npm run lint` works fine in the main repository.
