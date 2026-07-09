# Deployment Guide

작성일: 2026-07-07

## Target

1차 배포는 Vercel + Supabase hosted project 조합을 기준으로 한다.

- Frontend/App: Vercel
- Auth/DB/RLS: Supabase
- PWA: browser installable web app first
- Native store packaging: later, TWA or Capacitor decision

## Required Environment Variables

Set these in Vercel Project Settings > Environment Variables.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xcarczbywefjouyyycaf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=Uniwork <notifications@your-production-domain.com>
CRON_SECRET=...
```

`SUPABASE_SERVICE_ROLE_KEY` is required only for server-only runtime work such as Vercel Cron email digests and local verification scripts. Never expose it to client code or prefix it with `NEXT_PUBLIC_`.

`RESEND_API_KEY` and `EMAIL_FROM` enable transactional email delivery. Verify the sending domain in Resend before using a production sender address.

`CRON_SECRET` secures Vercel Cron calls. Vercel sends it as the `Authorization: Bearer ...` header when invoking configured cron paths.

```bash
npm run verify:supabase
```

## Supabase Auth URLs

After the production domain is known, configure Supabase Dashboard > Authentication > URL Configuration.

Site URL:

```text
https://your-production-domain.com
```

Redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
https://*.vercel.app/auth/callback
```

Use the exact production domain once it is final. The wildcard Vercel preview redirect is useful during staging, but production should still have the exact domain.

## Database Migrations Applied

The Supabase project should have these SQL files applied in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_auth_profile_trigger.sql`
3. `supabase/migrations/0003_api_grants_and_company_role_policies.sql`
4. `supabase/migrations/0004_application_access_policies.sql`
5. `supabase/migrations/0005_rls_helpers_and_admin_request_policies.sql`
6. `supabase/migrations/0006_partner_assignment_policies.sql`
7. `supabase/migrations/0007_profile_photos.sql`
8. `supabase/migrations/0008_resume_company_read_policy.sql`
9. `supabase/migrations/0009_application_resume_guard.sql`
10. `supabase/migrations/0010_fix_application_resume_policy_recursion.sql`
11. `supabase/migrations/0011_application_submission_snapshots.sql`
12. `supabase/migrations/0012_application_status_notes.sql`
13. `supabase/migrations/0013_application_status_events.sql`
14. `supabase/migrations/0014_notification_email_settings.sql`
15. `supabase/migrations/0015_job_review_notes.sql`
16. `supabase/migrations/0016_company_verification_notes.sql`

## Pre-Deploy Checks

Run these locally before deploying:

```bash
npm run lint
npm run build
npm run check:deploy
npm run verify:supabase
npm run verify:production -- https://your-production-domain.com
```

`verify:supabase` creates temporary test users and rows, verifies RLS/auth flows, then removes the test users.
`check:deploy` verifies required public environment variables, PWA files, and a Supabase public REST/RLS read.
`verify:production` checks deployed health/PWA metadata and verifies that Supabase accepts the production auth callback URL.

## Vercel Build Settings

Use the default Next.js settings.

```text
Framework Preset: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: .next
Node.js: 24.x
```

Use Node `24.18.0` locally through `.nvmrc`. Vercel is pinned to Node `24.x` through `package.json`.

## PWA Production Check

After deployment, open these URLs:

```text
https://your-production-domain.com/manifest.webmanifest
https://your-production-domain.com/sw.js
https://your-production-domain.com/icons/icon-512.png
https://your-production-domain.com/api/health
```

Expected:

- manifest returns `display: standalone`
- service worker returns HTTP 200
- app icons return HTTP 200
- health endpoint returns `{"status":"ok"}`
- Chrome desktop/mobile shows install option after the page is loaded

## Store Packaging Direction

For Play Store/App Store, decide after the web MVP stabilizes.

- TWA: simpler Android-only wrapper when PWA quality is enough.
- Capacitor: better if native push notifications, native file handling, or deeper app-store behavior is needed.
- iOS: PWA install works through Safari, but App Store distribution usually needs a native wrapper such as Capacitor.
