import Link from "next/link";
import { redirect } from "next/navigation";

import { updateJobStatusAction } from "@/app/admin/jobs/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AdminJobsSearchParams = {
  company?: string;
  status?: string;
};

const reviewFilters = [
  { value: "", label: "전체" },
  { value: "published", label: "공개 중" },
  { value: "closed", label: "마감" },
];

function buildJobsHref(params: AdminJobsSearchParams, updates: AdminJobsSearchParams) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...updates };

  Object.entries(merged).forEach(([key, value]) => {
    const trimmed = value?.trim();

    if (trimmed) {
      nextParams.set(key, trimmed);
    }
  });

  const query = nextParams.toString();

  return query ? `/admin/jobs?${query}` : "/admin/jobs";
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<AdminJobsSearchParams>;
}) {
  const params = await searchParams;
  const activeCompanyId = params.company?.trim() ?? "";
  const activeStatus = params.status?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/jobs");
  }

  const { data: allJobs } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, description, location, employment_type, category, wage_type, wage_amount, visa_support_type, korean_requirement, status, review_note, reviewed_at, reviewed_by, created_at, published_at, closed_at",
    )
    .order("created_at", { ascending: false });
  const companyIds = Array.from(new Set(allJobs?.map((job) => job.company_id) ?? []));
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
  const jobs = (allJobs ?? []).filter((job) => {
    if (activeStatus && job.status !== activeStatus) {
      return false;
    }

    if (activeCompanyId && job.company_id !== activeCompanyId) {
      return false;
    }

    return true;
  });
  const jobIds = allJobs?.map((job) => job.id) ?? [];
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
  allJobs?.forEach((job) => {
    statusCounts.set(job.status, (statusCounts.get(job.status) ?? 0) + 1);
  });

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Admin job operations
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          공개 공고를 관리하고 필요 시 조치합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          인증된 회사/지점의 공고는 등록 즉시 공개됩니다. 운영자는 회사/지점별
          공개 현황을 확인하고 필요하면 공고를 마감 처리합니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
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
              href={buildJobsHref(params, {
                status: isActive ? "" : filter.value,
              })}
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

      <form
        action="/admin/jobs"
        className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        <label className="grid gap-2 text-xs font-black tracking-wide text-slate-400">
          회사/지점
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
        {activeStatus ? <input name="status" type="hidden" value={activeStatus} /> : null}
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "self-end")}
          href="/admin/jobs"
        >
          초기화
        </Link>
        <Button className="self-end" type="submit">
          필터 적용
        </Button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Job operations</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {activeStatus
                  ? `${getStatusMeta("job", activeStatus).label} 공고 ${jobs?.length ?? 0}개`
                  : `전체 공고 ${allJobs?.length ?? 0}개`}
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
          {jobs.length > 0 ? (
            jobs.map((job) => {
              const company = companyById.get(job.company_id);
              const status = getStatusMeta("job", job.status);
              const applicationCount = applicationCountByJobId.get(job.id) ?? 0;
              const readiness = getJobReadiness(job);
              const guidance = getJobReviewGuidance({
                missingCount: readiness.missing.length,
                status: job.status,
              });

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
                      <Link
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700 hover:bg-blue-100"
                        href={`/jobs/${job.id}`}
                      >
                        공고 보기
                      </Link>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {company?.name ?? "Company"} · {job.location || "-"} ·{" "}
                      {job.employment_type || "-"} · {job.category || "-"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-3">
                      <Info
                        label="회사/지점"
                        value={`${company?.name ?? "Company"} · ${getStatusMeta("companyVerification", company?.verification_status).label}`}
                      />
                      <Info
                        label="지원자"
                        value={`${applicationCount.toLocaleString("ko-KR")}명`}
                      />
                      <Info
                        label="등록일"
                        value={new Date(job.created_at).toLocaleString("ko-KR")}
                      />
                      <Info
                        label="공고 정보 완성도"
                        value={`${readiness.completed}/${readiness.total} 항목`}
                      />
                      <Info label="운영 확인" value={guidance.title} />
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        공고 정보 확인
                      </p>
                      {readiness.missing.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {readiness.missing.map((item) => (
                            <span
                              className="rounded-md bg-white px-2 py-1 text-xs font-black text-amber-700"
                              key={item}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          구직자가 판단할 핵심 정보가 입력되어 있습니다.
                        </p>
                      )}
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                        {guidance.detail}
                      </p>
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
                      운영자 메모
                      <textarea
                        className="min-h-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
                        defaultValue={job.review_note ?? ""}
                        maxLength={700}
                        name="review_note"
                        placeholder="마감 사유 또는 기업 안내 메모"
                      />
                      <span className="text-[11px] font-bold normal-case tracking-normal text-slate-500">
                        공고를 마감하거나 운영자가 확인한 내용을 기업 담당자가
                        이해할 수 있게 남겨주세요.
                      </span>
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
            <EmptyState
              actions={
                activeStatus ? (
                  <Link
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                    href="/admin/jobs"
                  >
                    전체 보기
                  </Link>
                ) : (
                  <Link
                    className={cn(buttonVariants({ size: "sm" }))}
                    href="/admin/companies"
                  >
                    기업 인증 현황 보기
                  </Link>
                )
              }
              description={
                activeStatus
                  ? "다른 상태를 선택하거나 전체 공고 목록을 확인해보세요."
                  : "기업 담당자가 인증된 회사/지점으로 공고를 등록하면 이 화면에 표시됩니다."
              }
              title="검토할 공고가 없습니다."
            />
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
      name="status"
      type="submit"
      value={status}
      variant={status === "published" ? "default" : "outline"}
    >
      {isCurrent ? "메모 저장" : children}
    </Button>
  );
}

function getJobReadiness(job: {
  category?: string | null;
  description?: string | null;
  employment_type?: string | null;
  korean_requirement?: string | null;
  location?: string | null;
  title?: string | null;
  visa_support_type?: string | null;
  wage_amount?: number | null;
  wage_type?: string | null;
}) {
  const checks = [
    { done: Boolean(job.title?.trim()), label: "제목" },
    { done: Boolean(job.location?.trim()), label: "근무지" },
    { done: Boolean(job.employment_type?.trim()), label: "근무형태" },
    { done: Boolean(job.category?.trim()), label: "카테고리" },
    { done: Boolean(job.wage_type?.trim()), label: "급여 유형" },
    { done: job.wage_amount !== null && job.wage_amount !== undefined, label: "급여 금액" },
    { done: Boolean(job.visa_support_type?.trim()), label: "비자 조건" },
    { done: Boolean(job.korean_requirement?.trim()), label: "한국어 조건" },
    {
      done: (job.description?.trim().length ?? 0) >= 60,
      label: "설명 60자 이상",
    },
  ];
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    completed: checks.length - missing.length,
    missing,
    total: checks.length,
  };
}

function getJobReviewGuidance({
  missingCount,
  status,
}: {
  missingCount: number;
  status: string;
}) {
  if (status === "published" && missingCount === 0) {
    return {
      detail: "공개 중인 공고입니다. 신고나 품질 문제가 없다면 유지해도 됩니다.",
      title: "공개 유지",
    };
  }

  if (status === "published") {
    return {
      detail: "공개 중이지만 부족한 항목이 있습니다. 기업에 보완 메모를 남기는 것을 검토하세요.",
      title: "공개 품질 확인",
    };
  }

  if (status === "closed") {
    return {
      detail: "마감된 공고입니다. 지원자 수와 마감 사유가 적절한지 확인하세요.",
      title: "마감 상태",
    };
  }

  return {
    detail:
      missingCount > 0
        ? "비공개 상태이며 부족한 항목이 있습니다. 기업 담당자에게 보완 안내가 필요합니다."
        : "비공개 상태입니다. 필요한 경우 기업 담당자에게 상태를 확인하세요.",
    title: "비공개 확인",
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
