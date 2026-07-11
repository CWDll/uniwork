import Link from "next/link";
import { redirect } from "next/navigation";

import { CompanyJobForm } from "@/components/company/company-job-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type CompanyJobsSearchParams = {
  status?: string;
};

const jobStatusFilters = [
  { value: "", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "published", label: "공개 중" },
  { value: "rejected", label: "반려" },
  { value: "closed", label: "마감" },
];

function getJobNextStep(status: string) {
  switch (status) {
    case "draft":
      return "아직 공개되지 않은 공고입니다.";
    case "published":
      return "지원자 현황을 확인하세요.";
    case "rejected":
      return "운영자 피드백 확인 후 다시 등록이 필요합니다.";
    case "closed":
      return "마감된 공고입니다.";
    default:
      return "상태 확인이 필요합니다.";
  }
}

function buildCompanyJobsHref(status?: string) {
  return status ? `/company/jobs?status=${status}` : "/company/jobs";
}

export default async function CompanyJobsPage({
  searchParams,
}: {
  searchParams: Promise<CompanyJobsSearchParams>;
}) {
  const params = await searchParams;
  const activeStatus = params.status?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/company/jobs");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, verification_status, verification_note")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const companyIds = companies?.map((company) => company.id) ?? [];
  const verifiedCompanies =
    companies?.filter((company) => company.verification_status === "verified") ?? [];
  const companyNameById = new Map(
    companies?.map((company) => [company.id, company.name]) ?? [],
  );

  const { data: allJobs } =
    companyIds.length > 0
      ? await supabase
          .from("jobs")
          .select(
            "id, company_id, title, location, employment_type, category, status, review_note, reviewed_at, created_at, published_at, closed_at",
          )
          .in("company_id", companyIds)
          .order("created_at", { ascending: false })
      : { data: [] };
  const jobs = activeStatus
    ? allJobs?.filter((job) => job.status === activeStatus)
    : allJobs;
  const allJobIds = allJobs?.map((job) => job.id) ?? [];
  const { data: applications } =
    allJobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select("id, job_id, status")
          .in("job_id", allJobIds)
      : { data: [] };
  const applicationCountByJobId = new Map<string, number>();
  applications?.forEach((application) => {
    applicationCountByJobId.set(
      application.job_id,
      (applicationCountByJobId.get(application.job_id) ?? 0) + 1,
    );
  });
  const statusCounts = new Map<string, number>();
  allJobs?.forEach((job) => {
    statusCounts.set(job.status, (statusCounts.get(job.status) ?? 0) + 1);
  });

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
          운영자 인증이 완료된 회사/지점은 공고를 저장하면 바로 구직자에게
          공개됩니다.
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

      {companyIds.length > 0 && verifiedCompanies.length === 0 ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-black text-amber-900">
            회사/지점 인증이 필요합니다
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
            운영자가 회사 정보를 인증하면 공고를 바로 공개할 수 있습니다.
          </p>
          <Link
            className={cn(buttonVariants({ className: "mt-4", variant: "outline" }))}
            href="/company/settings"
          >
            인증 상태 확인하기
          </Link>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {companies?.map((company) => {
              const status = getStatusMeta(
                "companyVerification",
                company.verification_status,
              );

              return (
                <div
                  className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-amber-900"
                  key={company.id}
                >
                  <span className="font-black">{company.name}</span> · {status.label}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <CompanyJobForm
        companies={verifiedCompanies}
        disabled={verifiedCompanies.length === 0}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {jobStatusFilters.slice(1).map((filter) => {
          const isActive = activeStatus === filter.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={buildCompanyJobsHref(isActive ? "" : filter.value)}
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

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">My job posts</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {activeStatus
                  ? `${getStatusMeta("job", activeStatus).label} 공고`
                  : "등록된 모든 회사/지점의 공고 목록"}
              </p>
            </div>
            {activeStatus ? (
              <Link
                className="text-sm font-black text-blue-700 hover:text-blue-900"
                href="/company/jobs"
              >
                전체 보기
              </Link>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => {
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
                      {companyNameById.get(job.company_id) ?? "Company"} ·{" "}
                      {job.location || "-"} · {job.employment_type || "-"} ·{" "}
                      {job.category || "-"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-3">
                      <Info
                        label="Applicants"
                        value={`${applicationCount.toLocaleString("ko-KR")}명`}
                      />
                      <Info
                        label="Created"
                        value={new Date(job.created_at).toLocaleDateString("ko-KR")}
                      />
                      <Info label="Next step" value={getJobNextStep(job.status)} />
                    </div>
                    {job.review_note ? (
                      <p
                        className={cn(
                          "mt-3 whitespace-pre-wrap rounded-xl p-3 text-sm font-semibold leading-6",
                          job.status === "rejected"
                            ? "bg-red-50 text-red-900"
                            : "bg-slate-50 text-slate-700",
                        )}
                      >
                        운영자 메모: {job.review_note}
                      </p>
                    ) : null}
                    {job.reviewed_at ? (
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        검토일{" "}
                        {new Date(job.reviewed_at).toLocaleString("ko-KR")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    <Link
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                      )}
                      href={`/company/applications?job=${job.id}`}
                    >
                      지원자 보기
                    </Link>
                    {job.status === "published" ? (
                      <Link
                        className={cn(buttonVariants({ size: "sm" }))}
                        href={`/jobs/${job.id}`}
                      >
                        공개 페이지
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8">
              <p className="text-sm font-black text-slate-700">
                {activeStatus
                  ? "현재 상태에 맞는 공고가 없습니다."
                  : "아직 작성한 공고가 없습니다."}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {activeStatus
                  ? "다른 상태를 선택하거나 전체 공고 목록을 확인해보세요."
                  : verifiedCompanies.length > 0
                    ? "위 양식에서 첫 공고를 저장하면 인증된 회사/지점 기준으로 바로 공개됩니다."
                    : "회사/지점 인증이 완료되면 공고를 등록할 수 있습니다."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeStatus ? (
                  <Link
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                    href="/company/jobs"
                  >
                    전체 보기
                  </Link>
                ) : null}
                {verifiedCompanies.length === 0 ? (
                  <Link
                    className={cn(buttonVariants({ size: "sm" }))}
                    href="/company/settings"
                  >
                    인증 상태 확인
                  </Link>
                ) : null}
              </div>
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
