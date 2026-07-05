import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  Clock3,
  FileCheck2,
  Languages,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactElement } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { JobCard } from "@/components/marketing/job-card";
import { Button } from "@/components/ui/button";
import { applicationTips, categories, jobs } from "@/data/seed";

export default function Home() {
  return (
    <PublicShell>
      <section className="overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="min-w-0">
            <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 sm:mb-5 sm:text-sm">
              <Sparkles className="size-4 shrink-0" />
              D-2/D-4 유학생 중심 채용
            </div>
            <div className="grid min-w-0 items-center gap-5 sm:gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="min-w-0">
                <h1 className="max-w-xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  Find a safer part-time job in Korea
                </h1>
                <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-slate-600 sm:mt-4 sm:text-base sm:leading-7">
                  Uniwork는 외국인 유학생의 비자, 학교, 가능 근무시간을
                  고려해 지원 가능한 채용공고와 행정 상담 흐름을 연결합니다.
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-500">
                      Profile check
                    </p>
                    <p className="mt-1 text-xl font-black sm:text-2xl">
                      72% ready
                    </p>
                  </div>
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white sm:size-14">
                    <ShieldCheck className="size-7" />
                  </div>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                  <div className="h-full w-[72%] rounded-full bg-blue-600" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatusPill icon={<BadgeCheck />} label="D-2" />
                  <StatusPill icon={<Clock3 />} label="20h/week" />
                  <StatusPill icon={<Languages />} label="TOPIK 3+" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mt-7 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
              <label className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                <Search className="size-5 shrink-0 text-slate-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  placeholder="Job title, company, keyword"
                />
              </label>
              <FilterButton icon={<MapPin />} label="Location" />
              <FilterButton icon={<BriefcaseBusiness />} label="Job type" />
              <Button className="h-12 rounded-xl">Search Jobs</Button>
            </div>
          </div>

          <aside className="hidden rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white lg:block">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-blue-200">Company</p>
                <h2 className="mt-2 text-2xl font-black leading-tight">
                  Hire foreign student talent with less paperwork
                </h2>
              </div>
              <Building2 className="size-8 text-blue-200" />
            </div>
            <div className="mt-6 space-y-3">
              {[
                "Free job posting for MVP",
                "Admin-reviewed applicant handoff",
                "Visa status guidance before interviews",
              ].map((item) => (
                <div
                  className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold"
                  key={item}
                >
                  <FileCheck2 className="size-4 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                className="shrink-0 whitespace-nowrap rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 first:bg-blue-600 first:text-white"
                key={category}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-black">Featured Jobs</h2>
                <p className="text-sm font-medium text-slate-500">
                  지원 가능성을 먼저 확인할 수 있는 공고
                </p>
              </div>
              <Button className="shrink-0" variant="ghost" size="sm">
                View all
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <JobCard job={job} key={job.title} />
              ))}
            </div>
          </div>
        </div>

        <aside className="grid min-w-0 gap-4 lg:block lg:space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">Log In</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400"
                placeholder="Email"
              />
              <input
                className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400"
                placeholder="Password"
                type="password"
              />
              <Button className="h-11">Log In</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-amber-500" />
              <h2 className="text-lg font-black">Application Tips</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {applicationTips.map((tip) => (
                <p
                  className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-slate-600"
                  key={tip}
                >
                  {tip}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-bold text-blue-700">Admin handoff</p>
            <h2 className="mt-2 text-lg font-black">
              행정 요청은 운영자 검토 후 파트너에게 배정됩니다.
            </h2>
          </div>
        </aside>
      </section>
    </PublicShell>
  );
}

function StatusPill({
  icon,
  label,
}: {
  icon: ReactElement;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-black text-slate-700">
      <span className="text-blue-600 [&>svg]:size-4">{icon}</span>
      {label}
    </div>
  );
}

function FilterButton({
  icon,
  label,
}: {
  icon: ReactElement;
  label: string;
}) {
  return (
    <button className="flex h-12 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-600">
      <span className="flex items-center gap-2">
        <span className="text-slate-400 [&>svg]:size-4">{icon}</span>
        {label}
      </span>
      <span className="text-slate-400">⌄</span>
    </button>
  );
}
