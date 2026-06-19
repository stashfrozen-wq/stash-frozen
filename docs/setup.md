# Local Development Setup Guide

This guide details the steps required to set up and run the application locally.

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: Version 20.x or higher.
- **Bun**: Version 1.1.x or higher (used as the package manager and test runner). [Install Bun](https://bun.sh/).
- **PostgreSQL**: A local or remote database instance.

## Environment Variables

Create a `.env.local` file at the root of the project. Here is a template of the required variables:

```env
# Database Connections
# DATABASE_URL should point to a connection-pooled endpoint (e.g., PgBouncer on port 6543)
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/<db_name>?pgbouncer=true"
# DIRECT_URL should point to a direct connection endpoint (e.g., port 5432) for running migrations
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/<db_name>"

# Supabase Authentication Config
NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Development Flags
BYPASS_AUTH=true # Set to true to bypass authentication check gates during local testing

# Telegram Integration
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_WEBHOOK_SECRET="your-webhook-secret-string"

# Cron Security
CRON_SECRET="your-cron-secret-string"
```

## Step-by-Step Installation

### 1. Install Dependencies
Run the following command at the repository root to install dependencies and auto-generate the Prisma Client:
```bash
bun install
```
*(Note: This automatically triggers `prisma generate` as a post-install hook).*

### 2. Generate Prisma Client manually (if needed)
If you modify the database schema at `prisma/schema.prisma`, regenerate the TypeScript client definitions:
```bash
bun x prisma generate
```

### 3. Synchronize Database Schema
Push the local database schema to your PostgreSQL database. This commands does not require database migration tables and is optimal for rapid prototyping:
```bash
bun x prisma db push
```

### 4. Seed Database Content
To populate the database with initial products, categories, and test data, run the main seed script:
```bash
bun seed-update-all.ts
```

There are also specific helper seed scripts available:
- `seed-coffee-items.ts`: Seeds coffee products.
- `seed-products-with-pricing.ts`: Seeds general products with multi-tier pricing structures.

### 5. Run the Local Development Server
Start the Next.js development server:
```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser to access the application.
