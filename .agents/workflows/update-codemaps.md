---
description: Scan project structure and generate token-lean architecture codemaps.
---

# Update Codemaps

Analyze the codebase structure and generate token-lean architecture documentation.

## When to Run

Run this workflow **after** any:
- New page or route added
- New component hierarchy created
- Database schema migration
- Module/directory restructuring
- Major feature addition or refactoring session

The goal is to keep `docs/CODEMAPS/*.md` fresh enough that a new AI session can read them for context instead of re-exploring the repository.

## Step 1: Scan Project Structure

1. Identify the project type - Next.js App Router (TypeScript/React)
2. Find all source directories: `src/app/`, `src/lib/`, `src/app/*/components/`, `src/app/dashboard-components/`, `src/mcp-server/`
3. Map entry points: `src/app/page.tsx` (Dashboard), `src/app/layout.tsx` (Root Layout)
4. Check for changes since last codemap generation (`git log --oneline --since="<last-codemap-date>"`)

## Step 2: Generate or Update Codemaps

Update the existing files in `docs/CODEMAPS/`:

| File | Contents |
|------|----------|
| `ARCHITECTURE.md` | High-level system diagram, data flow, key design decisions |
| `FRONTEND.md` | Page tree, component hierarchy, state management, i18n |
| `DATA.md` | Prisma schema, entity relationships, key query patterns |
| `MODULES.md` | Directory structure, file purposes, dependency graph |

### Codemap Format

Each codemap should be token-lean — optimized for AI context consumption:

```markdown
# Section

## Key Files
- `src/app/dashboard-client.tsx` — Main dashboard client component (580 lines)
- Imports sub-components from `./dashboard-components/`

## Data Flow
Server component (`page.tsx`) → fetches data → passes as props to → `DashboardClient`
```

## Step 3: Diff Detection

1. If previous codemaps exist, compare the new scan against the existing content
2. Only overwrite files that have actually changed (check `git diff docs/CODEMAPS/`)
3. Preserve the freshness header format

## Step 4: Add Metadata

Each codemap should end with a freshness header:

```markdown
<!-- Generated: 2026-06-11 | Est. tokens: ~700 -->
```

## Step 5: Verify

After updating, verify the codemaps are readable and self-consistent:
- No broken file path references
- No stale information carried over unchanged sections
- Token estimate under 1000 per file

## Tips

- **File sizes**: Use `wc -l` to list file sizes — focus updates where the most lines changed
- **Token efficiency**: Prefer file paths/function signatures over full code blocks
- **Diff awareness**: Use `git diff --stat` to detect which areas changed
- **Don't regenerate blindly**: Only update codemaps for files/directories that actually changed
