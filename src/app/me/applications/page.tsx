import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getResumeForApplication } from "@/lib/applications/snapshot";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function SeekerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string }>;
}) {
  const { applied } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = user
    ? await supabase
        .from("job_applications")
        .select("id, job_id, resume_id, resume_snapshot, status, message, applied_at")
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">
            Applications {applications?.length ?? 0}
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {applications && applications.length > 0 ? (
            applications.map((application) => {
              const job = jobById.get(application.job_id);
              const company = job ? companyById.get(job.company_id) : null;
              const status = getStatusMeta("application", application.status);
              const isRecentlyApplied = applied === application.job_id;
              const resume = getResumeForApplication({
                liveResume: application.resume_id
                  ? (resumeById.get(application.resume_id) ?? null)
                  : null,
                snapshot: application.resume_snapshot,
              });

              return (
                <article
                  className={cn(
                    "grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]",
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
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      제출 이력서 {resume?.title || "연결된 이력서 없음"}
                      {application.resume_snapshot ? " · 제출 시점 저장됨" : ""}
                    </p>
                    {application.message ? (
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-600">
                        {application.message}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={getStatusBadgeClassName(
                      "application",
                      application.status,
                    )}
                  >
                    {status.label}
                  </span>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              아직 지원한 공고가 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
