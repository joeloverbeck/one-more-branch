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
