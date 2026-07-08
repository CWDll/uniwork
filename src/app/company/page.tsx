import { BriefcaseBusiness, ClipboardList, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function CompanyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/company");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, verification_status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const companyIds = companies?.map((company) => company.id) ?? [];

  const { count: jobCount } = companyIds.length > 0
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .in("company_id", companyIds)
    : { count: 0 };

  const { data: jobs } = companyIds.length > 0
    ? await supabase.from("jobs").select("id").in("company_id", companyIds)
    : { data: [] };

  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { count: applicantCount } =
    jobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds)
      : { count: 0 };

  const { count: draftCount } = companyIds.length > 0
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .in("company_id", companyIds)
        .eq("status", "draft")
    : { count: 0 };

  const metrics = [
    { label: "Companies", value: companyIds.length, icon: BriefcaseBusiness },
    { label: "Job posts", value: jobCount ?? 0, icon: BriefcaseBusiness },
    { label: "Applicants", value: applicantCount ?? 0, icon: UsersRound },
    { label: "Drafts", value: draftCount ?? 0, icon: ClipboardList },
  ];

  return (
    <DashboardShell area="company">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {companyIds.length > 0
            ? `${companyIds.length}개 회사/지점 관리 중`
            : "회사/지점을 먼저 등록해주세요"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          한 구인자 계정에서 여러 회사 또는 지점을 등록하고, 각 공고를 특정
          회사/지점에 연결합니다.
        </p>
        {companyIds.length === 0 ? (
          <Link
            className={cn(buttonVariants({ className: "mt-5" }))}
            href="/company/settings"
          >
            기업 정보 저장하기
          </Link>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {companies?.slice(0, 4).map((company) => {
              const status = getStatusMeta(
                "companyVerification",
                company.verification_status,
              );

              return (
                <span
                  className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
                  key={company.id}
                >
                  {company.name}
                  <span
                    className={getStatusBadgeClassName(
                      "companyVerification",
                      company.verification_status,
                    )}
                  >
                    {status.label}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
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
