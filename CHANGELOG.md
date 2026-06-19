# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-06-19

### Added
- Customer payments tracking, account statements, default unpaid invoices configuration, and debts permissions.
- Monthly expenses tracker and net profit calculations.
- Zip export for historical invoices and automatic device redirection for sales routes.
- Backup functionality supporting exports for invoices, customers, and items.
- Undo invoice functionality for easy rollbacks.
- Quick sales page, inventory counts, and Telegram notifications integration.
- Professional HTML & PDF inventory valuation reports featuring custom Amiri font, pricing metrics, and stock breakdowns.
- Seeding scripts for coffee items, product variations, and database updates.

### Changed
- Upgraded Next.js to version `16.2.6` to patch security vulnerability CVE-2025-66478.
- Relocated inventory HTML reports inside localized dynamic `[locale]` routes for `next-intl` compatibility.
- Upgraded quantity and financial fields to use decimal types for precise financial arithmetic.
- Updated administrative sales routes to route via the marketplace prefix.
- Upgraded package manager runtime configuration to Bun.

### Fixed
- Enforced input validation for numeric inputs and extracted inline handler bindings to prevent excessive re-renders.
- Prevented negative product price submissions by declaring `min=0` bounds.
- Corrected Arabic localization labels, renaming movements to "حركات المخزن".
- Resolved invoice status badges to show "Debt" instead of "Paid" when an outstanding balance remains.
- Restructured Vercel deploy output format utilizing blobs to fix JSZip BodyInit type mismatch.
- Patched Vercel PDF generator execution by fixing `Helvetica.afm` resolution.
- Cleaned up compiler (tsc) type resolution errors in API paths, background tasks, and layouts.
- Removed duplicate page exports and missing React imports.

### Performance
- Added idempotency key checks to `processSale` to avoid duplicate transaction execution.
- Optimized dashboard initialization by collapsing 14 sequential weekly queries into 2 grouped queries with tag-based caching.
- Eliminated N+1 queries and collapsed duplicated Common Table Expressions (CTEs) within analytics queries.
- Speed up middleware execution by querying `getSession()` instead of full network-bound `getUser()`.
- Implemented `Promise.all` parallelization across dashboard component loaders.
- Extracted inline event handlers to memoized `useCallback` hooks.
- Configured PostgreSQL connection pool timeouts and transient retries for robust database connectivity.
- Shifted cache invalidations to fine-grained tag-based purging instead of heavy route-level `revalidatePath` actions.
- Cleared out unused imports and optimized client bundle sizes.
