# Uniwork operations readiness

Last reviewed: 2026-07-12

## Release posture

Uniwork is in an MVP-ready state for a controlled launch:

- Public job discovery, job detail, signup/login, seeker profile/resume, application submission, company job/applicant management, company verification, admin request review, and admin handoff draft flows are implemented.
- Empty states, recovery states, mobile public entry CTAs, metadata, PWA assets, and production smoke checks are in place.
- Supabase RLS verification scripts cover the main seeker/company/admin/partner data boundaries.

This does not mean the product is "finished." The current scope is suitable for an initial real-service launch where operations are still manually supervised. The remaining non-blocking launch items are mainly operational maturity: email sender domain, monitoring, analytics, richer audit logs, and external partner handoff format finalization.

## Environment variables

### Required for app runtime

| Variable | Required | Used by | Missing impact |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase clients, middleware/proxy, health checks | App cannot create Supabase clients; most pages fail. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client auth/RLS access | Auth and data access fail. |
| `NEXT_PUBLIC_SITE_URL` | Production recommended | metadata/canonical URLs, production smoke defaults | App can fall back to Vercel project URL, but canonical/metadata may be less stable. |

### Required for admin/server operations

| Variable | Required | Used by | Missing impact |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for cron and verification scripts | `createAdminClient`, E2E verification, production smoke signup cleanup, sample seeding | Cron endpoint throws after auth if invoked; verification scripts fail or skip cleanup. Must never be exposed as `NEXT_PUBLIC_*`. |
| `CRON_SECRET` | Required if Vercel Cron is enabled | `/api/cron/overdue-application-emails` | Cron endpoint always returns 401, so no scheduled emails run. Normal app usage is unaffected. |
| `RESEND_API_KEY` | Required for real email sending | `sendEmail` | Email delivery is skipped with `missing_email_env`; normal app usage is unaffected. |
| `EMAIL_FROM` | Required for real email sending | `sendEmail` | Email delivery is skipped with `missing_email_env`; must use a Resend-verified sender/domain for production. |

## Email and cron status

Current behavior is safe for launch without email:

- If `RESEND_API_KEY` or `EMAIL_FROM` is missing, `sendEmail` logs and returns `{ skipped: true, reason: "missing_email_env" }`.
- The overdue application digest cron still computes recipients, but email sends are skipped when email env is incomplete.
- The cron route requires `Authorization: Bearer ${CRON_SECRET}`. If `CRON_SECRET` is missing or wrong, it returns 401.
- Admin request handoff email buttons remain disabled until both `RESEND_API_KEY` and `EMAIL_FROM` are configured. Operators can still use the handoff draft and file bundle download flow.

Recommended before enabling email:

1. Buy or connect a sending domain.
2. Verify that domain in Resend.
3. Set `EMAIL_FROM`, for example `Uniwork <notifications@your-domain.com>`.
4. Set `RESEND_API_KEY`.
5. Set a random high-entropy `CRON_SECRET` in Vercel.
6. Re-run production smoke and manually invoke the cron endpoint with the bearer token.

## Verification scripts

Run before and after major releases:

```bash
npm run lint
npm run build
npm run check:deploy
npm run verify:supabase
npm run verify:resume-access
npm run verify:public-journey -- https://uniwork-one.vercel.app
npm run verify:production -- https://uniwork-one.vercel.app
```

What they cover:

- `verify:supabase`: auth trigger, role creation, company ownership, verified company job publishing, public job reads, seeker application submission, company applicant access/status updates, admin request packets, supplement submission/acknowledgement, partner assignment and partner read access.
- `verify:resume-access`: private resume creation, application `resume_id` ownership guard, submission snapshots, company applicant resume access, unrelated company denial.
- `verify:public-journey`: public home/jobs/company/login/signup pages, PWA manifest, health endpoint, protected route redirect, and not-found recovery page.
- `verify:production`: deployed health/PWA/metadata, public route assets, and Supabase Auth production callback acceptance when service role key is available.

Manual browser QA is tracked in `docs/manual-qa-checklist.md`.

## RLS confidence

Current high-value RLS boundaries are covered by scripts:

- Seekers can create/read their own profile, resume, applications, admin requests, and supplements.
- Company owners can read applicants/resumes only for jobs owned by their companies.
- Unrelated company owners cannot read seeker resumes or admin request supplements.
- Admins can manage verification, jobs, users, and admin requests.
- Partners can read assigned admin requests and related seeker summaries.

Manual spot checks still recommended before launch:

- Login as a seeker and verify `/company` redirects or blocks operational data.
- Login as a company and verify another company's applicant detail URL returns not found/no access.
- Login as a partner and verify only assigned admin requests are visible via RLS-backed reads.

## Vercel environment risk matrix

| Missing in Vercel | User-facing impact | Operational impact | Severity |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | App data/auth fail broadly | Production unusable | Blocker |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App data/auth fail broadly | Production unusable | Blocker |
| `NEXT_PUBLIC_SITE_URL` | Metadata/canonical may use fallback URL | Lower SEO/share confidence | Medium |
| `SUPABASE_SERVICE_ROLE_KEY` | Normal pages mostly unaffected | Cron cannot query with admin privileges; production smoke cannot fully verify auth callback cleanup | High for operations |
| `CRON_SECRET` | Normal pages unaffected | Email cron disabled by 401 | Medium |
| `RESEND_API_KEY` | Normal pages unaffected | Emails skipped | Medium |
| `EMAIL_FROM` | Normal pages unaffected | Emails skipped | Medium |

## Launch readiness answer

Functionally and UI/UX-wise, the current codebase is no longer a rough prototype. It has enough of the real service surface to launch an MVP with manual operations:

- Seeker job discovery, readiness guidance, application submission, resume/profile, application status, and admin request follow-up are coherent.
- Company job posting, applicant list/detail, status workflow, settings, and dashboard are operational.
- Admin verification, job operations, admin request review, supplement acknowledgement, handoff draft, and operation timeline are usable.

What is not "done" in the long-term product sense:

- Real email delivery is intentionally deferred until a sender domain is verified.
- External administrative professional workspace/portal is not implemented; admin handoff remains internal/manual.
- Payments, analytics, monitoring/alerting, formal audit log UI, and legal document workflows are not production-mature.
- Content/legal copy should still be reviewed before public marketing.

Recommended launch stance: controlled beta / MVP launch is reasonable after domain/email decision and final manual QA. Full public-scale launch should wait for monitoring, formal handoff process, and email domain setup.
