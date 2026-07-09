import Link from "next/link";
import { redirect } from "next/navigation";

import { updateJobStatusAction } from "@/app/admin/jobs/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AdminJobsSearchParams = {
  status?: string;
};

const reviewFilters = [
  { value: "", label: "전체" },
  { value: "draft", label: "승인 대기" },
  { value: "published", label: "공개 중" },
  { value: "rejected", label: "반려" },
  { value: "closed", label: "마감" },
];

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<AdminJobsSearchParams>;
}) {
  const params = await searchParams;
  const activeStatus = params.status?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/jobs");
  }

  const { data: jobs } = await (() => {
    let query = supabase
      .from("jobs")
      .select(
        "id, company_id, title, location, employment_type, category, status, review_note, reviewed_at, reviewed_by, created_at, published_at, closed_at",
      )
      .order("created_at", { ascending: false });

    if (activeStatus) {
      query = query.eq("status", activeStatus);
    }

    return query;
  })();

  const companyIds = Array.from(new Set(jobs?.map((job) => job.company_id) ?? []));
  const { data: companies } =
    companyIds.length > 0
      ? await supabase
          .from("companies")
          .select("id, name, verification_status")
          .in("id", companyIds)
      : { data: [] };

  const companyById = new Map(
    companies?.map((company) => [company.id, company]) ?? [],
  );
  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { data: applications } =
    jobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select("id, job_id")
          .in("job_id", jobIds)
      : { data: [] };
  const applicationCountByJobId = new Map<string, number>();
  applications?.forEach((application) => {
    applicationCountByJobId.set(
      application.job_id,
      (applicationCountByJobId.get(application.job_id) ?? 0) + 1,
    );
  });
  const statusCounts = new Map<string, number>();
  jobs?.forEach((job) => {
    statusCounts.set(job.status, (statusCounts.get(job.status) ?? 0) + 1);
  });

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Admin job review
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          기업 공고를 승인하거나 반려합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          기업이 만든 draft 공고를 검토한 뒤 published로 전환하면 공개
          구직자 목록에 노출됩니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {reviewFilters.slice(1).map((filter) => {
          const isActive = activeStatus === filter.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={isActive ? "/admin/jobs" : `/admin/jobs?status=${filter.value}`}
              key={filter.value}
            >
              <p className="text-sm font-black text-slate-500">{filter.label}</p>
              <p className="mt-1 text-2xl font-black">
                {(statusCounts.get(filter.value) ?? 0).toLocaleString("ko-KR")}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Job review queue</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                전체 공고 {jobs?.length ?? 0}개
              </p>
            </div>
            {activeStatus ? (
              <Link
                className="text-sm font-black text-blue-700 hover:text-blue-900"
                href="/admin/jobs"
              >
                전체 보기
              </Link>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => {
              const company = companyById.get(job.company_id);
              const status = getStatusMeta("job", job.status);
              const applicationCount = applicationCountByJobId.get(job.id) ?? 0;

              return (
                <article
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  key={job.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{job.title}</h3>
                      <span className={getStatusBadgeClassName("job", job.status)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {company?.name ?? "Company"} · {job.location || "-"} ·{" "}
                      {job.employment_type || "-"} · {job.category || "-"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-3">
                      <Info
                        label="Company"
                        value={`${company?.name ?? "Company"} · ${getStatusMeta("companyVerification", company?.verification_status).label}`}
                      />
                      <Info
                        label="Applicants"
                        value={`${applicationCount.toLocaleString("ko-KR")}명`}
                      />
                      <Info
                        label="Created"
                        value={new Date(job.created_at).toLocaleString("ko-KR")}
                      />
                    </div>
                    {job.review_note ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
                        운영자 메모: {job.review_note}
                      </p>
                    ) : null}
                  </div>
                  <form
                    action={updateJobStatusAction}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 lg:w-[320px]"
                  >
                    <input name="job_id" type="hidden" value={job.id} />
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                      Review note
                      <textarea
                        className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
                        defaultValue={job.review_note ?? ""}
                        maxLength={700}
                        name="review_note"
                        placeholder="반려/마감/승인 사유 또는 기업 안내 메모"
                      />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <StatusButton
                        currentStatus={job.status}
                        status="published"
                      >
                        공개
                      </StatusButton>
                      <StatusButton
                        currentStatus={job.status}
                        status="rejected"
                      >
                        반려
                      </StatusButton>
                      <StatusButton
                        currentStatus={job.status}
                        status="closed"
                      >
                        마감
                      </StatusButton>
                    </div>
                  </form>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              검토할 공고가 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function StatusButton({
  children,
  currentStatus,
  status,
}: {
  children: React.ReactNode;
  currentStatus: string;
  status: string;
}) {
  const isCurrent = currentStatus === status;

  return (
    <Button
      disabled={isCurrent}
      name="status"
      type="submit"
      value={status}
      variant={status === "published" ? "default" : "outline"}
    >
      {isCurrent ? "현재 상태" : children}
    </Button>
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
