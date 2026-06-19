# Contributing Guidelines

Thank you for contributing to our project. To maintain code quality, repository cleanliness, and deployment reliability, please follow these guidelines when writing code, naming branches, and crafting commit messages.

---

## Branch Naming Conventions

Always use descriptive prefixes when creating new branches:

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | Introducing new features or functionality | `feature/customer-payroll` |
| `bugfix/` | Fixing bug reports or compiler/lint issues | `bugfix/pdf-helvetica-afm` |
| `perf/` | Code, database query, or bundle size optimizations | `perf/dashboard-aggregation` |
| `refactor/` | Code structure rewrites with no functional changes | `refactor/decimal-helpers` |
| `hotfix/` | Critical urgent production bug patches | `hotfix/session-auth-leak` |

---

## Commit Guidelines (Conventional Commits)

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification:

```
<type>(<scope>): <description>
```

### Commit Types

- **`feat`**: A new feature (e.g., `feat(sales): add undo invoice functionality`)
- **`fix`**: A bug fix (e.g., `fix(pricing): prevent negative price input`)
- **`perf`**: A code change that improves performance (e.g., `perf(analytics): eliminate N+1 query pattern`)
- **`refactor`**: A code change that neither fixes a bug nor adds a feature (e.g., `refactor(db): rename schema fields`)
- **`chore`**: Maintenance tasks or build adjustments (e.g., `chore: upgrade next to 16.2.6`)
- **`docs`**: Documentation changes only (e.g., `docs: update setup guide`)
- **`test`**: Adding missing tests or correcting existing tests (e.g., `test: add playwright invoices suite`)

### Common Scopes

| Scope | Description / Target Directory |
|---|---|
| `db` | Prisma schema changes, db seeds, or migrations under `/prisma/` |
| `auth` | Session helpers, role mappings, and Supabase config in `src/lib/auth/` |
| `sales` | Sales paths, checkout handlers, and stock deductions |
| `analytics` | SQL reports, weekly aggregates, and customer statements |
| `cron` | Scheduled backup tasks and cache invalidation routes |
| `ui` | Styling fixes, component modifications, layouts, and translations |

---

## Verification Before Committing

To ensure the main branch remains stable, always execute these checks locally prior to committing code or pushing branches:

### 1. Run ESLint Checks
Verify that there are no formatting or syntax styling violations:
```bash
bun run lint
```

### 2. Run TypeScript Compiler
Ensure there are no compile-time type errors across components, server actions, or api endpoints:
```bash
bun x tsc --noEmit
```

### 3. Run E2E Tests
Run the integration suite via Playwright:
```bash
bun x playwright test
```

### 4. Test Production Build locally
Verify Next.js builds the production assets successfully without static rendering errors:
```bash
bun run build
```
