import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationCompletion } from "@/lib/applications/completeness";
import { translateCompletionItems } from "@/lib/applications/completion-labels";
import {
  formatWage,
  getEmploymentTypeLabel,
  getLocalizedPath,
  getLocale,
  type Locale,
} from "@/lib/i18n";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SeekerProfile = {
  alien_registration_status: string | null;
  available_times: {
    weekday?: string;
    weekend?: string;
  } | null;
  english_level: string | null;
  korean_level: string | null;
  major: string | null;
  nationality: string | null;
  preferred_job_types: string[] | null;
  preferred_locations: string[] | null;
  school: string | null;
  visa_type: string | null;
};

function getProfileCompletion(profile: SeekerProfile | null) {
  if (!profile) {
    return 0;
  }

  const checks = [
    profile.nationality,
    profile.visa_type,
    profile.alien_registration_status,
    profile.school,
    profile.major,
    profile.korean_level,
    profile.english_level,
    profile.preferred_locations?.length,
    profile.preferred_job_types?.length,
    profile.available_times?.weekday || profile.available_times?.weekend,
  ];
  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

const meText = {
  en: {
    adminRequests: "Admin requests",
    allApplications: "View all",
    applicationCountNote: "Applications submitted",
    applications: "Applications",
    appliedAt: "Applied",
    companyNote: "Employer note",
    dashboardEyebrow: "Seeker dashboard",
    emptyApplicationsBody:
      "Complete your readiness information, then find jobs you can apply to.",
    emptyApplicationsTitle: "You have not applied to any jobs yet.",
    findJobs: "Find jobs",
    jobsAfterReady:
      "Once your profile and resume are complete, you can apply directly from job detail pages.",
    moreJobs: "View more jobs",
    noJobs: "No published jobs yet.",
    profile: "Profile",
    profileReady: "Basic application information is complete",
    profileReview: "Basic information for D-2/D-4 eligibility review",
    readiness: "Application readiness",
    readyJobs: "View eligible jobs",
    readyStart: "Start readiness",
    recentApplications: "Recent applications",
    recentApplicationsBody: "Track employer status changes and notes.",
    recentJobs: "Recently published jobs",
    resume: "Resume",
    resumeReady: "Resume information for employers is complete",
    resumeReview: "Add your introduction and language information",
    statusDone: "Done",
    statusNeeded: "Needed",
    title: "Manage your application readiness and administrative requests",
    subtitle:
      "Check profile readiness, applications, and administrative requests from your account data.",
    verifiedCompany: "Verified company",
  },
  ko: {
    adminRequests: "행정 요청",
    allApplications: "전체 보기",
    applicationCountNote: "내가 지원한 공고 수",
    applications: "지원 내역",
    appliedAt: "지원일",
    companyNote: "기업 안내",
    dashboardEyebrow: "Seeker dashboard",
    emptyApplicationsBody: "준비 정보를 채운 뒤 지원 가능한 공고를 찾아보세요.",
    emptyApplicationsTitle: "아직 지원한 공고가 없습니다.",
    findJobs: "공고 찾기",
    jobsAfterReady: "프로필과 이력서를 채우면 공고 상세에서 바로 지원할 수 있습니다.",
    moreJobs: "더 많은 공고 보기",
    noJobs: "아직 공개 공고가 없습니다.",
    profile: "프로필",
    profileReady: "지원 기본 정보 입력 완료",
    profileReview: "D-2/D-4 지원 검토를 위한 기본 정보",
    readiness: "지원 준비도",
    readyJobs: "지원 가능 공고 보기",
    readyStart: "준비 시작",
    recentApplications: "최근 지원 현황",
    recentApplicationsBody: "기업 상태 변경과 안내 메모를 바로 확인합니다.",
    recentJobs: "최근 공개 공고",
    resume: "이력서",
    resumeReady: "기업에게 보여줄 이력 정보 입력 완료",
    resumeReview: "자기소개와 언어 정보를 입력해주세요",
    statusDone: "완료",
    statusNeeded: "필요",
    title: "지원 준비 상태와 행정 요청을 관리합니다",
    subtitle:
      "프로필 완성도, 지원 내역, 행정 요청 현황을 실제 계정 데이터 기준으로 확인합니다.",
    verifiedCompany: "인증 기업",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = meText[locale];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(getLocalizedPath("/login?next=/me", locale));
  }

  const [
    { data: profile },
    { data: applications, count: applicationCount },
    { data: adminRequests, count: adminRequestCount },
    { data: resume },
  ] = await Promise.all([
      supabase
        .from("seeker_profiles")
        .select(
          "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("job_applications")
        .select("id, job_id, status, applied_at, status_updated_at, company_note", {
          count: "exact",
        })
        .eq("seeker_id", user.id)
        .order("applied_at", { ascending: false }),
      supabase
        .from("admin_requests")
        .select(
          "id, type, status, seeker_followup_note, seeker_followup_requested_at, updated_at",
          { count: "exact" },
        )
        .eq("seeker_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("resumes")
        .select("id, title, intro, education, experience, languages")
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
  const { data: accountProfile } = await supabase
    .from("profiles")
    .select("name, email, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const avatarUrl = getProfilePhotoUrl(supabase, accountProfile?.avatar_path);
  const recentApplications = applications?.slice(0, 3) ?? [];
  const recentJobIds = recentApplications.map((application) => application.job_id);
  const { data: recentJobs } =
    recentJobIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title, location, employment_type")
          .in("id", recentJobIds)
      : { data: [] };
  const recentCompanyIds = Array.from(
    new Set(recentJobs?.map((job) => job.company_id) ?? []),
  );
  const { data: recentCompanies } =
    recentCompanyIds.length > 0
      ? await supabase.from("companies").select("id, name").in("id", recentCompanyIds)
      : { data: [] };
  const jobById = new Map(recentJobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(
    recentCompanies?.map((company) => [company.id, company]) ?? [],
  );
  const { data: recommendedJobs } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, location, employment_type, category, wage_type, wage_amount, visa_support_type, published_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(6);
  const recommendedCompanyIds = Array.from(
    new Set(recommendedJobs?.map((job) => job.company_id) ?? []),
  );
  const { data: recommendedCompanies } =
    recommendedCompanyIds.length > 0
      ? await supabase
          .from("companies")
          .select("id, name, verification_status")
          .in("id", recommendedCompanyIds)
      : { data: [] };
  const recommendedCompanyById = new Map(
    recommendedCompanies?.map((company) => [company.id, company]) ?? [],
  );

  const profileCompletion = getProfileCompletion(profile);
  const applicationCompletion = getApplicationCompletion({
    profile,
    resume,
  });
  const nextSteps = [
    {
      complete: applicationCompletion.profile.isComplete,
      href: "/me/profile",
      label: locale === "en" ? "Complete profile" : "프로필 입력",
      note: applicationCompletion.profile.isComplete
        ? locale === "en"
          ? "Visa, school, and availability are ready"
          : "비자/학교/근무 가능 시간 준비 완료"
        : `${translateCompletionItems(applicationCompletion.profile.missing.slice(0, 2), locale).join(", ")} ${
            locale === "en" ? "needed" : "보완 필요"
          }`,
    },
    {
      complete: applicationCompletion.resume.isComplete,
      href: "/me/resume",
      label: locale === "en" ? "Complete resume" : "이력서 입력",
      note: applicationCompletion.resume.isComplete
        ? locale === "en"
          ? "Introduction and language information are ready"
          : "자기소개/언어 정보 준비 완료"
        : `${translateCompletionItems(applicationCompletion.resume.missing.slice(0, 2), locale).join(", ")} ${
            locale === "en" ? "needed" : "보완 필요"
          }`,
    },
    {
      complete: applicationCompletion.isComplete,
      href: applicationCompletion.isComplete ? "/jobs?profile_fit=eligible" : "/jobs",
      label: locale === "en" ? "Find jobs" : "공고 찾기",
      note: applicationCompletion.isComplete
        ? locale === "en"
          ? "View jobs based on your profile"
          : "내 프로필 기준 지원 가능 공고 확인"
        : locale === "en"
          ? "Update your information for more accurate eligibility checks"
          : "정보 보완 후 지원 가능성이 더 정확해집니다",
    },
  ];
  const cards = [
    {
      label: t.profile,
      value: `${profileCompletion}%`,
      note:
        profileCompletion === 100
          ? t.profileReady
          : t.profileReview,
      icon: ShieldCheck,
    },
    {
      label: t.applications,
      value: String(applicationCount ?? 0),
      note: t.applicationCountNote,
      icon: Send,
    },
    {
      label: t.resume,
      value: `${applicationCompletion.resume.completedCount}/${applicationCompletion.resume.totalCount}`,
      note: applicationCompletion.resume.isComplete
        ? t.resumeReady
        : t.resumeReview,
      icon: FileText,
    },
    {
      label: t.adminRequests,
      value: String(adminRequestCount ?? 0),
      note:
        locale === "en" ? "Administrative requests submitted" : "접수한 행정 요청 수",
      icon: FileText,
    },
  ];
  const applicationStatusCounts = new Map<string, number>();
  applications?.forEach((application) => {
    applicationStatusCounts.set(
      application.status,
      (applicationStatusCounts.get(application.status) ?? 0) + 1,
    );
  });
  const activeFollowupRequests =
    adminRequests?.filter(
      (request) =>
        request.seeker_followup_note &&
        request.status !== "completed" &&
        request.status !== "rejected",
    ) ?? [];
  const latestFollowupRequest = activeFollowupRequests[0];
  const dashboardAlerts = [
    ...(latestFollowupRequest
      ? [
          {
            href: `/me/admin-requests#request-${latestFollowupRequest.id}`,
            label: locale === "en" ? "Admin request needs follow-up" : "행정 요청 보완 필요",
            note: `${getAdminRequestTypeLabel(latestFollowupRequest.type, locale)} · ${
              getAdminRequestFollowupNote(latestFollowupRequest.seeker_followup_note, locale)
            }`,
            tone: "amber",
          },
        ]
      : []),
    ...(!applicationCompletion.profile.isComplete
      ? [
          {
            href: "/me/profile",
            label: locale === "en" ? "Profile needs update" : "프로필 보완 필요",
            note: translateCompletionItems(
              applicationCompletion.profile.missing.slice(0, 3),
              locale,
            ).join(", "),
            tone: "slate",
          },
        ]
      : []),
    ...(!applicationCompletion.resume.isComplete
      ? [
          {
            href: "/me/resume",
            label: locale === "en" ? "Resume needs update" : "이력서 보완 필요",
            note: translateCompletionItems(
              applicationCompletion.resume.missing.slice(0, 3),
              locale,
            ).join(", "),
            tone: "slate",
          },
        ]
      : []),
    ...(applicationStatusCounts.get("accepted")
      ? [
          {
            href: "/me/applications?status=accepted",
            label: locale === "en" ? "Accepted application" : "합격 처리된 지원",
            note:
              locale === "en"
                ? `Check ${applicationStatusCounts.get("accepted")} accepted application(s).`
                : `${applicationStatusCounts.get("accepted")}건의 합격 상태를 확인하세요`,
            tone: "green",
          },
        ]
      : []),
  ].slice(0, 3);

  return (
    <DashboardShell area="me" locale={locale}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-xl font-black text-blue-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Profile photo"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              (accountProfile?.name || accountProfile?.email || "U").slice(0, 1)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              {t.dashboardEyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              {t.title}
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {t.subtitle}
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-blue-950">
                {t.readiness} {applicationCompletion.completedCount}/
                {applicationCompletion.totalCount}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
                {t.jobsAfterReady}
              </p>
            </div>
            <Link
              className={cn(buttonVariants({ className: "w-full sm:w-auto" }))}
              href={getLocalizedPath(
                applicationCompletion.isComplete
                  ? "/jobs?profile_fit=eligible"
                  : "/me/profile",
                locale,
              )}
            >
              {applicationCompletion.isComplete ? t.readyJobs : t.readyStart}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {nextSteps.map((step) => (
              <Link
                className={cn(
                  "rounded-xl border p-3 transition",
                  step.complete
                    ? "border-emerald-100 bg-white/80"
                    : "border-blue-100 bg-white hover:bg-blue-50",
                )}
                href={getLocalizedPath(step.href, locale)}
                key={step.label}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900">{step.label}</p>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-black",
                      step.complete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {step.complete ? t.statusDone : t.statusNeeded}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                  {step.note}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={card.label}
            >
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-black">{card.value}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {card.note}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black">{t.recentApplications}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {t.recentApplicationsBody}
              </p>
            </div>
            <Link
              className="text-sm font-black text-blue-700 hover:text-blue-900"
              href={getLocalizedPath("/me/applications", locale)}
            >
              {t.allApplications}
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentApplications.length > 0 ? (
              recentApplications.map((application) => {
                const job = jobById.get(application.job_id);
                const company = job ? companyById.get(job.company_id) : null;

                return (
                  <article className="px-5 py-4" key={application.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-slate-950">
                          {job?.title ?? (locale === "en" ? "Job" : "공고")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {company?.name ?? "Company"} · {job?.location ?? "-"} ·{" "}
                          {getEmploymentTypeLabel(job?.employment_type, locale)}
                        </p>
                      </div>
                      <span className={getStatusBadgeClassName("application", application.status)}>
                        {getStatusMeta("application", application.status, locale).label}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {t.appliedAt}{" "}
                      {new Date(application.applied_at).toLocaleString(
                        locale === "en" ? "en-US" : "ko-KR",
                      )}
                    </p>
                    {application.company_note ? (
                      <p className="mt-2 line-clamp-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">
                        {t.companyNote}: {application.company_note}
                      </p>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="px-5 py-8">
                <p className="text-sm font-black text-slate-700">
                  {t.emptyApplicationsTitle}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {t.emptyApplicationsBody}
                </p>
                <Link
                  className={cn(buttonVariants({ className: "mt-4", size: "sm" }))}
                  href={getLocalizedPath("/jobs", locale)}
                >
                  {t.findJobs}
                </Link>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">
              {locale === "en" ? "Things to check" : "확인 사항"}
            </h2>
            <div className="mt-4 grid gap-2">
              {dashboardAlerts.length > 0 ? (
                dashboardAlerts.map((alert) => (
                  <Link
                    className={cn(
                      "group rounded-xl border p-3 transition hover:bg-blue-50",
                      alert.tone === "amber" && "border-amber-100 bg-amber-50",
                      alert.tone === "green" && "border-emerald-100 bg-emerald-50",
                      alert.tone === "slate" && "border-slate-100 bg-slate-50",
                    )}
                    href={getLocalizedPath(alert.href, locale)}
                    key={alert.label}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">
                        {alert.label}
                      </p>
                      {alert.tone === "green" ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle className="size-4 shrink-0 text-amber-700" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-slate-600">
                      {alert.note ||
                        (locale === "en" ? "Check the details." : "상세 내용을 확인해주세요.")}
                    </p>
                    <p className="mt-2 text-xs font-black text-blue-700 group-hover:text-blue-900">
                      {locale === "en" ? "Review" : "확인하기"}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-sm font-black text-emerald-900">
                    {locale === "en"
                      ? "Your application readiness is organized."
                      : "지원 준비가 정리되어 있습니다."}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                    {locale === "en"
                      ? "Explore matched jobs and continue applying."
                      : "맞춤 공고를 확인하고 지원을 이어가세요."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">{t.recentJobs}</h2>
              <BriefcaseBusiness className="size-5 text-blue-700" />
            </div>
            <div className="mt-4 grid gap-3">
              {(recommendedJobs ?? []).slice(0, 3).map((job) => {
                const company = recommendedCompanyById.get(job.company_id);
                const wage = formatWage(job.wage_amount, job.wage_type, locale);

                return (
                  <Link
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-blue-50"
                    href={getLocalizedPath(`/jobs/${job.id}`, locale)}
                    key={job.id}
                  >
                    <p className="line-clamp-1 text-sm font-black text-slate-950">
                      {job.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {company?.name ?? "Company"} · {job.location || "-"} · {wage}
                    </p>
                    {company?.verification_status === "verified" ? (
                      <span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                        {t.verifiedCompany}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              {recommendedJobs && recommendedJobs.length > 0 ? (
                <Link
                  className={cn(buttonVariants({ className: "w-full", size: "sm" }))}
                  href={getLocalizedPath(
                    applicationCompletion.isComplete
                      ? "/jobs?profile_fit=eligible"
                      : "/jobs",
                    locale,
                  )}
                >
                  {t.moreJobs}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-slate-500">
                  {t.noJobs}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function getAdminRequestTypeLabel(value: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    document_review: { en: "Document pre-check", ko: "서류 사전 검토" },
    other: { en: "Other consultation", ko: "기타 상담" },
    part_time_work_permission: {
      en: "Part-time work permission review",
      ko: "시간제 취업 허가 검토",
    },
    visa_eligibility_review: { en: "Visa eligibility review", ko: "비자 지원 가능성 검토" },
  };

  return labels[value]?.[locale] ?? value;
}

function getAdminRequestFollowupNote(value: string, locale: Locale) {
  if (locale !== "en") {
    return value;
  }

  const labels: Record<string, string> = {
    "학교 담당자 확인서와 근로 예정 확인서를 추가로 첨부해주세요.":
      "Please attach the school approval/contact confirmation and hiring confirmation documents.",
  };

  return labels[value] ?? value;
}
