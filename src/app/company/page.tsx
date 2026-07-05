import { BriefcaseBusiness, ClipboardList, UsersRound } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

const metrics = [
  { label: "Active jobs", value: "2", icon: BriefcaseBusiness },
  { label: "Applicants", value: "18", icon: UsersRound },
  { label: "Needs review", value: "5", icon: ClipboardList },
];

export default function CompanyPage() {
  return (
    <DashboardShell area="company">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          공고와 지원자를 한 곳에서 관리합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          기업 공고 등록은 MVP 단계에서 무료이며, 운영자 승인 후 노출됩니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={metric.label}
            >
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 text-3xl font-black">{metric.value}</p>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
