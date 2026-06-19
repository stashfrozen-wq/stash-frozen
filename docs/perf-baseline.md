# Performance Baseline

Captured before Phase 1 optimization work. All sizes are **uncompressed** (raw JS on disk); gzip typically reduces by ~65-70%.

## Build environment

- Next.js 16.1.6 (webpack mode — Turbopack incompatible with `@next/bundle-analyzer`)
- React 19.2.3, Tailwind CSS v4, next-intl 4.11
- `experimental.optimizePackageImports: ["lucide-react"]` enabled
- Build command: `ANALYZE=true npx next build --webpack`
- Analyzer reports: `.next/analyze/{client,nodejs,edge}.html`

## Bundle sizes — shared chunks (loaded on every route)

| Chunk | Size (KB) |
|-------|-----------|
| Root main files (webpack runtime + main-app) | 381.4 |
| Framework (React) | 185.2 |
| Shared numbered chunks (code-split vendors) | 473.4 |

## Bundle sizes — per-route page chunks

| Route | Page chunk (KB) | Est. first-load JS (KB) |
|-------|----------------|--------------------------|
| `/dashboard` | 4.4 | ~597 (root+framework+layout+page) |
| `/sales` | 47.0 | ~640 |
| `/sales/quick` | 21.4 | ~614 |
| `/analytics` | 19.4 | ~612 |
| `/reports/inventory` | 16.8 | ~609 |
| `/invoices` | 34.6 | ~627 |
| `/expenses` | 30.5 | ~623 |
| `/products` | 28.7 | ~621 |
| `/customers` | 27.9 | ~620 |
| `/customers/profile` | 28.0 | ~621 |
| `/invoices/[id]/print` | 25.2 | ~618 |
| `/profits` | 11.6 | ~605 |
| `/logs` | 10.2 | ~603 |

> Est. first-load JS = root main (381.4) + framework (185.2) + dashboard layout (21.4) + locale layout (4.6) + page chunk. This is an upper bound; actual first-load depends on which numbered shared chunks each route imports.

## Dashboard layout chunk

- `[locale]/(dashboard)/layout`: 21.4 KB (loaded by all dashboard routes)

## Database query patterns (before optimization)

### dashboard.ts — `getDashboardStats`

- **Weekly chart: 14 sequential DB round trips** (7 days × 2 tables: invoices + refunds)
  - Lines 69-99: two IIFE loops inside `Promise.all`, each internally sequential
  - Each iteration: `prisma.invoice.aggregate` / `prisma.refund.aggregate` with date range filter
- Lifetime revenue/refunds: full-table `aggregate` with no date filter (lines 19-25) — fine for cache, expensive live
- All other aggregates (sales today, refunds today, inventory count, recent sales, vehicle count) run in parallel via `Promise.all` (7 queries)
- **Total queries per call: ~16** (7 parallel + 14 sequential in 2 IIFEs, but IIFEs are "parallel" with the 7)

### analytics.ts — `getBuyerReport`

- **N+1 query pattern**: 1 main query for top buyers + 1 raw query PER buyer for purchase history (lines 99-136)
  - `Promise.all(topBuyers.map(...))` fires N queries (N = number of buyers on page, up to 50)
  - Each sub-query: complex CTE joining InvoiceItem/Product + RefundItem
- **Duplicate CTE**: lines 27-64 (data) and 67-93 (count) repeat the entire Combined CTE — should be collapsed with window functions
- **5 `$queryRawUnsafe` calls** with string-built WHERE clauses (lines 27, 67, 104, 160, 198)
- File-level `eslint-disable @typescript-eslint/no-explicit-any` — all return types are `any[]`

### analytics.ts — `getProductReport`

- Same duplicate CTE pattern (lines 160-196 data, 198-215 count)
- 2 more `$queryRawUnsafe` calls

### profits.ts — `getProfitReport`

- 2 `$queryRawUnsafe` calls (lines 27, 33) with string-built WHERE
- Same `eslint-disable any` pattern

**Total `$queryRawUnsafe` in repo: 7** (5 analytics + 2 profits)

## Caching state (before optimization)

- **Zero caching**: no `unstable_cache`, `use cache`, `revalidateTag`, or `cache()` anywhere in `src/`
- **88 `revalidatePath` calls** across 11 action files:
  - sales.ts: 7, invoices.ts: 16, inventory.ts: 15, reviews.ts: 13, customers.ts: 9, incoming.ts: 3, expenses.ts: 2, refunds.ts: 3, stocktake.ts: 3, users.ts: 3, profits.ts: 0
- Dashboard page has `revalidate = 60` but calls uncached server actions — the 60s revalidate has no effect on the action data

## Schema index state (before optimization)

- **Zero `@@index` declarations** in `prisma/schema.prisma`
- Only `@id` and `@unique` indexes exist
- All aggregate/filter columns (Invoice.date, Invoice.customerId, Invoice.userId, Invoice.status, Refund.createdAt, Refund.invoiceId, etc.) are **unindexed** → sequential scans on every dashboard/analytics query

## Streaming / error boundaries (before optimization)

- Only `src/app/global-error.tsx` exists
- No `loading.tsx`, `error.tsx`, or `not-found.tsx` in any route segment
- Dashboard page blocks entirely on `getDashboardStats` + `getAuditLogs` (sequential awaits, lines 12-15)

## Middleware auth (before optimization)

- `supabase.auth.getUser()` network round trip on every matched request (line 95-97)
- Matcher covers all non-API, non-static routes

## Known build issues fixed during baseline

- `global-error.tsx` prerender failure: replaced `next/link` with plain `<a>` (no router context in global error boundary)

## EXPLAIN (ANALYZE, BUFFERS) — post-index verification

Indexes applied via `prisma db push` to Supabase PostgreSQL (`aws-1-eu-west-1.pooler.supabase.com`).

**Current dataset size**: ~13 Invoices, 1 Refund, 31 InvoiceItems, 13 AuditLogs, 1 RefundItem.

All queries show **Seq Scan** — this is **expected and correct** for tiny tables. PostgreSQL's cost-based optimizer chooses Seq Scan when table size < ~100 rows because sequential I/O is cheaper than index I/O for small datasets. The indexes are created and will be used automatically as data grows past the planner's threshold.

| Query | Plan | Execution Time | Buffers |
|-------|------|---------------|---------|
| Invoice aggregate by date+status (weekly) | Seq Scan + Filter | 0.121ms | shared hit=1 |
| Refund aggregate by createdAt (weekly) | Seq Scan + Filter | 0.047ms | shared hit=1 |
| Invoice aggregate by status (lifetime) | Seq Scan + Filter | 0.055ms | shared hit=1 |
| Recent sales (date DESC LIMIT 5) | Sort + Seq Scan | 0.120ms | shared hit=4 |
| InvoiceItem JOIN Invoice (analytics) | Hash Join + Seq Scan | 0.166ms | shared hit=2 |
| RefundItem JOIN Refund (analytics) | Hash Join + Seq Scan | 0.082ms | shared hit=2 |
| AuditLog by userId + timestamp DESC | Sort + Seq Scan | 0.041ms | shared hit=1 |

**Indexes created** (18 total):
- Invoice: `@@index([date])`, `@@index([customerId])`, `@@index([userId])`, `@@index([status])`, `@@index([date, paymentMethod])`
- Refund: `@@index([createdAt])`, `@@index([invoiceId])`
- Inventory: `@@index([locationId])`
- TransactionItem: `@@index([transactionId])`, `@@index([productId])`
- InvoiceItem: `@@index([invoiceId])`, `@@index([productId])`
- AuditLog: `@@index([userId])`, `@@index([timestamp])`
- Expense: `@@index([userId])`, `@@index([date])`
- CustomerPayment: `@@index([customerId])`, `@@index([date])`

## Lighthouse (mobile) — pending

> To be captured for `/dashboard`, `/sales`, `/sales/quick`, `/analytics`, `/reports/inventory`.
> Requires running `bun run start` against the production build + headless Chrome.
