import { BriefcaseBusiness, ClipboardList, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
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

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, verification_status")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { count: jobCount } = company
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
    : { count: 0 };

  const { data: jobs } = company
    ? await supabase.from("jobs").select("id").eq("company_id", company.id)
    : { data: [] };

  const jobIds = jobs?.map((job) => job.id) ?? [];
  const { count: applicantCount } =
    jobIds.length > 0
      ? await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds)
      : { count: 0 };

  const { count: draftCount } = company
    ? await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "draft")
    : { count: 0 };

  const metrics = [
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
          {company?.name ?? "기업 정보를 먼저 저장해주세요"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          기업 공고 등록은 MVP 단계에서 무료이며, 운영자 승인 후 노출됩니다.
        </p>
        {!company ? (
          <Link
            className={cn(buttonVariants({ className: "mt-5" }))}
            href="/company/settings"
          >
            기업 정보 저장하기
          </Link>
        ) : (
          <p className="mt-5 inline-flex rounded-md bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">
            Verification: {company.verification_status}
          </p>
        )}
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
