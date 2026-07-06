import { redirect } from "next/navigation";

import { updateJobStatusAction } from "@/app/admin/jobs/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/jobs");
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, location, employment_type, category, status, created_at",
    )
    .order("created_at", { ascending: false });

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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">Job review queue</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            전체 공고 {jobs?.length ?? 0}개
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => {
              const company = companyById.get(job.company_id);

              return (
                <article
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  key={job.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{job.title}</h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {company?.name ?? "Company"} · {job.location || "-"} ·{" "}
                      {job.employment_type || "-"} · {job.category || "-"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Company verification:{" "}
                      {company?.verification_status ?? "unknown"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <StatusButton jobId={job.id} status="published">
                      Publish
                    </StatusButton>
                    <StatusButton jobId={job.id} status="rejected">
                      Reject
                    </StatusButton>
                    <StatusButton jobId={job.id} status="closed">
                      Close
                    </StatusButton>
                  </div>
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
  jobId,
  status,
}: {
  children: React.ReactNode;
  jobId: string;
  status: string;
}) {
  return (
    <form action={updateJobStatusAction}>
      <input name="job_id" type="hidden" value={jobId} />
      <input name="status" type="hidden" value={status} />
      <Button type="submit" variant={status === "published" ? "default" : "outline"}>
        {children}
      </Button>
    </form>
  );
}
