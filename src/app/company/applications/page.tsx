import Link from "next/link";

import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
  company?: string;
  data?: string;
  job?: string;
  q?: string;
  sort?: string;
  status?: string;
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
  { value: "incomplete", label: "정보 미완성 우선" },
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
    status: string;
  };
  completion: {
    isComplete: boolean;
  };
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
  const activeDataFilter = compactValue(params.data);
  const activeCompletenessFilter = compactValue(params.completeness);
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
      snapshotMeta.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return {
      application,
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
  const hasActiveFilters = Boolean(
    activeCompanyId ||
      activeJobId ||
      activeStatus ||
      activeDataFilter ||
      activeCompletenessFilter ||
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

      <form
        className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_170px_170px_170px_minmax(0,1fr)_auto]"
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
        <div className="flex items-end gap-2">
          <button className="h-11 rounded-md bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
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

      <div className="mb-5 grid gap-3 md:grid-cols-3">
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

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
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
              ? "현재 필터 조건에 맞는 지원자"
              : "전체 회사/지점의 최신 지원자"}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleApplications.length > 0 ? (
            visibleApplications.map((item) => {
              const {
                application,
                company,
                completion,
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
                            label="Korean"
                            value={seekerProfile?.korean_level || "미입력"}
                          />
                          <Info
                            label="English"
                            value={seekerProfile?.english_level || "미입력"}
                          />
                          <Info
                            label="Resume"
                            value={`${resume?.title || "이력서 없음"} · ${resumeCompletion.completedCount}/${resumeCompletion.totalCount}`}
                          />
                          <Info
                            label="Submission"
                            value={formatSnapshotTime(snapshotMeta.capturedAt)}
                          />
                        </div>
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
                    <div className="grid gap-2 xl:w-[292px]">
                      <ApplicationStatusForm
                        applicationId={application.id}
                        currentStatus={application.status}
                      />
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                        href={`/company/applications/${application.id}`}
                      >
                        상세 보기
                      </Link>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-700">{value}</p>
    </div>
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
  tone: "amber" | "blue" | "slate";
}) {
  const activeClassName =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
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
