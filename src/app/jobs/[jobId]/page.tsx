import { AlertCircle, ArrowLeft, BriefcaseBusiness, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobApplicationForm } from "@/components/jobs/job-application-form";
import { PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { getJobEligibility, type JobEligibility } from "@/lib/jobs/eligibility";
import { getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, description, location, employment_type, category, wage_type, wage_amount, visa_support_type, korean_requirement, status, published_at",
    )
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry, address")
    .eq("id", job.company_id)
    .maybeSingle();

  const { data: existingApplication } = user
    ? await supabase
        .from("job_applications")
        .select("id, status")
        .eq("job_id", job.id)
        .eq("seeker_id", user.id)
        .maybeSingle()
    : { data: null };
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
  const eligibility = getJobEligibility({
    isSignedIn: Boolean(user),
    jobVisaSupportType: job.visa_support_type,
    rule: visaRule,
    visaType: seekerProfile?.visa_type,
  });

  const wage =
    job.wage_amount && job.wage_type
      ? `${Number(job.wage_amount).toLocaleString("ko-KR")} KRW / ${job.wage_type}`
      : "협의";
  const existingApplicationStatus = getStatusMeta(
    "application",
    existingApplication?.status,
  );

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-blue-700"
            href="/jobs"
          >
            <ArrowLeft className="size-4" />
            Jobs
          </Link>

          <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {job.category || "Part-time"}
              </span>
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {job.visa_support_type || "Visa review"}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {job.title}
            </h1>
            <p className="mt-3 text-base font-semibold text-slate-600">
              {company?.name ?? "Company"}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Info label="Location" value={job.location || "-"} />
              <Info label="Type" value={job.employment_type || "-"} />
              <Info label="Wage" value={wage} />
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="text-xl font-black">공고 설명</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                {job.description}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info
                label="Korean requirement"
                value={job.korean_requirement || "별도 협의"}
              />
              <Info
                label="Company address"
                value={company?.address || job.location || "-"}
              />
            </div>
          </article>
        </div>

        <aside className="h-max rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
              {(company?.name ?? "UW").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-black">{company?.name ?? "Company"}</p>
              <p className="text-sm font-semibold text-slate-500">
                {company?.industry || "Industry"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-slate-400" />
              {job.location || "-"}
            </span>
            <span className="flex items-center gap-2">
              <BriefcaseBusiness className="size-4 text-slate-400" />
              {job.employment_type || "-"}
            </span>
          </div>

          {existingApplication ? (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              이미 지원한 공고입니다. 상태: {existingApplicationStatus.label}
            </div>
          ) : user && eligibility.canApply ? (
            <>
              <EligibilityPanel eligibility={eligibility} />
              <JobApplicationForm jobId={job.id} />
            </>
          ) : user ? (
            <>
              <EligibilityPanel eligibility={eligibility} />
              <Link
                className={cn(buttonVariants({ className: "mt-4 w-full" }))}
                href={
                  eligibility.status === "profile_required"
                    ? "/me/profile"
                    : "/me/admin-requests"
                }
              >
                {eligibility.status === "profile_required"
                  ? "프로필 입력하기"
                  : "행정 검토 요청하기"}
              </Link>
            </>
          ) : (
            <>
              <EligibilityPanel eligibility={eligibility} />
              <Link
                className={cn(buttonVariants({ className: "mt-5 w-full" }))}
                href={`/login?next=/jobs/${job.id}`}
              >
                로그인 후 지원하기
              </Link>
            </>
          )}
        </aside>
      </section>
    </PublicShell>
  );
}

function EligibilityPanel({ eligibility }: { eligibility: JobEligibility }) {
  const Icon = eligibility.canApply ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        "mt-5 rounded-xl border p-4",
        eligibility.status === "eligible" &&
          "border-emerald-100 bg-emerald-50 text-emerald-900",
        eligibility.status === "review_required" &&
          "border-amber-100 bg-amber-50 text-amber-900",
        eligibility.status === "blocked" && "border-red-100 bg-red-50 text-red-900",
        eligibility.status === "profile_required" &&
          "border-slate-200 bg-slate-50 text-slate-800",
        eligibility.status === "sign_in_required" &&
          "border-blue-100 bg-blue-50 text-blue-900",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0" />
        <p className="font-black">{eligibility.label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">
        {eligibility.description}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
