import { redirect } from "next/navigation";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ResumeForm } from "@/components/profile/resume-form";
import { buttonVariants } from "@/components/ui/button";
import { getResumeCompletion } from "@/lib/applications/completeness";
import { translateCompletionLabel } from "@/lib/applications/completion-labels";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const resumePageCopy = {
  en: {
    complete: "Ready to submit",
    completion: "Resume readiness",
    description:
      "Your profile is used to check job eligibility. Your resume and introduction are reviewed by employers when they consider your application.",
    incomplete: "Needs update",
    jobs: "View eligible jobs",
    note: "When you apply, this resume is saved as the submission snapshot.",
    profile: "Check profile",
    title: "Add your experience and strengths for employers",
  },
  ko: {
    complete: "제출 준비 완료",
    completion: "이력서 완성도",
    description:
      "기본 프로필은 지원 가능 여부를 판단하고, 이력/소개 정보는 기업이 실제 채용 판단을 할 때 함께 확인합니다.",
    incomplete: "보완 필요",
    jobs: "지원 가능한 공고 보기",
    note: "지원하면 이 이력서가 제출 시점 그대로 기업에 저장됩니다.",
    profile: "프로필 확인",
    title: "기업에게 보여줄 이력과 강점을 입력합니다",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function SeekerResumePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = resumePageCopy[locale];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(getLocalizedPath("/login?next=/me/resume", locale));
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, title, intro, education, experience, languages")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const completion = getResumeCompletion(resume);

  return (
    <DashboardShell area="me" locale={locale}>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          {locale === "en" ? "Resume" : "이력서"}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {t.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          {t.description}
        </p>
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">
              {t.completion} {completion.completedCount}/{completion.totalCount}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              {t.note}
            </p>
          </div>
          <span
            className={cn(
              "w-max rounded-md px-2 py-1 text-xs font-black",
              completion.isComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {completion.isComplete ? t.complete : t.incomplete}
          </span>
        </div>
        {completion.missing.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {completion.missing.map((item) => (
              <span
                className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700"
                key={item}
              >
                {translateCompletionLabel(item, locale)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              href={getLocalizedPath("/jobs?profile_fit=eligible", locale)}
            >
              {t.jobs}
            </Link>
            <Link
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              href={getLocalizedPath("/me/profile", locale)}
            >
              {t.profile}
            </Link>
          </div>
        )}
      </section>

      <ResumeForm locale={locale} resume={resume} />
    </DashboardShell>
  );
}
