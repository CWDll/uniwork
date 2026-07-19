import Link from "next/link";
import { redirect } from "next/navigation";

import { updateCompanyJobAction } from "@/app/company/jobs/actions";
import { CompanyJobForm } from "@/components/company/company-job-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type CompanyJobEditPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

export default async function CompanyJobEditPage({
  params,
}: CompanyJobEditPageProps) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/company/jobs/${jobId}/edit`);
  }

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, description, employment_type, category, location, wage_type, wage_amount, visa_support_type, korean_requirement, closed_at",
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    redirect("/company/jobs");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, verification_status")
    .eq("id", job.company_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!company) {
    redirect("/company/jobs");
  }

  const { data: translation } = await supabase
    .from("job_translations")
    .select("title, description, location, visa_support_type, korean_requirement")
    .eq("job_id", job.id)
    .eq("locale", "en")
    .maybeSingle();

  return (
    <DashboardShell area="company">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          공고 수정
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          공고 내용을 최신 정보로 수정합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          한국어 원문과 영문 공고 정보를 함께 관리할 수 있습니다. 회사/지점은
          기존 공고 소유 기준으로 고정됩니다.
        </p>
        <Link
          className={cn(buttonVariants({ className: "mt-4", variant: "outline" }))}
          href="/company/jobs"
        >
          공고 목록으로 돌아가기
        </Link>
      </div>

      <CompanyJobForm
        action={updateCompanyJobAction}
        companies={[company]}
        disabled={company.verification_status !== "verified"}
        heading="공고 수정"
        initialCompanyId={company.id}
        initialValues={{
          category: job.category ?? "",
          closed_at: toDateTimeLocal(job.closed_at),
          description: job.description ?? "",
          employment_type: job.employment_type ?? "",
          en_description: translation?.description ?? "",
          en_korean_requirement: translation?.korean_requirement ?? "",
          en_location: translation?.location ?? "",
          en_title: translation?.title ?? "",
          en_visa_support_type: translation?.visa_support_type ?? "",
          korean_requirement: job.korean_requirement ?? "",
          location: job.location ?? "",
          title: job.title ?? "",
          visa_support_type: job.visa_support_type ?? "",
          wage_amount:
            job.wage_amount === null || job.wage_amount === undefined
              ? ""
              : String(job.wage_amount),
          wage_type: job.wage_type ?? "",
        }}
        intro="수정 내용을 저장하면 공개 페이지와 /en 공고 페이지에 반영됩니다."
        jobId={job.id}
        lockCompanySelect
        pendingLabel="공고 수정 중..."
        submitLabel="공고 수정"
      />
    </DashboardShell>
  );
}
