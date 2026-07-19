import { redirect } from "next/navigation";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ResumeForm } from "@/components/profile/resume-form";
import { buttonVariants } from "@/components/ui/button";
import { getResumeCompletion } from "@/lib/applications/completeness";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function SeekerResumePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/resume");
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
    <DashboardShell area="me">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          이력서
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          기업에게 보여줄 이력과 강점을 입력합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          기본 프로필은 지원 가능 여부를 판단하고, 이력/소개 정보는 기업이 실제
          채용 판단을 할 때 함께 확인합니다.
        </p>
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">
              이력서 완성도 {completion.completedCount}/{completion.totalCount}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              지원하면 이 이력서가 제출 시점 그대로 기업에 저장됩니다.
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
            {completion.isComplete ? "제출 준비 완료" : "보완 필요"}
          </span>
        </div>
        {completion.missing.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {completion.missing.map((item) => (
              <span
                className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              href="/jobs?profile_fit=eligible"
            >
              지원 가능한 공고 보기
            </Link>
            <Link
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              href="/me/profile"
            >
              프로필 확인
            </Link>
          </div>
        )}
      </section>

      <ResumeForm resume={resume} />
    </DashboardShell>
  );
}
