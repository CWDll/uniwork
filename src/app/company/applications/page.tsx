import Link from "next/link";

import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type CompanyApplicationsSearchParams = {
  company?: string;
  job?: string;
  q?: string;
  status?: string;
};

const applicationStatusOptions = [
  { value: "", label: "전체 상태" },
  { value: "submitted", label: "지원 완료" },
  { value: "reviewing", label: "검토 중" },
  { value: "accepted", label: "합격" },
  { value: "rejected", label: "불합격" },
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

export default async function CompanyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<CompanyApplicationsSearchParams>;
}) {
  const params = await searchParams;
  const activeCompanyId = compactValue(params.company);
  const activeJobId = compactValue(params.job);
  const activeStatus = compactValue(params.status);
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
            .select("id, job_id, seeker_id, status, message, applied_at")
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
  const { data: seekerProfiles } =
    seekerIds.length > 0
      ? await supabase
          .from("seeker_profiles")
          .select(
            "user_id, nationality, visa_type, school, major, korean_level, english_level, preferred_locations, preferred_job_types",
          )
          .in("user_id", seekerIds)
      : { data: [] };

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);
  const profileById = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);
  const seekerProfileById = new Map(
    seekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
  );
  const visibleApplications = (applications ?? []).filter((application) => {
    if (!keyword) {
      return true;
    }

    const job = jobById.get(application.job_id);
    const company = job ? companyById.get(job.company_id) : null;
    const profile = profileById.get(application.seeker_id);
    const seekerProfile = seekerProfileById.get(application.seeker_id);
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
      application.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });
  const hasActiveFilters = Boolean(
    activeCompanyId || activeJobId || activeStatus || keyword,
  );

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
        className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_minmax(0,1fr)_auto]"
        action="/company/applications"
      >
        <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Company
          <select
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
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
        <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Job
          <select
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
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
        <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Status
          <select
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700"
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
        <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Search
          <input
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
            defaultValue={params.q ?? ""}
            name="q"
            placeholder="이름, 이메일, 비자, 학교"
          />
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
            visibleApplications.map((application) => {
              const job = jobById.get(application.job_id);
              const company = job ? companyById.get(job.company_id) : null;
              const profile = profileById.get(application.seeker_id);
              const seekerProfile = seekerProfileById.get(application.seeker_id);
              const status = getStatusMeta("application", application.status);

              return (
                <article
                  className="grid gap-4 px-4 py-4 sm:px-5"
                  key={application.id}
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-black">
                          {profile?.name || profile?.email || "Applicant"}
                        </h3>
                        <span
                          className={getStatusBadgeClassName(
                            "application",
                            application.status,
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                        {job?.title ?? "Job"} · {company?.name ?? "Company"} ·{" "}
                        {job?.location ?? "-"} · {job?.employment_type ?? "-"}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                        <Info label="Email" value={profile?.email ?? "-"} />
                        <Info label="Applied" value={new Date(application.applied_at).toLocaleString("ko-KR")} />
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
                      </div>
                      {application.message ? (
                        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
                          {application.message}
                        </p>
                      ) : null}
                    </div>
                    <ApplicationStatusForm
                      applicationId={application.id}
                      currentStatus={application.status}
                    />
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
