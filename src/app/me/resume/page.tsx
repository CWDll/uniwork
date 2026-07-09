import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ResumeForm } from "@/components/profile/resume-form";
import { createClient } from "@/lib/supabase/server";

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
    .select("title, intro, education, experience, languages")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <DashboardShell area="me">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Resume
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          기업에게 보여줄 이력과 강점을 입력합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          기본 프로필은 지원 가능 여부를 판단하고, 이력/소개 정보는 기업이 실제
          채용 판단을 할 때 함께 확인합니다.
        </p>
      </div>

      <ResumeForm resume={resume} />
    </DashboardShell>
  );
}
