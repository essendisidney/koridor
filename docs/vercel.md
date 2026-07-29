# Vercel deployment — Koridor Web

Vercel hosts the **Next.js app**, including Phase 1–2 APIs under `/api/v1` (auth + Trust Engine). NestJS remains optional for a separate API host later.

## Project

- Vercel project: `koridor`
- Production: https://koridor-psi.vercel.app
- Root directory: `apps/web`

## Required environment variables

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Supabase pooler connection |
| `DIRECT_URL` | Supabase direct connection |
| `JWT_ACCESS_SECRET` | Access token signing (≥32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing (≥32 chars) |
| `NEXT_PUBLIC_API_URL` | `/api/v1` (same-origin) |
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `SUPABASE_URL` | `https://qfptnyifzdwmuxfkgpmv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; document upload/download |

## Deploy

From repo root (linked project):

```bash
npx vercel --prod
```

Or push to GitHub with Vercel Git integration (Root Directory = `apps/web`).
