import { BriefcaseBusiness, MapPin, Search } from "lucide-react";
import Link from "next/link";

import { JobCategoryFilters } from "@/components/jobs/job-category-filters";
import { PublicShell } from "@/components/layout/public-shell";
import { JobCard } from "@/components/marketing/job-card";
import { PageHeading } from "@/components/marketing/page-heading";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type JobsSearchParams = {
  category?: string;
  employment_type?: string;
  location?: string;
  q?: string;
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
  const supabase = await createClient();

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

  const jobs =
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
      };
    }) ?? [];
  const hasFilters = Boolean(q || location || employmentType || category);

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

          <div className="mt-5">
            <JobCategoryFilters
              activeCategory={category}
              defaultOpen={hasFilters}
              getHref={(nextCategory) =>
                buildJobsHref(params, {
                  category: nextCategory === "All Jobs" ? "" : nextCategory,
                })
              }
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
