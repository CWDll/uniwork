import {
  AlertTriangle,
  BriefcaseBusiness,
  ClipboardList,
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
    .select("id, name, verification_status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const companyIds = companies?.map((company) => company.id) ?? [];

  const { count: jobCount } = companyIds.length > 0
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .in("company_id", companyIds)
    : { count: 0 };

  const { data: jobs } =
    companyIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title, location")
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

  const { count: draftCount } = companyIds.length > 0
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .in("company_id", companyIds)
        .eq("status", "draft")
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

  const metrics = [
    { label: "Companies", value: companyIds.length, icon: BriefcaseBusiness },
    { label: "Job posts", value: jobCount ?? 0, icon: BriefcaseBusiness },
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
    { label: "Drafts", value: draftCount ?? 0, icon: ClipboardList },
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
      </div>

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
