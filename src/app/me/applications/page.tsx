import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function SeekerApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = user
    ? await supabase
        .from("job_applications")
        .select("id, job_id, status, message, applied_at")
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

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);

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

              return (
                <article
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  key={application.id}
                >
                  <div className="min-w-0">
                    <h3 className="font-black">{job?.title ?? "Job"}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {company?.name ?? "Company"} · {job?.location ?? "-"} ·{" "}
                      {job?.employment_type ?? "-"}
                    </p>
                    {application.message ? (
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-600">
                        {application.message}
                      </p>
                    ) : null}
                  </div>
                  <span className="h-max rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {application.status}
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
