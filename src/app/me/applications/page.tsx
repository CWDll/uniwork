import Link from "next/link";
import { redirect } from "next/navigation";

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

type StatusEvent = {
  application_id: string;
  created_at: string;
  from_status: string | null;
  id: string;
  note: string | null;
  to_status: string;
};

type SeekerStatusGuidance = {
  detail: string;
  nextStep: string;
  title: string;
  tone: "blue" | "green" | "red" | "slate";
};

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

  if (!user) {
    redirect("/login?next=/me/applications");
  }

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
  const applicationIds = applications?.map((application) => application.id) ?? [];
  const { data: statusEvents } =
    applicationIds.length > 0
      ? await supabase
          .from("application_status_events")
          .select("id, application_id, from_status, to_status, note, created_at")
          .in("application_id", applicationIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);
  const resumeById = new Map(resumes?.map((resume) => [resume.id, resume]) ?? []);
  const statusEventRows = (statusEvents ?? []) as StatusEvent[];
  const eventsByApplicationId = new Map<string, StatusEvent[]>();
  statusEventRows.forEach((event) => {
    const events = eventsByApplicationId.get(event.application_id) ?? [];
    events.push(event);
    eventsByApplicationId.set(event.application_id, events);
  });
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
      statusEvents: eventsByApplicationId.get(application.id) ?? [],
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
            제출 시점의 프로필/이력서가 고정 저장되었습니다. 기업이 상태를
            변경하거나 안내 메모를 남기면 이 화면에서 바로 확인할 수 있습니다.
          </p>
          <div className="mt-3 grid gap-2 text-xs font-bold leading-5 text-emerald-900 sm:grid-cols-3">
            <span className="rounded-lg bg-white/70 px-3 py-2">
              1. 지원 상태 확인
            </span>
            <span className="rounded-lg bg-white/70 px-3 py-2">
              2. 기업 안내 메모 확인
            </span>
            <span className="rounded-lg bg-white/70 px-3 py-2">
              3. 프로필/이력서 최신화 유지
            </span>
          </div>
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
              const { application, company, job, resume, snapshotMeta, statusEvents } =
                item;
              const status = getStatusMeta("application", application.status);
              const guidance = getApplicationStatusGuidance(application.status);
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
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        기업 메모
                      </p>
                      {application.company_note ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-blue-900">
                          {application.company_note}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                          아직 기업이 남긴 안내 메모가 없습니다. 면접 안내,
                          추가 서류 요청, 결과 안내가 있으면 이 영역에 표시됩니다.
                        </p>
                      )}
                    </div>
                    {statusEvents.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Status history
                        </p>
                        <div className="mt-2 grid gap-2">
                          {statusEvents.slice(0, 3).map((event) => (
                            <StatusEventItem event={event} key={event.id} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid h-max gap-2 rounded-xl bg-slate-50 p-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        현재 상태
                      </p>
                      <span
                        className={cn(
                          getStatusBadgeClassName(
                            "application",
                            application.status,
                          ),
                          "mt-2 inline-flex min-h-10 w-full items-center justify-center text-sm",
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border p-3",
                        guidance.tone === "blue" &&
                          "border-blue-100 bg-blue-50 text-blue-950",
                        guidance.tone === "green" &&
                          "border-emerald-100 bg-emerald-50 text-emerald-950",
                        guidance.tone === "red" &&
                          "border-red-100 bg-red-50 text-red-950",
                        guidance.tone === "slate" &&
                          "border-slate-200 bg-white text-slate-800",
                      )}
                    >
                      <p className="text-sm font-black">{guidance.title}</p>
                      <p className="mt-1 text-sm font-semibold leading-6">
                        {guidance.detail}
                      </p>
                    </div>
                    <p className="text-xs font-bold leading-5 text-slate-500">
                      다음 할 일: {guidance.nextStep}
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
            <div className="px-5 py-8">
              <p className="text-sm font-black text-slate-700">
                {hasActiveFilters
                  ? "현재 필터에 맞는 지원 내역이 없습니다."
                  : "아직 지원한 공고가 없습니다."}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {hasActiveFilters
                  ? "다른 상태를 선택하거나 필터를 초기화해 전체 지원 내역을 확인해보세요."
                  : "관심 있는 공고를 찾고, 프로필과 이력서를 완성한 뒤 지원해보세요."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {hasActiveFilters ? (
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                    href="/me/applications"
                  >
                    필터 초기화
                  </Link>
                ) : null}
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                  href="/jobs"
                >
                  공고 찾기
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                  href="/me/resume"
                >
                  이력서 보완
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function StatusEventItem({
  event,
}: {
  event: StatusEvent;
}) {
  const fromStatus = event.from_status
    ? getStatusMeta("application", event.from_status).label
    : "이전 상태 없음";
  const toStatus = getStatusMeta("application", event.to_status).label;

  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-sm font-black text-slate-700">
        {fromStatus} → {toStatus}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">
        {new Date(event.created_at).toLocaleString("ko-KR")}
      </p>
      {event.note ? (
        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
          {event.note}
        </p>
      ) : null}
    </div>
  );
}

function getApplicationStatusGuidance(status?: string | null): SeekerStatusGuidance {
  if (status === "reviewing") {
    return {
      detail: "기업 담당자가 프로필과 이력서를 확인하는 단계입니다.",
      nextStep: "기업 안내 메모가 추가되는지 확인하고, 프로필/이력서를 최신 상태로 유지하세요.",
      title: "검토가 진행 중입니다",
      tone: "blue",
    };
  }

  if (status === "accepted") {
    return {
      detail: "기업이 이 지원을 합격으로 표시했습니다.",
      nextStep: "기업 안내 메모를 확인하고, 연락처와 이메일을 바로 받을 수 있는 상태로 두세요.",
      title: "합격 처리되었습니다",
      tone: "green",
    };
  }

  if (status === "rejected") {
    return {
      detail: "이번 공고는 불합격으로 처리되었습니다.",
      nextStep: "다른 공고를 확인하고, 부족한 프로필/이력서 항목이 있다면 보완하세요.",
      title: "불합격 처리되었습니다",
      tone: "red",
    };
  }

  return {
    detail: "지원서가 기업에 접수되었고 아직 검토 전입니다.",
    nextStep: "기업이 검토를 시작하면 상태가 바뀝니다. 지원 정보는 계속 최신으로 유지하세요.",
    title: "지원이 접수되었습니다",
    tone: "slate",
  };
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
