import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { JobCategoryFilters } from "@/components/jobs/job-category-filters";
import { PublicShell } from "@/components/layout/public-shell";
import { JobCard } from "@/components/marketing/job-card";
import { PageHeading } from "@/components/marketing/page-heading";
import {
  formatWage,
  getEmploymentTypeLabel,
  getJobFallbackLabel,
  getLocale,
  getLocalizedPath,
  type Locale,
} from "@/lib/i18n";
import { getJobEligibility } from "@/lib/jobs/eligibility";
import {
  getTranslationByJobId,
  localizedJobValue,
  type JobTranslation,
} from "@/lib/jobs/translations";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type JobsSearchParams = {
  category?: string;
  employment_type?: string;
  korean_requirement?: string;
  location?: string;
  locale?: string;
  min_wage?: string;
  profile_fit?: string;
  q?: string;
  saved?: string;
  saved_page?: string;
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

function buildJobsHref(
  params: JobsSearchParams,
  updates: JobsSearchParams,
  locale: Locale,
) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, locale: "", ...updates };

  for (const [key, value] of Object.entries(merged)) {
    const normalized = getParam(value);

    if (normalized && normalized !== "All Jobs") {
      nextParams.set(key, normalized);
    }
  }

  const query = nextParams.toString();

  return getLocalizedPath(query ? `/jobs?${query}` : "/jobs", locale);
}

function buildCurrentJobsHref(params: JobsSearchParams, locale: Locale) {
  return buildJobsHref(params, {}, locale);
}

function getValidPage(value: string | undefined) {
  const page = Number(getParam(value));

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<JobsSearchParams>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const copy = jobsCopy[locale];
  const q = getParam(params.q);
  const location = getParam(params.location);
  const queryFilter = getFilterText(q);
  const locationFilter = getFilterText(location);
  const employmentType = getParam(params.employment_type);
  const category = getParam(params.category);
  const koreanRequirement = getParam(params.korean_requirement);
  const minWage = Number(getParam(params.min_wage));
  const profileFit = getParam(params.profile_fit);
  const savedOnly = getParam(params.saved) === "1";
  const savedPage = getValidPage(params.saved_page);
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
  const currentJobsHref = buildCurrentJobsHref(params, locale);

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
      "id, company_id, title, description, location, employment_type, category, wage_type, wage_amount, visa_support_type, korean_requirement, status, created_at, published_at, closed_at",
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

  const nowTime = new Date().getTime();
  const activeDbJobs =
    dbJobs?.filter(
      (job) => !job.closed_at || new Date(job.closed_at).getTime() > nowTime,
    ) ?? [];
  const companyIds = Array.from(
    new Set(activeDbJobs.map((job) => job.company_id) ?? []),
  );
  const jobIds = activeDbJobs.map((job) => job.id);
  const { data: companies } =
    companyIds.length > 0
      ? await supabase
          .from("companies")
          .select("id, name, verification_status")
          .in("id", companyIds)
      : { data: [] };
  const { data: translations } =
    locale === "en" && jobIds.length > 0
      ? await supabase
          .from("job_translations")
          .select(
            "job_id, locale, title, description, location, visa_support_type, korean_requirement",
          )
          .eq("locale", "en")
          .in("job_id", jobIds)
      : { data: [] };

  const companyNameById = new Map<string, string>(
    companies?.map((company) => [String(company.id), String(company.name)]) ??
      [],
  );
  const translationByJobId = getTranslationByJobId(
    translations as JobTranslation[] | null,
  );
  const companyVerifiedById = new Map<string, boolean>(
    companies?.map((company) => [
      String(company.id),
      company.verification_status === "verified",
    ]) ?? [],
  );
  const { data: savedRows } =
    user
      ? await supabase
          .from("saved_jobs")
          .select("job_id, created_at")
          .eq("seeker_id", user.id)
          .order("created_at", { ascending: false })
      : { data: [] };
  const savedJobIds = new Set(savedRows?.map((row) => String(row.job_id)) ?? []);

  const jobsWithEligibility =
    activeDbJobs.map((job) => {
      const translation = translationByJobId.get(String(job.id));
      const company =
        companyNameById.get(String(job.company_id)) ??
        getJobFallbackLabel("company", locale);
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
        koreanRequirement:
          localizedJobValue(
            job.korean_requirement,
            translation?.korean_requirement,
            locale,
          ) || getJobFallbackLabel("korean", locale),
        location: localizedJobValue(job.location, translation?.location, locale) || "-",
        logo: initials || "UW",
        publishedAt: job.published_at,
        title: localizedJobValue(job.title, translation?.title, locale) || job.title,
        type: getEmploymentTypeLabel(job.employment_type, locale),
        visa:
          localizedJobValue(
            job.visa_support_type,
            translation?.visa_support_type,
            locale,
          ) || getJobFallbackLabel("visa", locale),
        wage: formatWage(job.wage_amount, job.wage_type, locale),
        saved: savedJobIds.has(String(job.id)),
        status: job.status,
        closedAt: job.closed_at,
        eligibility: getJobEligibility({
          isSignedIn: Boolean(user),
          jobVisaSupportType: job.visa_support_type,
          rule: visaRule,
          visaType: seekerProfile?.visa_type,
        }),
      };
    });
  const jobs = jobsWithEligibility
    .filter((job) => {
      if (effectiveProfileFit !== "eligible") {
        return true;
      }

      return (
        job.eligibility.status === "eligible" ||
        job.eligibility.status === "review_required"
      );
    })
    .filter((job) => (savedOnly ? job.saved : true));
  const hasFilters = Boolean(
    q ||
      location ||
      employmentType ||
      category ||
      visaSupportType ||
      wageType ||
      koreanRequirement ||
      effectiveProfileFit ||
      savedOnly ||
      (Number.isFinite(minWage) && minWage > 0),
  );
  const eligibleOnlyHref = buildJobsHref(
    params,
    {
      profile_fit: effectiveProfileFit === "eligible" ? "" : "eligible",
    },
    locale,
  );
  const eligibleOnlyEnabled = effectiveProfileFit === "eligible";
  const savedJobs = jobsWithEligibility.filter((job) => job.saved);
  const savedPageSize = 10;
  const savedTotalPages = Math.max(1, Math.ceil(savedJobs.length / savedPageSize));
  const clampedSavedPage = Math.min(savedPage, savedTotalPages);
  const visibleSavedJobs = savedJobs.slice(
    (clampedSavedPage - 1) * savedPageSize,
    clampedSavedPage * savedPageSize,
  );
  const filterStateKey = JSON.stringify({
    category,
    employmentType,
    effectiveProfileFit,
    koreanRequirement,
    location,
    minWage: Number.isFinite(minWage) && minWage > 0 ? String(minWage) : "",
    q,
    savedOnly,
    visaSupportType,
    wageType,
  });

  return (
    <PublicShell locale={locale}>
      <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <PageHeading
              eyebrow={copy.eyebrow}
              title={copy.title}
              description={copy.description}
            />

            {user ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">
                    {copy.eligibleOnlyTitle}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {seekerProfile?.visa_type
                      ? copy.eligibleOnlyDescription(seekerProfile.visa_type)
                      : copy.eligibleOnlyEmpty}
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
                  {eligibleOnlyEnabled ? copy.on : copy.off}
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-blue-900">
                  {copy.loginFilterTitle}
                </p>
                <Link
                  className="mt-2 inline-flex text-sm font-black text-blue-700 hover:text-blue-900"
                  href={getLocalizedPath("/login?next=/jobs", locale)}
                >
                  {copy.loginFilterCta}
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
                saved: savedOnly ? "1" : "",
                visa_support_type: visaSupportType,
                wage_type: wageType,
              }}
              defaultOpen
              hasFilters={hasFilters}
              key={filterStateKey}
              minWage={
                Number.isFinite(minWage) && minWage > 0 ? String(minWage) : ""
              }
              q={q}
              showAdvanced
              locale={locale}
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">Jobs {jobs.length}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {hasFilters
                    ? copy.filteredSummary
                    : copy.defaultSummary}
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <JobCard
                    job={job}
                    key={job.id}
                    locale={locale}
                    returnTo={currentJobsHref}
                    viewerSignedIn={Boolean(user)}
                  />
                ))
              ) : (
                <div className="px-5 py-10">
                  <p className="text-sm font-black text-slate-700">
                    {copy.noJobsTitle}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {copy.noJobsDescription}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasFilters ? (
                      <Link
                        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                        href={getLocalizedPath("/jobs", locale)}
                      >
                        {copy.reset}
                      </Link>
                    ) : null}
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700"
                      href={
                        user
                          ? getLocalizedPath("/me/profile", locale)
                          : getLocalizedPath("/login?next=/me/profile", locale)
                      }
                    >
                      {copy.completeProfile}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {user ? (
            <aside className="hidden xl:block">
              <div className="sticky top-20 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black">{copy.savedTitle}</h2>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {copy.savedCount(savedJobs.length)}
                      </p>
                    </div>
                    <Heart className="size-5 text-blue-700" />
                  </div>
                  <Link
                    className={cn(
                      "mt-3 inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-black",
                      savedOnly
                        ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                    )}
                    href={buildJobsHref(params, {
                      saved: savedOnly ? "" : "1",
                      saved_page: "",
                    }, locale)}
                  >
                    {savedOnly ? copy.viewAllJobs : copy.viewSavedOnly}
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleSavedJobs.length > 0 ? (
                    visibleSavedJobs.map((job) => (
                      <Link
                        className="block px-4 py-3 transition hover:bg-blue-50"
                        href={getLocalizedPath(`/jobs/${job.id}`, locale)}
                        key={job.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-black text-slate-950">
                            {job.title}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-2 py-1 text-[11px] font-black",
                              isActiveJob(job)
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {isActiveJob(job) ? copy.open : copy.closed}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                          {job.company} · {job.location}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="px-4 py-6">
                      <p className="text-sm font-black text-slate-700">
                        {copy.noSavedTitle}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {copy.noSavedDescription}
                      </p>
                    </div>
                  )}
                </div>
                {savedJobs.length > savedPageSize ? (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
                    <Link
                      aria-disabled={clampedSavedPage <= 1}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md border border-slate-200",
                        clampedSavedPage <= 1
                          ? "pointer-events-none text-slate-300"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                      href={buildJobsHref(params, {
                        saved_page: String(clampedSavedPage - 1),
                      }, locale)}
                    >
                      <ChevronLeft className="size-4" />
                    </Link>
                    <p className="text-xs font-black text-slate-500">
                      {clampedSavedPage} / {savedTotalPages}
                    </p>
                    <Link
                      aria-disabled={clampedSavedPage >= savedTotalPages}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md border border-slate-200",
                        clampedSavedPage >= savedTotalPages
                          ? "pointer-events-none text-slate-300"
                          : "text-slate-700 hover:bg-slate-50",
                      )}
                      href={buildJobsHref(params, {
                        saved_page: String(clampedSavedPage + 1),
                      }, locale)}
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}

function isActiveJob(job: { closedAt?: string | null; status?: string | null }) {
  return job.status === "published";
}

const jobsCopy = {
  ko: {
    closed: "종료",
    completeProfile: "프로필 보완",
    defaultSummary: "최신 공개 공고를 지원 가능성 기준으로 확인하세요.",
    description:
      "D-2/D-4 유학생의 시간제 취업 조건과 기업 요구사항을 함께 확인할 수 있도록 공고 구조를 설계합니다.",
    eligibleOnlyDescription: (visaType: string) =>
      `${visaType} 프로필 기준으로 지원 가능하거나 확인이 필요한 공고를 봅니다.`,
    eligibleOnlyEmpty: "비자 프로필을 입력하면 지원 가능한 공고만 빠르게 볼 수 있습니다.",
    eligibleOnlyTitle: "내가 지원 가능한 공고만 보기",
    eyebrow: "Jobs",
    filteredSummary: "필터가 적용된 결과입니다.",
    loginFilterCta: "로그인하고 맞춤 공고 보기",
    loginFilterTitle: "로그인하면 내 비자 기준 필터를 사용할 수 있습니다.",
    noJobsDescription:
      "검색어 또는 필터를 조정해보세요. 비자 프로필을 입력하면 맞춤 공고 필터도 사용할 수 있습니다.",
    noJobsTitle: "조건에 맞는 공개 공고가 없습니다.",
    noSavedDescription: "하트를 누르면 이 영역에서 다시 확인할 수 있습니다.",
    noSavedTitle: "아직 저장한 공고가 없습니다.",
    off: "꺼짐",
    on: "켜짐",
    open: "진행 중",
    reset: "필터 초기화",
    savedCount: (count: number) => `저장한 공고 ${count}개`,
    savedTitle: "즐겨찾기 한 공고",
    title: "지원 가능성을 먼저 확인하는 채용공고",
    viewAllJobs: "전체 공고 보기",
    viewSavedOnly: "즐겨찾기만 보기",
  },
  en: {
    closed: "Closed",
    completeProfile: "Complete profile",
    defaultSummary: "Browse the latest published jobs with fit signals.",
    description:
      "Explore part-time jobs in Korea with visa, workplace, wage, and Korean requirement checks.",
    eligibleOnlyDescription: (visaType: string) =>
      `Showing jobs available or reviewable for your ${visaType} profile.`,
    eligibleOnlyEmpty: "Add your visa profile to quickly filter eligible jobs.",
    eligibleOnlyTitle: "Show jobs I can apply for",
    eyebrow: "Jobs",
    filteredSummary: "Showing filtered results.",
    loginFilterCta: "Log in for matched jobs",
    loginFilterTitle: "Log in to use filters based on your visa profile.",
    noJobsDescription:
      "Try changing the keyword or filters. Add your visa profile for better matching.",
    noJobsTitle: "No published jobs match these conditions.",
    noSavedDescription: "Tap the heart on a job to keep it here.",
    noSavedTitle: "No saved jobs yet.",
    off: "Off",
    on: "On",
    open: "Open",
    reset: "Reset filters",
    savedCount: (count: number) => `${count} saved`,
    savedTitle: "Saved jobs",
    title: "Jobs with eligibility checks first",
    viewAllJobs: "View all jobs",
    viewSavedOnly: "Saved only",
  },
};
