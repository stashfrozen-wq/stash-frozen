# Local Inventory Management & Sales Platform

A modern, high-performance web platform designed for localized sales tracking, inventory counts, multi-tier product pricing, and audit log tracking.

---

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **UI Runtime**: React 19.2.3
- **Styling**: Tailwind CSS v4 (with Vanilla PostCSS config)
- **Localization**: `next-intl` (integrated Arabic and English localization)
- **Database Client**: Prisma 7.3.0 (with connection pooling via `@prisma/adapter-pg` and custom retry backoff)
- **Authentication**: Supabase SSR Auth Integration
- **Runtime & Package Manager**: Bun v1.1.8

---

## Documentation Index

Explore the folders for detailed architectural overviews, contribution checklists, and setup manuals:

1. **[Local Setup Guide](file:///c:/Users/PotterParker/Desktop/web/docs/setup.md)**: Detailed step-by-step developer guide to installing, configuring database seeding, and running the development server locally.
2. **[System Architecture](file:///c:/Users/PotterParker/Desktop/web/docs/architecture.md)**: Explains codebase structures, design layers (Server Actions, REST API routes, components, utilities), auth flow, and i18n configurations.
3. **[Deployment Guide](file:///c:/Users/PotterParker/Desktop/web/docs/deployment.md)**: Instructions for deploying to Vercel, serverless connection pooling using PgBouncer/Supabase, and bundle size analysis commands.
4. **[Contributing Guidelines](file:///c:/Users/PotterParker/Desktop/web/CONTRIBUTING.md)**: Conventional Commits conventions, branch structure rules, pre-commit checklists, and validation instructions.
5. **[Performance Baseline](file:///c:/Users/PotterParker/Desktop/web/docs/perf-baseline.md)**: System performance metrics, N+1 diagnostics, and initial bundle benchmarks.
6. **[Changelog](file:///c:/Users/PotterParker/Desktop/web/CHANGELOG.md)**: Project release notes, addition tracking, security updates, and performance optimizations.

---

## Quick Start (Local Run)

Ensure you have [Bun](https://bun.sh/) and PostgreSQL installed.

### 1. Copy Environment Template
Create `.env.local` based on the guidelines in [docs/setup.md](file:///c:/Users/PotterParker/Desktop/web/docs/setup.md).

### 2. Install and Generate
```bash
bun install
```

### 3. Apply Schema and Seed Test Data
```bash
bun x prisma db push
bun seed-update-all.ts
```

### 4. Start Development Server
```bash
bun dev
```

The application will launch on [http://localhost:3000](http://localhost:3000).

---

## Environment Variables Reference

A quick checklist of required configurations (detailed descriptions in [docs/setup.md](file:///c:/Users/PotterParker/Desktop/web/docs/setup.md)):

- `DATABASE_URL` (Pooled PostgreSQL Connection)
- `DIRECT_URL` (Direct Migration Connection)
- `NEXT_PUBLIC_SUPABASE_URL` (Supabase Project Endpoint)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Anon Client Key)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase Admin Secret)
- `BYPASS_AUTH` (Boolean development authorization bypass gate)
- `TELEGRAM_BOT_TOKEN` & `TELEGRAM_WEBHOOK_SECRET` (Telegram Integrations)
- `CRON_SECRET` (Secure API Cron Verification)
