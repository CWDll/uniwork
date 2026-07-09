import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  formatSnapshotTime,
  getApplicationSnapshotMeta,
  getResumeForApplication,
} from "@/lib/applications/snapshot";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const applicationStatusOptions = [
  { value: "", label: "전체" },
  { value: "submitted", label: "지원 완료" },
  { value: "reviewing", label: "검토 중" },
  { value: "accepted", label: "합격" },
  { value: "rejected", label: "불합격" },
];

export default async function SeekerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; status?: string }>;
}) {
  const { applied, status: activeStatus = "" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = user
    ? await supabase
        .from("job_applications")
        .select(
          "id, job_id, resume_id, resume_snapshot, status, message, company_note, applied_at, status_updated_at",
        )
        .eq("seeker_id", user.id)
        .order("applied_at", { ascending: false })
    : { data: [] };

  const jobIds = applications?.map((application) => application.job_id) ?? [];
  const { data: jobs } =
    jobIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title, location, employment_type")
          .in("id", jobIds)
      : { data: [] };

  const companyIds = Array.from(new Set(jobs?.map((job) => job.company_id) ?? []));
  const { data: companies } =
    companyIds.length > 0
      ? await supabase.from("companies").select("id, name").in("id", companyIds)
      : { data: [] };
  const resumeIds = Array.from(
    new Set(
      applications
        ?.map((application) => application.resume_id)
        .filter((resumeId): resumeId is string => Boolean(resumeId)) ?? [],
    ),
  );
  const { data: resumes } =
    resumeIds.length > 0
      ? await supabase.from("resumes").select("id, title").in("id", resumeIds)
      : { data: [] };

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);
  const resumeById = new Map(resumes?.map((resume) => [resume.id, resume]) ?? []);
  const enrichedApplications = (applications ?? []).map((application) => {
    const job = jobById.get(application.job_id);
    const company = job ? companyById.get(job.company_id) : null;
    const resume = getResumeForApplication({
      liveResume: application.resume_id
        ? (resumeById.get(application.resume_id) ?? null)
        : null,
      snapshot: application.resume_snapshot,
    });
    const snapshotMeta = getApplicationSnapshotMeta({
      appliedAt: application.applied_at,
      profileSnapshot: null,
      resumeSnapshot: application.resume_snapshot,
    });

    return {
      application,
      company,
      job,
      resume,
      snapshotMeta,
    };
  });
  const visibleApplications = activeStatus
    ? enrichedApplications.filter((item) => item.application.status === activeStatus)
    : enrichedApplications;
  const hasActiveFilters = Boolean(activeStatus);

  return (
    <DashboardShell area="me">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          My applications
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          내가 지원한 공고를 확인합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          기업이 지원 상태를 변경하면 이 목록에서 진행 상황을 확인할 수
          있습니다.
        </p>
      </div>

      {applied ? (
        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-900">
            지원이 완료되었습니다.
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
            기업이 상태를 변경하면 이 화면에서 바로 확인할 수 있습니다.
          </p>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {applicationStatusOptions.slice(1).map((option) => {
          const count = enrichedApplications.filter(
            (item) => item.application.status === option.value,
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
              href={isActive ? "/me/applications" : `/me/applications?status=${option.value}`}
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
            Applications {visibleApplications.length}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {hasActiveFilters
              ? "현재 상태 필터에 맞는 지원 내역"
              : "최근 지원한 공고와 진행 상태"}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleApplications.length > 0 ? (
            visibleApplications.map((item) => {
              const { application, company, job, resume, snapshotMeta } = item;
              const status = getStatusMeta("application", application.status);
              const isRecentlyApplied = applied === application.job_id;

              return (
                <article
                  className={cn(
                    "grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_220px]",
                    isRecentlyApplied && "bg-emerald-50/70",
                  )}
                  key={application.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {job ? (
                        <Link
                          className="font-black text-slate-950 hover:text-blue-700"
                          href={`/jobs/${job.id}`}
                        >
                          {job.title}
                        </Link>
                      ) : (
                        <h3 className="font-black">Job</h3>
                      )}
                      {isRecentlyApplied ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                          방금 지원
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {company?.name ?? "Company"} · {job?.location ?? "-"} ·{" "}
                      {job?.employment_type ?? "-"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      지원일{" "}
                      {new Date(application.applied_at).toLocaleString("ko-KR")}
                    </p>
                    {application.status_updated_at ? (
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        상태 변경{" "}
                        {new Date(application.status_updated_at).toLocaleString("ko-KR")}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                      <Info
                        label="Resume"
                        value={resume?.title || "연결된 이력서 없음"}
                      />
                      <Info
                        label="Submission"
                        value={`${snapshotMeta.label} · ${formatSnapshotTime(snapshotMeta.capturedAt)}`}
                      />
                    </div>
                    {application.message ? (
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-600">
                        {application.message}
                      </p>
                    ) : null}
                    {application.company_note ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">
                        기업 안내: {application.company_note}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid h-max gap-2 rounded-xl bg-slate-50 p-3">
                    <span
                      className={getStatusBadgeClassName(
                        "application",
                        application.status,
                      )}
                    >
                      {status.label}
                    </span>
                    <p className="text-sm font-semibold leading-6 text-slate-600">
                      {getApplicationStatusGuidance(application.status)}
                    </p>
                    {job ? (
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                        href={`/jobs/${job.id}`}
                      >
                        공고 보기
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              {hasActiveFilters
                ? "현재 필터에 맞는 지원 내역이 없습니다."
                : "아직 지원한 공고가 없습니다."}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function getApplicationStatusGuidance(status?: string | null) {
  if (status === "reviewing") {
    return "기업이 지원서를 검토하고 있습니다.";
  }

  if (status === "accepted") {
    return "기업이 합격으로 표시했습니다. 기업 안내 메모를 확인해주세요.";
  }

  if (status === "rejected") {
    return "이번 공고는 불합격 처리되었습니다.";
  }

  return "지원서가 기업에 제출되었습니다.";
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
