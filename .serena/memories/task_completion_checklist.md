# Task Completion Checklist

## Before Marking Complete

### Code Quality
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No console.log statements (use logger)
- [ ] No hardcoded values
- [ ] No mutation (immutable patterns used)

### Testing
- [ ] Tests written first (TDD)
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Integration tests pass: `npm run test:integration`
- [ ] Coverage >= 80%

### Quality Checks
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Format applied: `npm run format`

### Security
- [ ] No hardcoded secrets
- [ ] All user inputs validated
- [ ] Error messages don't leak sensitive data

### Git
- [ ] On feature branch (not main)
- [ ] Meaningful commit message
- [ ] Changes reviewed with git diff
