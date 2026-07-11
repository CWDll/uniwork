import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  FilePlus2,
  Gauge,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationAttention } from "@/lib/applications/attention";
import { getApplicationCompletion } from "@/lib/applications/completeness";
import {
  getApplicationSnapshotMeta,
  getProfileForApplication,
  getResumeForApplication,
} from "@/lib/applications/snapshot";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function CompanyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/company");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, verification_status, verification_note")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const companyIds = companies?.map((company) => company.id) ?? [];

  const { data: jobs } =
    companyIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title, location, status, created_at, published_at")
          .in("company_id", companyIds)
      : { data: [] };

  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { count: applicantCount } =
    jobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds)
      : { count: 0 };

  const { data: recentApplications } =
    jobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select(
            "id, job_id, seeker_id, resume_id, profile_snapshot, resume_snapshot, status, message, company_note, applied_at, status_updated_at",
          )
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false })
          .limit(30)
      : { data: [] };
  const seekerIds = Array.from(
    new Set(recentApplications?.map((application) => application.seeker_id) ?? []),
  );
  const resumeIds = Array.from(
    new Set(
      recentApplications
        ?.map((application) => application.resume_id)
        .filter((resumeId): resumeId is string => Boolean(resumeId)) ?? [],
    ),
  );
  const { data: profiles } =
    seekerIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", seekerIds)
      : { data: [] };
  const { data: seekerProfiles } =
    seekerIds.length > 0
      ? await supabase
          .from("seeker_profiles")
          .select(
            "user_id, nationality, visa_type, school, major, korean_level, english_level, preferred_locations, preferred_job_types, alien_registration_status, available_times",
          )
          .in("user_id", seekerIds)
      : { data: [] };
  const { data: linkedResumes } =
    resumeIds.length > 0
      ? await supabase
          .from("resumes")
          .select("id, seeker_id, title, intro, education, experience, languages")
          .in("id", resumeIds)
      : { data: [] };
  const { data: seekerResumes } =
    seekerIds.length > 0
      ? await supabase
          .from("resumes")
          .select("id, seeker_id, title, intro, education, experience, languages, created_at")
          .in("seeker_id", seekerIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);
  const profileById = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);
  const seekerProfileById = new Map(
    seekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
  );
  const linkedResumeById = new Map(
    linkedResumes?.map((resume) => [resume.id, resume]) ?? [],
  );
  const firstResumeBySeekerId = new Map<string, NonNullable<typeof seekerResumes>[number]>();
  seekerResumes?.forEach((resume) => {
    if (!firstResumeBySeekerId.has(resume.seeker_id)) {
      firstResumeBySeekerId.set(resume.seeker_id, resume);
    }
  });
  const scoredApplications = (recentApplications ?? [])
    .map((application) => {
      const job = jobById.get(application.job_id);
      const profile = profileById.get(application.seeker_id);
      const seekerProfile = getProfileForApplication({
        liveProfile: seekerProfileById.get(application.seeker_id) ?? null,
        snapshot: application.profile_snapshot,
      });
      const resume = getResumeForApplication({
        liveResume:
          (application.resume_id
            ? linkedResumeById.get(application.resume_id)
            : firstResumeBySeekerId.get(application.seeker_id)) ?? null,
        snapshot: application.resume_snapshot,
      });
      const completion = getApplicationCompletion({
        profile: seekerProfile ?? null,
        resume: resume ?? null,
      });
      const snapshotMeta = getApplicationSnapshotMeta({
        appliedAt: application.applied_at,
        profileSnapshot: application.profile_snapshot,
        resumeSnapshot: application.resume_snapshot,
      });
      const attention = getApplicationAttention({
        appliedAt: application.applied_at,
        hasCompanyNote: Boolean(application.company_note?.trim()),
        hasCompleteSnapshot: snapshotMeta.hasCompleteSnapshot,
        isComplete: completion.isComplete,
        status: application.status,
        statusUpdatedAt: application.status_updated_at,
      });

      return {
        application,
        attention,
        company: job ? companyById.get(job.company_id) : null,
        completion,
        job,
        profile,
      };
    })
    .filter((item) => item.attention.score >= 40)
    .sort((first, second) => second.attention.score - first.attention.score);
  const attentionApplications = scoredApplications.slice(0, 5);
  const overdueReviewApplications = scoredApplications.filter(
    (item) => item.attention.flags.isOverdueReview,
  );
  const verifiedCompanies =
    companies?.filter((company) => company.verification_status === "verified") ?? [];
  const pendingCompanies =
    companies?.filter((company) => company.verification_status === "pending") ?? [];
  const rejectedCompanies =
    companies?.filter((company) => company.verification_status === "rejected") ?? [];
  const publishedJobs = jobs?.filter((job) => job.status === "published") ?? [];
  const recentApplicantCount = recentApplications?.length ?? 0;
  const submittedCount = (recentApplications ?? []).filter(
    (application) => application.status === "submitted",
  ).length;
  const reviewingCount = (recentApplications ?? []).filter(
    (application) => application.status === "reviewing",
  ).length;
  const applicantCountByJobId = new Map<string, number>();
  recentApplications?.forEach((application) => {
    applicantCountByJobId.set(
      application.job_id,
      (applicantCountByJobId.get(application.job_id) ?? 0) + 1,
    );
  });
  const jobsWithoutApplicants = publishedJobs.filter(
    (job) => (applicantCountByJobId.get(job.id) ?? 0) === 0,
  );
  const dashboardInsight =
    overdueReviewApplications.length > 0
      ? "미검토 지원자를 먼저 처리하면 구직자 이탈을 줄일 수 있습니다."
      : publishedJobs.length === 0
        ? "인증된 회사/지점으로 첫 공고를 공개하면 지원을 받을 수 있습니다."
        : jobsWithoutApplicants.length > 0
          ? "지원자가 없는 공개 공고의 제목/조건을 점검해보세요."
          : "현재 지원자 응대 흐름이 안정적으로 유지되고 있습니다.";

  const metrics = [
    { label: "Verified branches", value: verifiedCompanies.length, icon: CheckCircle2 },
    { label: "Published jobs", value: publishedJobs.length, icon: BriefcaseBusiness },
    { label: "Applicants", value: applicantCount ?? 0, icon: UsersRound },
    {
      label: "Needs action",
      value: attentionApplications.length,
      icon: AlertTriangle,
    },
    {
      label: "24h unreviewed",
      value: overdueReviewApplications.length,
      icon: AlertTriangle,
    },
    { label: "No applicants", value: jobsWithoutApplicants.length, icon: Gauge },
  ];
  const actionCards = [
    {
      cta: verifiedCompanies.length > 0 ? "공고 작성" : "인증 상태 확인",
      href: verifiedCompanies.length > 0 ? "/company/jobs" : "/company/settings",
      icon: FilePlus2,
      label: "다음 공고",
      note:
        verifiedCompanies.length > 0
          ? "인증된 회사/지점은 공고를 저장하면 바로 공개됩니다."
          : "회사/지점 인증 후 공고를 바로 공개할 수 있습니다.",
      tone: verifiedCompanies.length > 0 ? "blue" : "amber",
    },
    {
      cta: "지원자 보기",
      href: "/company/applications?sort=action_needed",
      icon: UsersRound,
      label: "지원자 응대",
      note: `${submittedCount}명 미검토 · ${reviewingCount}명 검토 중`,
      tone: submittedCount > 0 ? "red" : "slate",
    },
    {
      cta: "공고 관리",
      href: "/company/jobs?status=published",
      icon: Gauge,
      label: "공고 성과",
      note: `${publishedJobs.length}개 공개 중 · ${jobsWithoutApplicants.length}개 지원자 없음`,
      tone: jobsWithoutApplicants.length > 0 ? "amber" : "slate",
    },
  ];

  return (
    <DashboardShell area="company">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {companyIds.length > 0
            ? `${companyIds.length}개 회사/지점 관리 중`
            : "회사/지점을 먼저 등록해주세요"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          한 구인자 계정에서 여러 회사 또는 지점을 등록하고, 각 공고를 특정
          회사/지점에 연결합니다.
        </p>
        {companyIds.length === 0 ? (
          <Link
            className={cn(buttonVariants({ className: "mt-5" }))}
            href="/company/settings"
          >
            기업 정보 저장하기
          </Link>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {companies?.slice(0, 4).map((company) => {
              const status = getStatusMeta(
                "companyVerification",
                company.verification_status,
              );

              return (
                <span
                  className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
                  key={company.id}
                  title={company.verification_note ?? undefined}
                >
                  {company.name}
                  <span
                    className={getStatusBadgeClassName(
                      "companyVerification",
                      company.verification_status,
                    )}
                  >
                    {status.label}
                  </span>
                </span>
              );
            })}
          </div>
        )}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Gauge className="mt-0.5 size-5 shrink-0 text-blue-700" />
            <div className="min-w-0">
              <p className="text-sm font-black text-blue-950">오늘의 운영 포인트</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
                {dashboardInsight}
              </p>
            </div>
          </div>
        </div>
      </div>

      {rejectedCompanies.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-950">
            인증 보완이 필요한 회사/지점이 {rejectedCompanies.length}개 있습니다.
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
            운영자 메모를 확인하고 회사 정보를 보완해주세요.
          </p>
          <Link
            className={cn(buttonVariants({ className: "mt-3", variant: "outline" }))}
            href="/company/settings"
          >
            인증 메모 확인
          </Link>
        </div>
      ) : null}

      {overdueReviewApplications.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-red-900">
              24시간 이상 미검토 지원자가 {overdueReviewApplications.length}명 있습니다.
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-red-800">
              상태를 검토 중으로 바꾸거나 구직자 안내 메모를 남겨주세요.
            </p>
          </div>
          <Link
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700"
            href="/company/applications?alert=overdue&attention=overdue&sort=action_needed"
          >
            알림 대상 보기
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={metric.label}
            >
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 text-3xl font-black">{metric.value}</p>
            </article>
          );
        })}
      </div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-700">
                Operating plan
              </p>
              <h2 className="mt-1 text-xl font-black">지금 할 일</h2>
            </div>
            <Link
              className="text-sm font-black text-blue-700 hover:text-blue-900"
              href="/company/applications"
            >
              지원자 전체 보기
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {actionCards.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className={cn(
                    "rounded-2xl border p-4 transition hover:bg-slate-50",
                    item.tone === "red" && "border-red-100 bg-red-50",
                    item.tone === "amber" && "border-amber-100 bg-amber-50",
                    item.tone === "blue" && "border-blue-100 bg-blue-50",
                    item.tone === "slate" && "border-slate-100 bg-slate-50",
                  )}
                  href={item.href}
                  key={item.label}
                >
                  <Icon className="size-5 text-slate-700" />
                  <p className="mt-3 text-sm font-black text-slate-950">
                    {item.label}
                  </p>
                  <p className="mt-1 min-h-10 text-sm font-semibold leading-5 text-slate-600">
                    {item.note}
                  </p>
                  <span className="mt-3 inline-flex rounded-md bg-white/80 px-2 py-1 text-xs font-black text-slate-700">
                    {item.cta}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            This week
          </p>
          <h2 className="mt-1 text-xl font-black">최근 흐름</h2>
          <div className="mt-4 grid gap-3">
            <MiniStat label="최근 7일 신규 지원" value={`${recentApplicantCount}명`} />
            <MiniStat label="검토 대기" value={`${submittedCount}명`} />
            <MiniStat label="인증 대기 회사/지점" value={`${pendingCompanies.length}개`} />
            <MiniStat label="공개 공고" value={`${publishedJobs.length}개`} />
          </div>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-700">
              Follow-up queue
            </p>
            <h2 className="mt-1 text-xl font-black">오늘 확인할 지원자</h2>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
            href="/company/applications?attention=needed&sort=action_needed"
          >
            전체 보기
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {attentionApplications.length > 0 ? (
            attentionApplications.map((item) => {
              const status = getStatusMeta(
                "application",
                item.application.status,
              );

              return (
                <article
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  key={item.application.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="break-words font-black text-slate-950 hover:text-blue-700"
                        href={`/company/applications/${item.application.id}`}
                      >
                        {item.profile?.name ||
                          item.profile?.email ||
                          "Applicant"}
                      </Link>
                      <span
                        className={getStatusBadgeClassName(
                          "application",
                          item.application.status,
                        )}
                      >
                        {status.label}
                      </span>
                      <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                        {item.attention.summary}
                      </span>
                      {item.attention.flags.isOverdueReview ? (
                        <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white">
                          24시간 미검토
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                      {item.job?.title ?? "Job"} ·{" "}
                      {item.company?.name ?? "Company"} ·{" "}
                      {item.job?.location ?? "-"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      지원일{" "}
                      {new Date(item.application.applied_at).toLocaleString(
                        "ko-KR",
                      )}{" "}
                      · 정보 {item.completion.completedCount}/
                      {item.completion.totalCount}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                      priority {item.attention.score}
                    </span>
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-black text-white hover:bg-blue-700"
                      href={`/company/applications/${item.application.id}`}
                    >
                      처리하기
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-7 text-sm font-semibold text-slate-500">
              지금 바로 처리할 지원자는 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
