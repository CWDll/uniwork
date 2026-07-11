import Link from "next/link";

import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getApplicationAttention,
  type ApplicationAttention,
} from "@/lib/applications/attention";
import {
  getApplicationCompletion,
  getResumeCompletion,
} from "@/lib/applications/completeness";
import {
  formatSnapshotTime,
  getApplicationSnapshotMeta,
  getProfileForApplication,
  getResumeForApplication,
} from "@/lib/applications/snapshot";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type CompanyApplicationsSearchParams = {
  completeness?: string;
  attention?: string;
  alert?: string;
  application_updated?: string;
  company?: string;
  data?: string;
  job?: string;
  q?: string;
  sort?: string;
  status?: string;
  status_updated?: string;
};

const applicationStatusOptions = [
  { value: "", label: "전체 상태" },
  { value: "submitted", label: "지원 완료" },
  { value: "reviewing", label: "검토 중" },
  { value: "accepted", label: "합격" },
  { value: "rejected", label: "불합격" },
];

const sortOptions = [
  { value: "newest", label: "최신 지원순" },
  { value: "oldest", label: "오래된 지원순" },
  { value: "needs_review", label: "미검토 우선" },
  { value: "action_needed", label: "조치 필요 우선" },
  { value: "incomplete", label: "정보 미완성 우선" },
];

const attentionFilterOptions = [
  { value: "", label: "전체 조치" },
  { value: "needed", label: "조치 필요" },
  { value: "overdue", label: "24시간 미검토" },
];

const dataFilterOptions = [
  { value: "", label: "전체 제출 기준" },
  { value: "snapshot", label: "제출본 고정" },
  { value: "fallback", label: "현재 정보 fallback" },
];

const completenessFilterOptions = [
  { value: "", label: "전체 완성도" },
  { value: "complete", label: "정보 완성" },
  { value: "incomplete", label: "정보 미완성" },
];

function compactValue(value?: string) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : "";
}

function buildApplicationsHref(
  params: CompanyApplicationsSearchParams,
  updates: Partial<CompanyApplicationsSearchParams>,
) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...updates };

  Object.entries(merged).forEach(([key, value]) => {
    if (key === "application_updated" || key === "status_updated") {
      return;
    }

    const nextValue = compactValue(value);

    if (nextValue) {
      nextParams.set(key, nextValue);
    }
  });

  const query = nextParams.toString();

  return query ? `/company/applications?${query}` : "/company/applications";
}

type SortableApplication = {
  application: {
    applied_at: string;
    company_note?: string | null;
    status: string;
    status_updated_at?: string | null;
  };
  attention: ApplicationAttention;
  completion: {
    isComplete: boolean;
  };
};

type ReviewWorkflow = {
  detail: string;
  label: string;
  tone: "amber" | "blue" | "green" | "red" | "slate";
};

function compareApplications(
  first: SortableApplication,
  second: SortableApplication,
  sort: string,
) {
  const firstDate = new Date(first.application.applied_at).getTime();
  const secondDate = new Date(second.application.applied_at).getTime();

  if (sort === "oldest") {
    return firstDate - secondDate;
  }

  if (sort === "needs_review") {
    const firstSubmitted = first.application.status === "submitted" ? 0 : 1;
    const secondSubmitted = second.application.status === "submitted" ? 0 : 1;

    if (firstSubmitted !== secondSubmitted) {
      return firstSubmitted - secondSubmitted;
    }
  }

  if (sort === "action_needed") {
    if (first.attention.score !== second.attention.score) {
      return second.attention.score - first.attention.score;
    }
  }

  if (sort === "incomplete") {
    const firstComplete = first.completion.isComplete ? 1 : 0;
    const secondComplete = second.completion.isComplete ? 1 : 0;

    if (firstComplete !== secondComplete) {
      return firstComplete - secondComplete;
    }
  }

  return secondDate - firstDate;
}

export default async function CompanyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<CompanyApplicationsSearchParams>;
}) {
  const params = await searchParams;
  const activeCompanyId = compactValue(params.company);
  const activeJobId = compactValue(params.job);
  const activeStatus = compactValue(params.status);
  const updatedStatus = compactValue(params.status_updated);
  const activeDataFilter = compactValue(params.data);
  const activeCompletenessFilter = compactValue(params.completeness);
  const activeAttentionFilter = compactValue(params.attention);
  const activeAlertFilter = compactValue(params.alert);
  const activeSort = compactValue(params.sort) || "newest";
  const keyword = compactValue(params.q).toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: companies } = user
    ? await supabase.from("companies").select("id, name").eq("owner_id", user.id)
    : { data: [] };

  const companyIds = companies?.map((company) => company.id) ?? [];
  const filteredCompanyIds =
    activeCompanyId && companyIds.includes(activeCompanyId)
      ? [activeCompanyId]
      : companyIds;
  const { data: jobs } =
    filteredCompanyIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title, location, employment_type")
          .in("company_id", filteredCompanyIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const allJobIds = jobs?.map((job) => job.id) ?? [];
  const jobIds = activeJobId && allJobIds.includes(activeJobId) ? [activeJobId] : allJobIds;
  const { data: applications } =
    jobIds.length > 0
      ? await (() => {
          let query = supabase
            .from("job_applications")
            .select(
              "id, job_id, seeker_id, resume_id, profile_snapshot, resume_snapshot, status, message, company_note, applied_at, status_updated_at",
            )
            .in("job_id", jobIds)
            .order("applied_at", { ascending: false });

          if (activeStatus) {
            query = query.eq("status", activeStatus);
          }

          return query;
        })()
      : { data: [] };

  const seekerIds = Array.from(
    new Set(applications?.map((application) => application.seeker_id) ?? []),
  );
  const { data: profiles } =
    seekerIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", seekerIds)
      : { data: [] };
  const { data: profilePhotos } =
    seekerIds.length > 0
      ? await supabase.from("profiles").select("id, avatar_path").in("id", seekerIds)
      : { data: [] };
  const { data: seekerProfiles } =
    seekerIds.length > 0
      ? await supabase
          .from("seeker_profiles")
          .select(
            "user_id, nationality, visa_type, school, major, korean_level, english_level, preferred_locations, preferred_job_types",
          )
          .in("user_id", seekerIds)
      : { data: [] };
  const resumeIds = Array.from(
    new Set(
      applications
        ?.map((application) => application.resume_id)
        .filter((resumeId): resumeId is string => Boolean(resumeId)) ?? [],
    ),
  );
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
  const profilePhotoById = new Map(
    profilePhotos?.map((profile) => [profile.id, profile.avatar_path]) ?? [],
  );
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
  const enrichedApplications = (applications ?? []).map((application) => {
    const job = jobById.get(application.job_id);
    const company = job ? companyById.get(job.company_id) : null;
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
    const resumeCompletion = getResumeCompletion(resume ?? null);
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
    const haystack = [
      job?.title,
      company?.name,
      profile?.name,
      profile?.email,
      seekerProfile?.nationality,
      seekerProfile?.visa_type,
      seekerProfile?.school,
      seekerProfile?.major,
      seekerProfile?.korean_level,
      seekerProfile?.english_level,
      seekerProfile?.preferred_locations?.join(" "),
      seekerProfile?.preferred_job_types?.join(" "),
      resume?.title,
      application.message,
      application.company_note,
      application.status,
      attention.summary,
      snapshotMeta.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      application,
      attention,
      company,
      completion,
      haystack,
      job,
      profile,
      resume,
      resumeCompletion,
      seekerProfile,
      snapshotMeta,
    };
  });
  const filteredApplications = enrichedApplications.filter((item) => {
    if (!keyword) {
      return matchesSecondaryFilters(item);
    }

    return item.haystack.includes(keyword) && matchesSecondaryFilters(item);
  });
  const visibleApplications = [...filteredApplications].sort((first, second) =>
    compareApplications(first, second, activeSort),
  );
  const unreviewedCount = enrichedApplications.filter(
    (item) => item.application.status === "submitted",
  ).length;
  const incompleteCount = enrichedApplications.filter(
    (item) => !item.completion.isComplete,
  ).length;
  const fallbackCount = enrichedApplications.filter(
    (item) => !item.snapshotMeta.hasCompleteSnapshot,
  ).length;
  const attentionNeededCount = enrichedApplications.filter(
    (item) => item.attention.score >= 40,
  ).length;
  const memoedCount = enrichedApplications.filter((item) =>
    item.application.company_note?.trim(),
  ).length;
  const overdueReviewCount = enrichedApplications.filter(
    (item) => item.attention.flags.isOverdueReview,
  ).length;
  const hasActiveFilters = Boolean(
    activeCompanyId ||
      activeJobId ||
      activeStatus ||
      activeDataFilter ||
      activeCompletenessFilter ||
      activeAttentionFilter ||
      activeAlertFilter ||
      keyword ||
      activeSort !== "newest",
  );

  function matchesSecondaryFilters(item: (typeof enrichedApplications)[number]) {
    if (
      activeDataFilter === "snapshot" &&
      !item.snapshotMeta.hasCompleteSnapshot
    ) {
      return false;
    }

    if (activeDataFilter === "fallback" && item.snapshotMeta.hasCompleteSnapshot) {
      return false;
    }

    if (activeCompletenessFilter === "complete" && !item.completion.isComplete) {
      return false;
    }

    if (activeCompletenessFilter === "incomplete" && item.completion.isComplete) {
      return false;
    }

    if (activeAttentionFilter === "needed" && item.attention.score < 40) {
      return false;
    }

    if (activeAttentionFilter === "overdue" && !item.attention.flags.isOverdueReview) {
      return false;
    }

    if (activeAlertFilter === "overdue" && !item.attention.flags.isOverdueReview) {
      return false;
    }

    return true;
  }

  return (
    <DashboardShell area="company">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Applicants
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          지원자 목록과 상태를 관리합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          한 구인자 계정에 연결된 모든 회사/지점의 지원자를 모아봅니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          href="/company/applications?status=submitted&sort=needs_review"
          label="먼저 볼 지원자"
          tone={unreviewedCount > 0 ? "blue" : "slate"}
          value={`${unreviewedCount}명`}
        />
        <SummaryCard
          href="/company/applications?alert=overdue&attention=overdue&sort=action_needed"
          label="24시간 미검토"
          tone={overdueReviewCount > 0 ? "red" : "slate"}
          value={`${overdueReviewCount}명`}
        />
        <SummaryCard
          href="/company/applications?attention=needed&sort=action_needed"
          label="오늘 처리 대상"
          tone={attentionNeededCount > 0 ? "amber" : "slate"}
          value={`${attentionNeededCount}명`}
        />
      </div>

      <form
        className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_150px_150px_150px_150px_minmax(0,1fr)_auto]"
        action="/company/applications"
      >
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Company
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeCompanyId}
            name="company"
          >
            <option value="">전체 회사/지점</option>
            {companies?.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Job
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeJobId}
            name="job"
          >
            <option value="">전체 공고</option>
            {jobs?.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Status
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeStatus}
            name="status"
          >
            {applicationStatusOptions.map((status) => (
              <option key={status.value || "all"} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Search
          <input
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
            defaultValue={params.q ?? ""}
            name="q"
            placeholder="이름, 이메일, 비자, 학교, 이력서"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Data
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeDataFilter}
            name="data"
          >
            {dataFilterOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Completeness
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeCompletenessFilter}
            name="completeness"
          >
            {completenessFilterOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Action
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeAttentionFilter}
            name="attention"
          >
            {attentionFilterOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Sort
          <select
            className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
            defaultValue={activeSort}
            name="sort"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1">
          <button className="h-11 flex-1 rounded-md bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700 xl:flex-none">
            필터 적용
          </button>
          {hasActiveFilters ? (
            <Link
              className="inline-flex h-11 items-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
              href="/company/applications"
            >
              초기화
            </Link>
          ) : null}
        </div>
      </form>

      {overdueReviewCount > 0 ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-red-900">
              24시간 이상 미검토 지원자가 {overdueReviewCount}명 있습니다.
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-red-800">
              담당자가 오늘 상태를 바꾸거나 안내 메모를 남겨야 하는 알림 대상입니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700"
            href={buildApplicationsHref(params, {
              alert: activeAlertFilter === "overdue" ? "" : "overdue",
              attention: activeAttentionFilter === "overdue" ? "" : "overdue",
              sort: "action_needed",
            })}
          >
            알림 대상 보기
          </Link>
        </div>
      ) : null}

      {params.application_updated ? (
        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-900">
            지원자 상태가 저장되었습니다.
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
            {updatedStatus
              ? `${getStatusMeta("application", updatedStatus).label} 상태로 반영했고, 구직자 지원 현황도 최신화했습니다.`
              : "변경 내용이 구직자 지원 현황에 반영되었습니다."}
          </p>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <QuickFilterCard
          active={activeAttentionFilter === "overdue" || activeAlertFilter === "overdue"}
          count={overdueReviewCount}
          href={buildApplicationsHref(params, {
            alert: activeAlertFilter === "overdue" ? "" : "overdue",
            attention: activeAttentionFilter === "overdue" ? "" : "overdue",
            sort: "action_needed",
          })}
          label="24시간 미검토"
          tone="red"
        />
        <QuickFilterCard
          active={activeAttentionFilter === "needed"}
          count={attentionNeededCount}
          href={buildApplicationsHref(params, {
            attention: activeAttentionFilter === "needed" ? "" : "needed",
            sort: "action_needed",
          })}
          label="조치 필요"
          tone="red"
        />
        <QuickFilterCard
          active={activeStatus === "submitted"}
          count={unreviewedCount}
          href={buildApplicationsHref(params, {
            sort: "needs_review",
            status: activeStatus === "submitted" ? "" : "submitted",
          })}
          label="미검토 지원"
          tone="blue"
        />
        <QuickFilterCard
          active={activeCompletenessFilter === "incomplete"}
          count={incompleteCount}
          href={buildApplicationsHref(params, {
            completeness:
              activeCompletenessFilter === "incomplete" ? "" : "incomplete",
            sort: "incomplete",
          })}
          label="정보 미완성"
          tone="amber"
        />
        <QuickFilterCard
          active={activeDataFilter === "fallback"}
          count={fallbackCount}
          href={buildApplicationsHref(params, {
            data: activeDataFilter === "fallback" ? "" : "fallback",
          })}
          label="현재 정보 fallback"
          tone="slate"
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {applicationStatusOptions.slice(1).map((option) => {
          const count = (applications ?? []).filter(
            (application) => application.status === option.value,
          ).length;
          const isActive = activeStatus === option.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={buildApplicationsHref(params, {
                status: isActive ? "" : option.value,
              })}
              key={option.value}
            >
              <p className="text-sm font-black text-slate-500">{option.label}</p>
              <p className="mt-1 text-2xl font-black">{count}</p>
            </Link>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">
            Applicants {visibleApplications.length}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {hasActiveFilters
              ? `현재 필터 조건에 맞는 지원자 · 메모 ${memoedCount}/${enrichedApplications.length}`
              : `전체 회사/지점의 최신 지원자 · 메모 ${memoedCount}/${enrichedApplications.length}`}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleApplications.length > 0 ? (
            visibleApplications.map((item) => {
              const {
                application,
                company,
                completion,
                attention,
                job,
                profile,
                resume,
                resumeCompletion,
                seekerProfile,
                snapshotMeta,
              } = item;
              const avatarUrl = getProfilePhotoUrl(
                supabase,
                profilePhotoById.get(application.seeker_id),
              );
              const status = getStatusMeta("application", application.status);
              const workflow = getReviewWorkflow({
                attention,
                application,
                completion,
                hasCompleteSnapshot: snapshotMeta.hasCompleteSnapshot,
              });
              const missingPreview = completion.missing.slice(0, 3);

              return (
                <article className="grid gap-4 px-4 py-4 sm:px-5" key={application.id}>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="grid min-w-0 gap-3 sm:grid-cols-[56px_minmax(0,1fr)]">
                      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-sm font-black text-blue-700">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt="Applicant profile photo"
                            className="size-full object-cover"
                            src={avatarUrl}
                          />
                        ) : (
                          (profile?.name || profile?.email || "A").slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="break-words font-black text-slate-950 hover:text-blue-700"
                            href={`/company/applications/${application.id}`}
                          >
                            {profile?.name || profile?.email || "Applicant"}
                          </Link>
                          <span
                            className={getStatusBadgeClassName(
                              "application",
                              application.status,
                            )}
                          >
                            {status.label}
                          </span>
                          <CompletionBadge
                            isComplete={completion.isComplete}
                            label={`정보 ${completion.completedCount}/${completion.totalCount}`}
                          />
                          <CompletionBadge
                            isComplete={snapshotMeta.hasCompleteSnapshot}
                            label={snapshotMeta.label}
                          />
                          <CompletionBadge
                            isComplete={Boolean(application.company_note?.trim())}
                            label={
                              application.company_note?.trim()
                                ? "메모 있음"
                                : "메모 없음"
                            }
                          />
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                          {job?.title ?? "Job"} · {company?.name ?? "Company"} ·{" "}
                          {job?.location ?? "-"} · {job?.employment_type ?? "-"}
                        </p>
                        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 2xl:grid-cols-4">
                          <Info label="Email" value={profile?.email ?? "-"} />
                          <Info
                            label="Applied"
                            value={new Date(application.applied_at).toLocaleString(
                              "ko-KR",
                            )}
                          />
                          <Info
                            label="Visa"
                            value={`${seekerProfile?.visa_type || "미입력"} · ${seekerProfile?.nationality || "국적 미입력"}`}
                          />
                          <Info
                            label="School"
                            value={`${seekerProfile?.school || "학교 미입력"} · ${seekerProfile?.major || "전공 미입력"}`}
                          />
                          <Info
                            className="hidden sm:block"
                            label="Korean"
                            value={seekerProfile?.korean_level || "미입력"}
                          />
                          <Info
                            className="hidden sm:block"
                            label="English"
                            value={seekerProfile?.english_level || "미입력"}
                          />
                          <Info
                            className="hidden sm:block"
                            label="Resume"
                            value={`${resume?.title || "이력서 없음"} · ${resumeCompletion.completedCount}/${resumeCompletion.totalCount}`}
                          />
                          <Info
                            className="hidden sm:block"
                            label="Submission"
                            value={formatSnapshotTime(snapshotMeta.capturedAt)}
                          />
                        </div>
                        {!completion.isComplete ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {missingPreview.map((missing) => (
                              <span
                                className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700"
                                key={missing}
                              >
                                {missing}
                              </span>
                            ))}
                            {completion.missing.length > missingPreview.length ? (
                              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                                +{completion.missing.length - missingPreview.length}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {attention.score >= 40 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold leading-6 text-red-900">
                            <span>조치 필요: {attention.summary}</span>
                            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black text-red-700">
                              priority {attention.score}
                            </span>
                          </div>
                        ) : null}
                        {!snapshotMeta.hasCompleteSnapshot ? (
                          <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                            이 지원은 제출본 저장 이전 데이터입니다. 화면에는 현재
                            접근 가능한 프로필/이력 정보가 표시됩니다.
                          </p>
                        ) : null}
                        {application.message ? (
                          <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
                            {application.message}
                          </p>
                        ) : null}
                        {application.company_note ? (
                          <p className="mt-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">
                            기업 메모: {application.company_note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-2 rounded-xl bg-slate-50 p-3 xl:w-[292px] xl:bg-transparent xl:p-0">
                      <ReviewWorkflowCard workflow={workflow} />
                      <Info
                        label="Last action"
                        value={formatLastAction(application)}
                      />
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-black text-white hover:bg-blue-700"
                        href={`/company/applications/${application.id}`}
                      >
                        상세 보기
                      </Link>
                      <ApplicationStatusForm
                        applicationId={application.id}
                        currentStatus={application.status}
                      />
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              아직 지원자가 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function Info({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-slate-50 px-3 py-2", className)}>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}

function formatLastAction(application: {
  applied_at: string;
  status_updated_at?: string | null;
}) {
  if (application.status_updated_at) {
    return `상태 변경 ${new Date(application.status_updated_at).toLocaleString("ko-KR")}`;
  }

  return `접수 ${new Date(application.applied_at).toLocaleString("ko-KR")}`;
}

function getReviewWorkflow({
  attention,
  application,
  completion,
  hasCompleteSnapshot,
}: {
  attention: ApplicationAttention;
  application: {
    company_note?: string | null;
    status: string;
  };
  completion: {
    isComplete: boolean;
  };
  hasCompleteSnapshot: boolean;
}): ReviewWorkflow {
  const hasCompanyNote = Boolean(application.company_note?.trim());

  if (attention.flags.isOverdueReview) {
    return {
      detail: "검토 중으로 바꾸고 구직자에게 진행 상황을 안내하세요.",
      label: "오늘 검토 시작",
      tone: "red",
    };
  }

  if (application.status === "submitted") {
    return {
      detail: "프로필과 이력서를 확인한 뒤 상태를 검토 중으로 바꾸세요.",
      label: "신규 지원 검토",
      tone: "blue",
    };
  }

  if (application.status === "reviewing" && !hasCompanyNote) {
    return {
      detail: "대기 사유나 다음 안내를 메모로 남기면 구직자가 놓치지 않습니다.",
      label: "안내 메모 필요",
      tone: "amber",
    };
  }

  if (application.status === "reviewing") {
    return {
      detail: "검토가 끝났다면 합격 또는 불합격으로 상태를 정리하세요.",
      label: "결정 대기",
      tone: "blue",
    };
  }

  if (
    (application.status === "accepted" || application.status === "rejected") &&
    !hasCompanyNote
  ) {
    return {
      detail: "최종 상태에 대한 안내 메모를 남기면 지원자 경험이 좋아집니다.",
      label: "최종 안내 보완",
      tone: "amber",
    };
  }

  if (!completion.isComplete || !hasCompleteSnapshot) {
    return {
      detail: "지원 정보가 부족하거나 현재 정보 fallback입니다. 상세에서 확인하세요.",
      label: "데이터 확인",
      tone: "amber",
    };
  }

  return {
    detail: "현재 상태와 안내 메모가 정리되어 있습니다.",
    label: "정리 완료",
    tone: "green",
  };
}

function ReviewWorkflowCard({ workflow }: { workflow: ReviewWorkflow }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        workflow.tone === "red" && "border-red-100 bg-red-50 text-red-950",
        workflow.tone === "amber" && "border-amber-100 bg-amber-50 text-amber-950",
        workflow.tone === "blue" && "border-blue-100 bg-blue-50 text-blue-950",
        workflow.tone === "green" &&
          "border-emerald-100 bg-emerald-50 text-emerald-950",
        workflow.tone === "slate" && "border-slate-200 bg-white text-slate-800",
      )}
    >
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        Next action
      </p>
      <p className="mt-1 text-sm font-black">{workflow.label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
        {workflow.detail}
      </p>
    </div>
  );
}

function SummaryCard({
  href,
  label,
  tone,
  value,
}: {
  href: string;
  label: string;
  tone: "amber" | "blue" | "red" | "slate";
  value: string;
}) {
  return (
    <Link
      className={cn(
        "rounded-2xl border p-4 transition",
        tone === "red" && "border-red-100 bg-red-50 hover:bg-red-100/60",
        tone === "amber" && "border-amber-100 bg-amber-50 hover:bg-amber-100/60",
        tone === "blue" && "border-blue-100 bg-blue-50 hover:bg-blue-100/60",
        tone === "slate" && "border-slate-200 bg-white hover:bg-slate-50",
      )}
      href={href}
    >
      <p className="text-sm font-black text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black text-slate-950">{value}</p>
        <span className="rounded-md bg-white/75 px-2 py-1 text-xs font-black text-slate-600">
          보기
        </span>
      </div>
    </Link>
  );
}

function QuickFilterCard({
  active,
  count,
  href,
  label,
  tone,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
  tone: "amber" | "blue" | "red" | "slate";
}) {
  const activeClassName =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-950"
        : "border-slate-300 bg-slate-100 text-slate-950";

  return (
    <Link
      className={cn(
        "rounded-2xl border p-4 transition",
        active ? activeClassName : "border-slate-200 bg-white hover:bg-slate-50",
      )}
      href={href}
    >
      <p className="text-sm font-black text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black">{count}</p>
        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-black text-slate-600">
          {active ? "필터 해제" : "바로 보기"}
        </span>
      </div>
    </Link>
  );
}

function CompletionBadge({
  isComplete,
  label,
}: {
  isComplete: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-xs font-black",
        isComplete
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      )}
    >
      {label}
    </span>
  );
}
