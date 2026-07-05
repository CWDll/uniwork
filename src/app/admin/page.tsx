import { FileText, ShieldAlert, UsersRound } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { adminRequestStatuses } from "@/data/seed";

const metrics = [
  { label: "Users", value: "1,024", icon: UsersRound },
  { label: "Pending jobs", value: "8", icon: ShieldAlert },
  { label: "Admin requests", value: "23", icon: FileText },
];

export default function AdminPage() {
  return (
    <DashboardShell area="admin">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          운영자 검토와 행정사 배정을 관리합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          공고 승인, 신고 처리, 행정 요청 배정, 개인정보 제공 동의 이력을
          운영자가 확인하는 콘솔입니다.
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

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Admin request pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {adminRequestStatuses.map((status) => (
            <div className="rounded-xl bg-slate-50 p-4" key={status.label}>
              <p className="text-sm font-bold text-slate-500">{status.label}</p>
              <p className="mt-2 text-2xl font-black">{status.value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
