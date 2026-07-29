# Vercel deployment — Koridor Web

Vercel hosts the **Next.js app**, including `/api/v1` (auth, trust, trade, finance, compliance, logistics). NestJS remains optional for a separate API host later.

## Project

- Vercel project: `koridor` (`prj_n7GdjjQMMYuCofI9oIZz71s0xtsp`)
- Team: `essendisidney-1047s-projects`
- Production URL: https://koridor-psi.vercel.app
- Root Directory: `apps/web`
- Framework: Next.js (see `apps/web/vercel.json`)

## Git → production

| Setting | Value |
|---------|--------|
| GitHub repo | https://github.com/essendisidney/koridor |
| Production branch | `main` |
| Auto-deploy | Push to `main` → Production |

Connect (from repo root, linked project):

```bash
npx vercel git connect https://github.com/essendisidney/koridor.git
```

After connect, every push to `main` deploys production. Preview deployments use other branches / PRs.

Manual CLI deploy (fallback):

```bash
npx vercel --prod --yes
```

## Required environment variables

Set in Vercel → Project → Settings → Environment Variables (Production + Preview as needed):

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Supabase pooler connection |
| `DIRECT_URL` | Supabase direct connection |
| `JWT_ACCESS_SECRET` | Access token signing (≥32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing (≥32 chars) |
| `NEXT_PUBLIC_API_URL` | `/api/v1` (same-origin) |
| `NEXT_PUBLIC_APP_URL` | `https://koridor-psi.vercel.app` |
| `SUPABASE_URL` | `https://qfptnyifzdwmuxfkgpmv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; document upload/download |

Never commit `.env` / `.env.local` — they stay local only.
