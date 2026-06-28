---
title: Environment Variables
description: All environment variables recognised by OmniSvelte and its integrations.
section: Configuration
order: 2
---

# Environment Variables

OmniSvelte reads the following environment variables. Copy `.env.example` to `.env` and fill in your values before running `pnpm dev`.

## Database

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string — `postgres://user:pass@host:5432/db` |

## Authentication

| Variable | Required | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | ✅ | Long random string used to sign sessions and tokens |
| `BETTER_AUTH_URL` | ✅ | Public base URL of your app — `http://localhost:5173` in dev |

## OAuth providers (optional)

| Variable | Provider |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Apple Sign-in |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth |

## Email (planned)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | API key for Resend email provider |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Nodemailer SMTP config |
| `EMAIL_FROM` | Default "from" address |

## Example `.env`

```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/myapp

# Auth
BETTER_AUTH_SECRET=generate-a-long-random-string-here
BETTER_AUTH_URL=http://localhost:5173

# OAuth (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## Type safety
OmniSvelte generates `src/omni-env.d.ts` which includes ambient declarations for these variables so `process.env.DATABASE_URL` is typed. For SvelteKit's `$env/static/private`, the standard `.svelte-kit/types` handle that automatically. Note that Sveltekit 3+ uses $app/env/*, so we will update this when we add support for SvelteKit 3

