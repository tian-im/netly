---
description: Update documentation for recent changes
agent: everything-claude-code:doc-updater
subtask: true
---

# Update Docs Command

Update documentation to reflect recent changes: $ARGUMENTS

## Your Task

1. **Identify changed code** - `git diff --name-only`
2. **Find related docs** - README, API docs, guides, **user manual**
3. **Update documentation** - Keep in sync with code
4. **Verify accuracy** - Docs match implementation

## Documentation Types

### README.md
- Installation instructions
- Quick start guide
- Feature overview
- Configuration options

### User Manual (`content/docs/`)
- **English** (`content/docs/en/`) — User-facing feature guides, how-tos, FAQ, changelog
- **Chinese** (`content/docs/zh/`) — Mirrors the English tree; add `<!-- TODO: translate from en/... -->` notices when updating English but not Chinese
- **Changelog** (`content/docs/{locale}/CHANGELOG.md`) — User-friendly release notes (separate from repo `CHANGELOG.md`)
- Check for stale pages when features are added/changed/removed
- If you create a new page in `en/`, also create the mirror file in `zh/` (even if untranslated)

### API Documentation
- Endpoint descriptions
- Request/response formats
- Authentication details
- Error codes

### Code Comments
- JSDoc for public APIs
- Complex logic explanations
- TODO/FIXME cleanup

### Guides
- How-to tutorials
- Architecture decisions (ADRs)
- Troubleshooting guides

## Update Checklist

- [ ] README reflects current features
- [ ] User manual (`content/docs/en/`) reflects current features
- [ ] Chinese manual (`content/docs/zh/`) has mirror files with translation notices
- [ ] API docs match endpoints
- [ ] JSDoc updated for changed functions
- [ ] Examples are working
- [ ] Links are valid
- [ ] Version numbers updated

## Documentation Quality

### Good Documentation
- Accurate and up-to-date
- Clear and concise
- Has working examples
- Covers edge cases

### Avoid
- Outdated information
- Missing parameters
- Broken examples
- Ambiguous language

---

**IMPORTANT**: Documentation should be updated alongside code changes, not as an afterthought.
