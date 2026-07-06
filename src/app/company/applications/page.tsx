import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: companies } = user
    ? await supabase.from("companies").select("id, name").eq("owner_id", user.id)
    : { data: [] };

  const companyIds = companies?.map((company) => company.id) ?? [];
  const { data: jobs } =
    companyIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title")
          .in("company_id", companyIds)
      : { data: [] };

  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { data: applications } =
    jobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select("id, job_id, seeker_id, status, message, applied_at")
          .in("job_id", jobIds)
          .order("applied_at", { ascending: false })
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
          .select("user_id, nationality, visa_type, school, korean_level")
          .in("user_id", seekerIds)
      : { data: [] };

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);
  const profileById = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);
  const seekerProfileById = new Map(
    seekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">
            Applicants {applications?.length ?? 0}
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {applications && applications.length > 0 ? (
            applications.map((application) => {
              const job = jobById.get(application.job_id);
              const company = job ? companyById.get(job.company_id) : null;
              const profile = profileById.get(application.seeker_id);
              const seekerProfile = seekerProfileById.get(application.seeker_id);

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
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                          {application.status}
                        </span>
                      </div>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                        {job?.title ?? "Job"} · {company?.name ?? "Company"}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-600">
                        {seekerProfile?.nationality || "-"} ·{" "}
                        {seekerProfile?.visa_type || "visa unknown"} ·{" "}
                        {seekerProfile?.school || "school unknown"} ·{" "}
                        {seekerProfile?.korean_level || "Korean unknown"}
                      </p>
                      {application.message ? (
                        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
                          {application.message}
                        </p>
                      ) : null}
                    </div>
                    <ApplicationStatusForm applicationId={application.id} />
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
