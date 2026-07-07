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
```

Do not set `SUPABASE_SERVICE_ROLE_KEY` for the public web runtime unless a server-only operation explicitly needs it. The current app does not need it at runtime. It is only used by the local verification script:

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
