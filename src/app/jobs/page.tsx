import { BriefcaseBusiness, MapPin, Search, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";

import { JobCategoryFilters } from "@/components/jobs/job-category-filters";
import { PublicShell } from "@/components/layout/public-shell";
import { JobCard } from "@/components/marketing/job-card";
import { PageHeading } from "@/components/marketing/page-heading";
import { Button } from "@/components/ui/button";
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

const employmentTypes = ["Part-time", "Contract", "Internship", "Full-time"];

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
      "id, company_id, title, location, employment_type, category, wage_type, wage_amount, visa_support_type, status, created_at",
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
          .select("id, name")
          .in("id", companyIds)
      : { data: [] };

  const companyNameById = new Map<string, string>(
    companies?.map((company) => [String(company.id), String(company.name)]) ??
      [],
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
        featured: false,
        location: job.location || "-",
        logo: initials || "UW",
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
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20 lg:h-max">
          <h2 className="text-lg font-black">Search jobs</h2>
          <form action="/jobs" className="mt-4 grid gap-3">
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <Search className="size-4 text-slate-400" />
              <input
                defaultValue={q}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                name="q"
                placeholder="Keyword"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <MapPin className="size-4 text-slate-400" />
              <input
                defaultValue={location}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                name="location"
                placeholder="Location"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              <span className="flex items-center gap-2 text-slate-500">
                <BriefcaseBusiness className="size-4" />
                Employment type
              </span>
              <select
                className="h-11 rounded-xl border-0 bg-slate-50 px-3 text-sm font-bold text-slate-600 outline-none"
                defaultValue={employmentType}
                name="employment_type"
              >
                <option value="">All types</option>
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            {category ? (
              <input name="category" type="hidden" value={category} />
            ) : null}
            {visaSupportType ? (
              <input
                name="visa_support_type"
                type="hidden"
                value={visaSupportType}
              />
            ) : null}
            {wageType ? (
              <input name="wage_type" type="hidden" value={wageType} />
            ) : null}
            {koreanRequirement ? (
              <input
                name="korean_requirement"
                type="hidden"
                value={koreanRequirement}
              />
            ) : null}
            {effectiveProfileFit ? (
              <input name="profile_fit" type="hidden" value={effectiveProfileFit} />
            ) : null}
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Minimum wage
              <input
                className="h-11 rounded-xl border-0 bg-slate-50 px-3 text-sm font-bold text-slate-600 outline-none"
                defaultValue={
                  Number.isFinite(minWage) && minWage > 0 ? String(minWage) : ""
                }
                inputMode="numeric"
                name="min_wage"
                placeholder="12000"
              />
            </label>
            <Button className="h-11 rounded-xl">Apply filters</Button>
            {hasFilters ? (
              <Link
                className="text-center text-sm font-black text-slate-500 hover:text-blue-700"
                href="/jobs"
              >
                Reset filters
              </Link>
            ) : null}
          </form>
        </aside>

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
              defaultOpen={hasFilters}
              getHref={(updates) => buildJobsHref(params, updates)}
              showAdvanced
              showProfileFit={Boolean(user)}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black">Jobs {jobs.length}</h2>
              {hasFilters ? (
                <p className="text-sm font-semibold text-slate-500">
                  필터가 적용된 결과입니다.
                </p>
              ) : null}
            </div>
            <div className="divide-y divide-slate-100">
              {jobs.length > 0 ? (
                jobs.map((job) => <JobCard job={job} key={job.id} />)
              ) : (
                <div className="px-5 py-10 text-sm font-semibold text-slate-500">
                  조건에 맞는 공개 공고가 없습니다. 검색어 또는 필터를 조정해
                  주세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
