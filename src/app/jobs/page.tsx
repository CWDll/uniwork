import { ToggleLeft, ToggleRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { JobCategoryFilters } from "@/components/jobs/job-category-filters";
import { PublicShell } from "@/components/layout/public-shell";
import { JobCard } from "@/components/marketing/job-card";
import { PageHeading } from "@/components/marketing/page-heading";
import { getJobEligibility } from "@/lib/jobs/eligibility";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type JobsSearchParams = {
  category?: string;
  employment_type?: string;
  korean_requirement?: string;
  location?: string;
  min_wage?: string;
  profile_fit?: string;
  q?: string;
  visa_support_type?: string;
  wage_type?: string;
};

export const metadata: Metadata = {
  alternates: {
    canonical: "/jobs",
  },
  description:
    "외국인 유학생이 비자 조건, 근무지, 급여, 한국어 조건을 함께 확인하며 한국 아르바이트 공고를 탐색합니다.",
  openGraph: {
    description:
      "D-2/D-4 유학생을 위한 한국 아르바이트 공고와 지원 가능성 안내",
    title: "Jobs | Uniwork",
    url: "/jobs",
  },
  title: "Jobs | Uniwork",
};

function getParam(value: string | undefined) {
  return value?.trim() ?? "";
}

function getFilterText(value: string) {
  return value.replace(/[%(),]/g, " ").replace(/\s+/g, " ").trim();
}

function buildJobsHref(params: JobsSearchParams, updates: JobsSearchParams) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...updates };

  for (const [key, value] of Object.entries(merged)) {
    const normalized = getParam(value);

    if (normalized && normalized !== "All Jobs") {
      nextParams.set(key, normalized);
    }
  }

  const query = nextParams.toString();

  return query ? `/jobs?${query}` : "/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobsSearchParams>;
}) {
  const params = await searchParams;
  const q = getParam(params.q);
  const location = getParam(params.location);
  const queryFilter = getFilterText(q);
  const locationFilter = getFilterText(location);
  const employmentType = getParam(params.employment_type);
  const category = getParam(params.category);
  const koreanRequirement = getParam(params.korean_requirement);
  const minWage = Number(getParam(params.min_wage));
  const profileFit = getParam(params.profile_fit);
  const visaSupportType = getParam(params.visa_support_type);
  const wageType = getParam(params.wage_type);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: seekerProfile } = user
    ? await supabase
        .from("seeker_profiles")
        .select("visa_type")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const { data: visaRule } = seekerProfile?.visa_type
    ? await supabase
        .from("visa_eligibility_rules")
        .select("visa_type, can_apply, needs_review, blocked_reason")
        .eq("visa_type", seekerProfile.visa_type)
        .maybeSingle()
    : { data: null };
  const effectiveProfileFit = user ? profileFit : "";

  let companyIdsMatchingKeyword: string[] = [];

  if (queryFilter) {
    const { data: matchingCompanies } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", `%${queryFilter}%`)
      .limit(50);

    companyIdsMatchingKeyword =
      matchingCompanies?.map((company) => String(company.id)) ?? [];
  }

  let jobsQuery = supabase
    .from("jobs")
    .select(
      "id, company_id, title, description, location, employment_type, category, wage_type, wage_amount, visa_support_type, korean_requirement, status, created_at, published_at",
    )
    .eq("status", "published");

  if (queryFilter) {
    const keywordFilters = [
      `title.ilike.%${queryFilter}%`,
      `description.ilike.%${queryFilter}%`,
      `location.ilike.%${queryFilter}%`,
      `category.ilike.%${queryFilter}%`,
    ];

    if (companyIdsMatchingKeyword.length > 0) {
      keywordFilters.push(
        `company_id.in.(${companyIdsMatchingKeyword.join(",")})`,
      );
    }

    jobsQuery = jobsQuery.or(keywordFilters.join(","));
  }

  if (locationFilter) {
    jobsQuery = jobsQuery.ilike("location", `%${locationFilter}%`);
  }

  if (employmentType) {
    jobsQuery = jobsQuery.eq("employment_type", employmentType);
  }

  if (category && category !== "All Jobs") {
    jobsQuery = jobsQuery.eq("category", category);
  }

  if (visaSupportType) {
    jobsQuery = jobsQuery.ilike("visa_support_type", `%${visaSupportType}%`);
  }

  if (wageType) {
    jobsQuery = jobsQuery.eq("wage_type", wageType);
  }

  if (koreanRequirement) {
    jobsQuery = jobsQuery.ilike(
      "korean_requirement",
      `%${getFilterText(koreanRequirement)}%`,
    );
  }

  if (Number.isFinite(minWage) && minWage > 0) {
    jobsQuery = jobsQuery.gte("wage_amount", minWage);
  }

  const { data: dbJobs } = await jobsQuery.order("published_at", {
    ascending: false,
    nullsFirst: false,
  });

  const companyIds = Array.from(
    new Set(dbJobs?.map((job) => job.company_id) ?? []),
  );
  const { data: companies } =
    companyIds.length > 0
      ? await supabase
          .from("companies")
          .select("id, name, verification_status")
          .in("id", companyIds)
      : { data: [] };

  const companyNameById = new Map<string, string>(
    companies?.map((company) => [String(company.id), String(company.name)]) ??
      [],
  );
  const companyVerifiedById = new Map<string, boolean>(
    companies?.map((company) => [
      String(company.id),
      company.verification_status === "verified",
    ]) ?? [],
  );

  const jobsWithEligibility =
    dbJobs?.map((job) => {
      const company = companyNameById.get(String(job.company_id)) ?? "Company";
      const initials = company
        .split(/\s+/)
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: job.id,
        company,
        companyVerified: companyVerifiedById.get(String(job.company_id)) ?? false,
        descriptionQuality:
          (job.description?.trim().length ?? 0) >= 60
            ? ("complete" as const)
            : ("needs_detail" as const),
        featured: false,
        koreanRequirement: job.korean_requirement || "한국어 조건 협의",
        location: job.location || "-",
        logo: initials || "UW",
        publishedAt: job.published_at,
        title: job.title,
        type: job.employment_type || "-",
        visa: job.visa_support_type || "D-2/D-4 review",
        wage:
          job.wage_amount && job.wage_type
            ? `${Number(job.wage_amount).toLocaleString("ko-KR")} KRW / ${job.wage_type}`
            : "Wage negotiable",
        eligibility: getJobEligibility({
          isSignedIn: Boolean(user),
          jobVisaSupportType: job.visa_support_type,
          rule: visaRule,
          visaType: seekerProfile?.visa_type,
        }),
      };
    }) ?? [];
  const jobs = effectiveProfileFit
    ? jobsWithEligibility.filter(
        (job) => job.eligibility.status === effectiveProfileFit,
      )
    : jobsWithEligibility;
  const hasFilters = Boolean(
    q ||
      location ||
      employmentType ||
      category ||
      visaSupportType ||
      wageType ||
      koreanRequirement ||
      effectiveProfileFit ||
      (Number.isFinite(minWage) && minWage > 0),
  );
  const eligibleOnlyHref = buildJobsHref(params, {
    profile_fit: effectiveProfileFit === "eligible" ? "" : "eligible",
  });
  const eligibleOnlyEnabled = effectiveProfileFit === "eligible";

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <PageHeading
            eyebrow="Jobs"
            title="지원 가능성을 먼저 확인하는 채용공고"
            description="D-2/D-4 유학생의 시간제 취업 조건과 기업 요구사항을 함께 확인할 수 있도록 공고 구조를 설계합니다."
          />

          {user ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">
                  내가 지원 가능한 공고만 보기
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {seekerProfile?.visa_type
                    ? `${seekerProfile.visa_type} 프로필 기준으로 바로 지원 가능한 공고를 먼저 봅니다.`
                    : "비자 프로필을 입력하면 지원 가능한 공고만 빠르게 볼 수 있습니다."}
                </p>
              </div>
              <Link
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-black transition",
                  eligibleOnlyEnabled
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                href={eligibleOnlyHref}
              >
                {eligibleOnlyEnabled ? (
                  <ToggleRight className="size-5" />
                ) : (
                  <ToggleLeft className="size-5" />
                )}
                {eligibleOnlyEnabled ? "켜짐" : "꺼짐"}
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-900">
                로그인하면 내 비자 기준 필터를 사용할 수 있습니다.
              </p>
              <Link
                className="mt-2 inline-flex text-sm font-black text-blue-700 hover:text-blue-900"
                href="/login?next=/jobs"
              >
                로그인하고 맞춤 공고 보기
              </Link>
            </div>
          )}

          <div className="mt-5">
            <JobCategoryFilters
              activeFilters={{
                category,
                employment_type: employmentType,
                korean_requirement: koreanRequirement,
                location,
                profile_fit: effectiveProfileFit,
                visa_support_type: visaSupportType,
                wage_type: wageType,
              }}
              defaultOpen
              getHref={(updates) => buildJobsHref(params, updates)}
              hasFilters={hasFilters}
              minWage={
                Number.isFinite(minWage) && minWage > 0 ? String(minWage) : ""
              }
              q={q}
              showAdvanced
              showProfileFit={Boolean(user)}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">Jobs {jobs.length}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {hasFilters
                    ? "필터가 적용된 결과입니다."
                    : "최신 공개 공고를 지원 가능성 기준으로 확인하세요."}
                </p>
              </div>
              {hasFilters ? (
                <Link
                  className="text-sm font-black text-blue-700 hover:text-blue-900"
                  href="/jobs"
                >
                  필터 초기화
                </Link>
              ) : null}
            </div>
            <div className="divide-y divide-slate-100">
              {jobs.length > 0 ? (
                jobs.map((job) => <JobCard job={job} key={job.id} />)
              ) : (
                <div className="px-5 py-10">
                  <p className="text-sm font-black text-slate-700">
                    조건에 맞는 공개 공고가 없습니다.
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    검색어 또는 필터를 조정해보세요. 비자 프로필을 입력하면 맞춤
                    공고 필터도 사용할 수 있습니다.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasFilters ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                        href="/jobs"
                      >
                        필터 초기화
                      </Link>
                    ) : null}
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                      href={user ? "/me/profile" : "/login?next=/me/profile"}
                    >
                      프로필 보완
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
