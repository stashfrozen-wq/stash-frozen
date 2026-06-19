# System Architecture Overview

This document provides a high-level overview of the application structure, key architectural patterns, and technology integrations.

## Codebase Directory Structure

```
c:/Users/PotterParker/Desktop/web/
├── docs/                 # Documentation (architecture, setup, deployment)
├── prisma/               # Database schema definitions and migrations
├── public/               # Static assets (fonts, images, icons)
├── messages/             # Localization translation JSON files (AR, EN, etc.)
└── src/
    ├── app/              # Next.js App Router root
    │   ├── [locale]/     # Localized routing wrapper (next-intl integration)
    │   │   ├── (auth)/   # Login and user onboarding routes
    │   │   └── (dashboard)/ # Main app pages (sales, products, analytics, etc.)
    │   ├── actions/      # Next.js Server Actions (backend queries/mutations)
    │   └── api/          # REST API endpoints (webhooks, backups, data exports)
    ├── components/       # Reusable React components
    │   └── ui/           # Low-level UI design components (buttons, inputs)
    └── lib/              # Core utility modules and database client initialization
```

---

## Architectural Layers

### 1. Server Actions (`src/app/actions/`)
All form submissions and transactional interactions are driven by **Next.js Server Actions**. 
- Server Actions enforce role-based access checks (via `requirePermission` or `requireRole`) prior to execution.
- They utilize Prisma Client directly to query or modify the database, ensuring type safety from DB to UI.
- Critical actions (like `processSale` in `sales.ts`) implement idempotency keys to prevent double-submit bugs.

### 2. REST API Layer (`src/app/api/`)
REST API endpoints handle integrations and operations where Server Actions are unsuitable:
- **`api/backup`**: Exporting data collections (invoices, customers, items) zipped.
- **`api/cron`**: Automatically scheduled tasks (database backups, statistics caching).
- **`api/telegram`**: Receives webhooks and dispatches status notifications to Telegram groups.
- **`api/reports`**: Dynamic PDF and HTML layout rendering endpoints.

### 3. UI Components (`src/components/`)
UI code is split into two categories:
- **Feature Components**: Specialized pages and complex components like `RefundModal.tsx`, `BulkImportDropzone.tsx`, or product view wrappers.
- **Shared UI Elements (`src/components/ui/`)**: Reusable inputs, cards, tables, and buttons designed with Vanilla CSS and tailwind variables.

### 4. Utilities (`src/lib/`)
Shared backend/frontend utility systems:
- **`prisma.ts`**: Initialises the connection pool with automatic retry wrapper (`withRetry`) to handle transient database connection drops.
- **`auth/session.ts`**: Functions for retrieving current user status (`getCurrentUser`) and enforcing authorization constraints (`requirePermission`).
- **`tafqeet.ts`**: Converts numbers to written Arabic currency words for printing compliant invoice formats.
- **`validations.ts`**: Schema definitions using Zod for client/server validation.

---

## Key Integrations

### Localization (`next-intl`)
The application uses `next-intl` for full internationalization (i18n):
- All localized pages are nested under `src/app/[locale]/`.
- Translation keys are located in `/messages/{locale}.json` (e.g., `ar.json`, `en.json`).
- Routing utilizes localized links and next-intl middleware for seamless subpath detection.

### Authentication & Authorization (Supabase Auth)
User authentication is managed via Supabase, with sessions stored in secure cookies:
- **Middleware**: Intercepts requests to verify session validity using Supabase SSR's `getSession()`.
- **Database Mapping**: The authenticated Supabase User ID matches the local `User.id` primary key in PostgreSQL.
- **Permission Checking**: Features use `hasPermission()` mapping a user's `role` (ROOT, ADMIN, ACCOUNTANT, SALESPERSON, READ_ONLY) or explicit `permissions` array to allowed dashboard sections.
