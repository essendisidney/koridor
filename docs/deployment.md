# Deployment Guide

## Local (Docker Compose)

```bash
pnpm docker:up
pnpm --filter @koridor/shared build
pnpm --filter @koridor/api prisma:generate
pnpm --filter @koridor/api exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

## Production targets

| Layer | Recommended |
|-------|-------------|
| Web | Vercel |
| API | Railway / AWS ECS / Kubernetes |
| Database | Managed PostgreSQL |
| Cache | Managed Redis |
| Objects | S3-compatible storage |

## Environment

Copy `.env.example` and set strong JWT secrets (≥32 chars), production `DATABASE_URL`, and restricted `CORS_ORIGINS`.

## Health

- `GET /api/v1/health` — API + database

## CI

GitHub Actions workflow `.github/workflows/ci.yml` installs, builds, and tests on push/PR.
