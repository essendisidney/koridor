# Supabase setup — Koridor

Koridor uses **Supabase Postgres** as the primary database and **Supabase Storage** for Trust Engine documents.

Phase 1–2 auth remains **app JWT + RBAC** (Next.js `/api/v1`). Supabase Auth is not used so the app stays the single authority.

## Project

| Field | Value |
|-------|--------|
| Name | `koridor` |
| Ref | `qfptnyifzdwmuxfkgpmv` |
| Region | `eu-west-1` |
| API URL | https://qfptnyifzdwmuxfkgpmv.supabase.co |

## Connection strings

From **Dashboard → Project Settings → Database**:

1. **Transaction pooler** → `DATABASE_URL` (port `6543`, add `?pgbouncer=true`)
2. **Session / direct** → `DIRECT_URL` (port `5432`, used by Prisma migrations)

```env
DATABASE_URL=postgresql://postgres.qfptnyifzdwmuxfkgpmv:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.qfptnyifzdwmuxfkgpmv:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://qfptnyifzdwmuxfkgpmv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role from API settings]
```

## Storage

| Bucket | Access | Purpose |
|--------|--------|---------|
| `org-documents` | Private | KYB/KYC document blobs |

Uploads go through the Next.js API using the **service role** key. Clients never see the service key; they receive short-lived signed download URLs.

Required env (server only):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Security model

- All app tables have **RLS enabled**
- No policies for `anon` / `authenticated` → PostgREST Data API cannot read/write app tables
- App connects with the database password (bypasses RLS) — application RBAC enforces access

## Local commands

```bash
cp .env.example .env
# paste DATABASE_URL + DIRECT_URL + JWT secrets + SUPABASE_SERVICE_ROLE_KEY

pnpm --filter @koridor/shared build
pnpm --filter @koridor/web prisma:generate
pnpm db:seed   # optional if already seeded remotely
pnpm dev
```

## Demo accounts (seeded)

| Email | Password |
|-------|----------|
| `admin@koridor.io` | `Admin123!` |
| `exporter@demo.koridor.io` | `Demo123!` |
| `buyer@demo.koridor.io` | `Demo123!` |
