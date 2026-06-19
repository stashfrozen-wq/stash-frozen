# Deployment Guide

This guide details the procedure for deploying the application to production, focusing on Vercel and PostgreSQL pooling configuration.

## Deploying to Vercel

The application is optimized for deployment on the Vercel platform.

### Step-by-Step Deployment

1. **Import Project**: Log in to Vercel and import your GitHub repository.
2. **Framework Preset**: Vercel will automatically detect **Next.js**. Keep this default.
3. **Configure Environment Variables**: Add all environment variables in the Project Settings (see list below).
4. **Build & Development Settings**:
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `bun install`
5. **Deploy**: Click **Deploy**.

## Production Environment Variables

You must configure the following variables in your Vercel project settings:

| Variable Name | Description | Example / Recommendations |
|---|---|---|
| `DATABASE_URL` | Pooled connection string | Points to port 6543 with `?pgbouncer=true` query parameter |
| `DIRECT_URL` | Direct connection string | Points to port 5432 for migrations and schema sync |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL | `https://utlehmpumyeffgfrexez.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Found in Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Keep secret; used for administrative auth actions |
| `BYPASS_AUTH` | Authentication bypass flag | Set to `false` in production to enforce auth checks |
| `TELEGRAM_BOT_TOKEN` | Production bot token | Telegram Bot Token for notification integration |
| `TELEGRAM_WEBHOOK_SECRET` | Secret webhook key | Validates incoming messages to the Telegram endpoint |
| `CRON_SECRET` | Cron verification key | Secures backend cron routes against unauthorized triggers |

## Database Connection Pooling

For serverless deployments (such as Vercel Serverless Functions), direct database connections can quickly exhaust PostgreSQL's connection limits. 

- **DATABASE_URL**: Must use a connection pooler like **PgBouncer** or **Supabase Connection Pooler** (Session or Transaction mode) on port `6543` and end with `?pgbouncer=true`.
- **DIRECT_URL**: Connects directly to PostgreSQL on port `5432` to avoid PgBouncer transaction conflicts during migrations/schema synchronization.

## Bundle Analysis

To analyze the production JavaScript bundle sizes and detect oversized dependencies, build the application with the bundle analyzer active:

```bash
ANALYZE=true bun run build
```

This compiles the project and generates static HTML reports inside the `.next/analyze/` directory showing client, nodejs, and edge bundle compositions.
