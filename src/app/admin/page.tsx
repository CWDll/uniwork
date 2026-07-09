import { FileText, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

const requestStatusLabels = [
  { key: "received", label: "접수" },
  { key: "reviewing", label: "운영자 검토" },
  { key: "assigned", label: "행정사 배정" },
  { key: "completed", label: "완료" },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const [
    { count: userCount },
    { count: pendingCompanyCount },
    { count: pendingJobCount },
    { count: adminRequestCount },
    { data: adminRequests },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("admin_requests")
      .select("id", { count: "exact", head: true }),
    supabase.from("admin_requests").select("status"),
  ]);

  const metrics = [
    { label: "Users", value: userCount ?? 0, icon: UsersRound },
    {
      label: "Pending companies",
      value: pendingCompanyCount ?? 0,
      icon: ShieldAlert,
      href: "/admin/companies?status=pending",
    },
    { label: "Draft jobs", value: pendingJobCount ?? 0, icon: ShieldAlert },
    { label: "Admin requests", value: adminRequestCount ?? 0, icon: FileText },
  ];
  const statusCounts = new Map<string, number>();
  adminRequests?.forEach((request) => {
    statusCounts.set(request.status, (statusCounts.get(request.status) ?? 0) + 1);
  });

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
          기업 인증, 공고 관리, 행정 요청 배정, 개인정보 제공 동의 이력을
          운영자가 확인하는 콘솔입니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const content = (
            <>
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 text-3xl font-black">
                {metric.value.toLocaleString("ko-KR")}
              </p>
            </>
          );

          return metric.href ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50"
              href={metric.href}
              key={metric.label}
            >
              {content}
            </Link>
          ) : (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={metric.label}
            >
              {content}
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Admin request pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {requestStatusLabels.map((status) => (
            <div className="rounded-xl bg-slate-50 p-4" key={status.label}>
              <p className="text-sm font-bold text-slate-500">{status.label}</p>
              <p className="mt-2 text-2xl font-black">
                {(statusCounts.get(status.key) ?? 0).toLocaleString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
