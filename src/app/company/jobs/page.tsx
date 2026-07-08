import Link from "next/link";
import { redirect } from "next/navigation";

import { CompanyJobForm } from "@/components/company/company-job-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function CompanyJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/company/jobs");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, verification_status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const companyIds = companies?.map((company) => company.id) ?? [];
  const companyNameById = new Map(
    companies?.map((company) => [company.id, company.name]) ?? [],
  );

  const { data: jobs } = companyIds.length > 0
    ? await supabase
        .from("jobs")
        .select(
          "id, company_id, title, location, employment_type, category, status, created_at",
        )
        .in("company_id", companyIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <DashboardShell area="company">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company job posts
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          채용공고를 작성하고 상태를 확인합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          MVP 단계에서는 기업이 공고 초안을 무료로 만들고, 운영자 승인 후
          공개되는 흐름으로 갑니다.
        </p>
      </div>

      {companyIds.length === 0 ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-black text-amber-900">
            기업 정보가 먼저 필요합니다
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
            기업명을 포함한 기본 정보를 저장한 뒤 공고를 작성할 수 있습니다.
          </p>
          <Link
            className={cn(buttonVariants({ className: "mt-4" }))}
            href="/company/settings"
          >
            기업 정보 저장하기
          </Link>
        </div>
      ) : null}

      <CompanyJobForm companies={companies ?? []} disabled={companyIds.length === 0} />

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">My job drafts</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            등록된 모든 회사/지점의 공고 목록
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => {
              const status = getStatusMeta("job", job.status);

              return (
                <article
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  key={job.id}
                >
                  <div className="min-w-0">
                    <h3 className="font-black">{job.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {companyNameById.get(job.company_id) ?? "Company"} ·{" "}
                      {job.location || "-"} · {job.employment_type || "-"} ·{" "}
                      {job.category || "-"}
                    </p>
                  </div>
                  <span className={getStatusBadgeClassName("job", job.status)}>
                    {status.label}
                  </span>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              아직 작성한 공고가 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
