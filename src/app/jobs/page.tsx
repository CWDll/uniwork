import { BriefcaseBusiness, MapPin, Search } from "lucide-react";
import type { ReactElement } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { JobCard } from "@/components/marketing/job-card";
import { PageHeading } from "@/components/marketing/page-heading";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/seed";
import { createClient } from "@/lib/supabase/server";

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: dbJobs } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, location, employment_type, category, wage_type, wage_amount, visa_support_type, status, created_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

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

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20 lg:h-max">
          <h2 className="text-lg font-black">Search jobs</h2>
          <div className="mt-4 grid gap-3">
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <Search className="size-4 text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                placeholder="Keyword"
              />
            </label>
            <Filter label="Location" icon={<MapPin className="size-4" />} />
            <Filter
              label="Employment type"
              icon={<BriefcaseBusiness className="size-4" />}
            />
            <Button className="h-11 rounded-xl">Apply filters</Button>
          </div>
        </aside>

        <div className="min-w-0">
          <PageHeading
            eyebrow="Jobs"
            title="지원 가능성을 먼저 확인하는 채용공고"
            description="D-2/D-4 유학생의 시간제 취업 조건과 기업 요구사항을 함께 확인할 수 있도록 공고 구조를 설계합니다."
          />

          <div className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                className="shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 first:bg-blue-600 first:text-white"
                key={category}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {jobs.length > 0 ? (
                jobs.map((job) => <JobCard job={job} key={job.id} />)
              ) : (
                <div className="px-5 py-10 text-sm font-semibold text-slate-500">
                  아직 공개된 공고가 없습니다. 기업 공고가 운영자 승인을 받으면
                  이곳에 표시됩니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Filter({ label, icon }: { label: string; icon: ReactElement }) {
  return (
    <button className="flex h-11 items-center justify-between rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-600">
      <span className="flex items-center gap-2 text-slate-500">
        {icon}
        {label}
      </span>
      <span>⌄</span>
    </button>
  );
}
