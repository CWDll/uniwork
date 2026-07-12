# Uniwork manual QA checklist

Last reviewed: 2026-07-12

Use this checklist before a controlled production release. Do not commit QA account passwords to this file; keep them in the release handoff message or password manager only.

## 0. Pre-flight

- [ ] Production URL opens: https://uniwork-one.vercel.app
- [ ] `npm run check:deploy` passes, with only known email/cron warnings if email is intentionally disabled.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run verify:supabase` passes.
- [ ] `npm run verify:resume-access` passes.
- [ ] `npm run verify:public-journey -- https://uniwork-one.vercel.app` passes.
- [ ] `npm run verify:production -- https://uniwork-one.vercel.app` passes.
- [ ] Known limitation is acknowledged: real email delivery is disabled until a Resend verified sender/domain is configured.

## 1. Public visitor

- [ ] Home `/` shows clear seeker/company CTAs: `공고 보기`, `구직자 시작`, `기업 시작`.
- [ ] Jobs `/jobs` loads without login and shows job cards or a useful empty state.
- [ ] Jobs filters work for keyword, location, category, employment type, wage, visa, and profile-fit toggle.
- [ ] Job detail opens from a public job card and shows application CTA.
- [ ] Company landing `/corp` explains employer value and links to signup/company dashboard.
- [ ] Login `/login` and signup `/signup` are reachable from public navigation.
- [ ] Unknown URL shows the friendly not-found screen and recovery links.
- [ ] Mobile width around 390px has no overlapping nav, CTA, filter, card, or footer text.

## 2. Seeker account

- [ ] Login succeeds with the QA seeker account.
- [ ] `/me` dashboard shows meaningful application/profile/admin-request summaries.
- [ ] `/me/profile` can save core identity, visa, school, work availability, contact, and photo fields.
- [ ] `/me/resume` can save introduction, education, experience, languages, skills, and contact preferences.
- [ ] `/jobs` shows profile-based application readiness after profile/resume data exists.
- [ ] Applying to a job uses the current profile/resume snapshot and links `job_applications.resume_id`.
- [ ] If profile/resume data is incomplete, the application screen shows missing-information guidance and CTA links.
- [ ] `/me/applications` shows submitted applications and status changes.
- [ ] `/me/admin-requests` can create an administrative document review request.
- [ ] Admin-request supplement flow lets the seeker respond after an admin asks for more information.
- [ ] Seeker cannot access company/admin operational data through sidebar or direct URL.

## 3. Company account

- [ ] Login succeeds with the QA company account.
- [ ] `/company` dashboard shows useful counts, recent applicants, and operational next actions.
- [ ] `/company/settings` shows verification status and company profile fields clearly.
- [ ] Verified company can create and publish a job without per-job admin approval.
- [ ] Unverified company sees verification guidance instead of a confusing failure.
- [ ] `/company/jobs` lists company-owned jobs with status, applicant counts, and useful empty states.
- [ ] `/company/applications` supports filters/sorting for applicant status, readiness, completeness, job, and date.
- [ ] Applicant detail shows profile, resume, application snapshot, readiness, and status history.
- [ ] Applicant print/PDF view is readable and includes profile/resume/admin context where available.
- [ ] Company can update only its own applicants and cannot open another company's applicant detail URL.

## 4. Admin account

- [ ] Login succeeds with the QA admin or owner admin account.
- [ ] `/admin` dashboard highlights company verification, job operations, user/application/admin-request counts, and stale items.
- [ ] `/admin/companies` can approve or request supplements for a company.
- [ ] `/admin/jobs` can inspect public job quality and operational status.
- [ ] `/admin/users` can filter users and identify role/profile completeness issues.
- [ ] `/admin/admin-requests` shows request packet completeness, supplements, admin notes, and handoff readiness.
- [ ] Admin can request seeker supplement and later acknowledge the submitted supplement.
- [ ] Handoff draft page creates a usable manual packet without treating the external partner process as fully automated.
- [ ] Admin-only pages are blocked for seeker/company accounts.

## 5. Error and recovery states

- [ ] Invalid login shows a clear form error.
- [ ] Protected routes redirect unauthenticated users to login with a return path.
- [ ] Missing profile/resume/company records show recovery CTAs rather than a blank page.
- [ ] Empty application/job/admin-request lists explain what to do next.
- [ ] Failed save actions preserve context and show a visible error.
- [ ] Browser back/refresh after form submissions does not create duplicate confusing records.

## 6. Release notes

- [ ] Record the deployed commit SHA.
- [ ] Record which SQL migrations were manually applied in Supabase.
- [ ] Record whether email/cron is enabled or intentionally disabled.
- [ ] Rotate or delete QA credentials before broad public launch.
