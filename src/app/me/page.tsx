import { FileText, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationCompletion } from "@/lib/applications/completeness";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SeekerProfile = {
  alien_registration_status: string | null;
  available_times: {
    weekday?: string;
    weekend?: string;
  } | null;
  english_level: string | null;
  korean_level: string | null;
  major: string | null;
  nationality: string | null;
  preferred_job_types: string[] | null;
  preferred_locations: string[] | null;
  school: string | null;
  visa_type: string | null;
};

function getProfileCompletion(profile: SeekerProfile | null) {
  if (!profile) {
    return 0;
  }

  const checks = [
    profile.nationality,
    profile.visa_type,
    profile.alien_registration_status,
    profile.school,
    profile.major,
    profile.korean_level,
    profile.english_level,
    profile.preferred_locations?.length,
    profile.preferred_job_types?.length,
    profile.available_times?.weekday || profile.available_times?.weekend,
  ];
  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const [
    { data: profile },
    { count: applicationCount },
    { count: adminRequestCount },
    { data: resume },
  ] = await Promise.all([
      supabase
        .from("seeker_profiles")
        .select(
          "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .eq("seeker_id", user.id),
      supabase
        .from("admin_requests")
        .select("id", { count: "exact", head: true })
        .eq("seeker_id", user.id),
      supabase
        .from("resumes")
        .select("id, title, intro, education, experience, languages")
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
  const { data: accountProfile } = await supabase
    .from("profiles")
    .select("name, email, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const avatarUrl = getProfilePhotoUrl(supabase, accountProfile?.avatar_path);

  const profileCompletion = getProfileCompletion(profile);
  const applicationCompletion = getApplicationCompletion({
    profile,
    resume,
  });
  const nextSteps = [
    {
      complete: applicationCompletion.profile.isComplete,
      href: "/me/profile",
      label: "프로필 입력",
      note: applicationCompletion.profile.isComplete
        ? "비자/학교/근무 가능 시간 준비 완료"
        : `${applicationCompletion.profile.missing.slice(0, 2).join(", ")} 보완 필요`,
    },
    {
      complete: applicationCompletion.resume.isComplete,
      href: "/me/resume",
      label: "이력서 입력",
      note: applicationCompletion.resume.isComplete
        ? "자기소개/언어 정보 준비 완료"
        : `${applicationCompletion.resume.missing.slice(0, 2).join(", ")} 보완 필요`,
    },
    {
      complete: applicationCompletion.isComplete,
      href: applicationCompletion.isComplete ? "/jobs?profile_fit=eligible" : "/jobs",
      label: "공고 찾기",
      note: applicationCompletion.isComplete
        ? "내 프로필 기준 지원 가능 공고 확인"
        : "정보 보완 후 지원 가능성이 더 정확해집니다",
    },
  ];
  const cards = [
    {
      label: "Profile",
      value: `${profileCompletion}%`,
      note:
        profileCompletion === 100
          ? "지원 기본 정보 입력 완료"
          : "D-2/D-4 지원 검토를 위한 기본 정보",
      icon: ShieldCheck,
    },
    {
      label: "Applications",
      value: String(applicationCount ?? 0),
      note: "내가 지원한 공고 수",
      icon: Send,
    },
    {
      label: "Resume",
      value: `${applicationCompletion.resume.completedCount}/${applicationCompletion.resume.totalCount}`,
      note: applicationCompletion.resume.isComplete
        ? "기업에게 보여줄 이력 정보 입력 완료"
        : "자기소개와 언어 정보를 입력해주세요",
      icon: FileText,
    },
    {
      label: "Admin requests",
      value: String(adminRequestCount ?? 0),
      note: "접수한 행정 요청 수",
      icon: FileText,
    },
  ];

  return (
    <DashboardShell area="me">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-xl font-black text-blue-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Profile photo"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              (accountProfile?.name || accountProfile?.email || "U").slice(0, 1)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              Seeker dashboard
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              지원 준비 상태와 행정 요청을 관리합니다
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              프로필 완성도, 지원 내역, 행정 요청 현황을 실제 계정 데이터
              기준으로 확인합니다.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-blue-950">
                지원 준비도 {applicationCompletion.completedCount}/
                {applicationCompletion.totalCount}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
                프로필과 이력서를 채우면 공고 상세에서 바로 지원할 수 있습니다.
              </p>
            </div>
            <Link
              className={cn(buttonVariants({ className: "w-full sm:w-auto" }))}
              href={applicationCompletion.isComplete ? "/jobs?profile_fit=eligible" : "/me/profile"}
            >
              {applicationCompletion.isComplete ? "지원 가능 공고 보기" : "준비 시작"}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {nextSteps.map((step) => (
              <Link
                className={cn(
                  "rounded-xl border p-3 transition",
                  step.complete
                    ? "border-emerald-100 bg-white/80"
                    : "border-blue-100 bg-white hover:bg-blue-50",
                )}
                href={step.href}
                key={step.label}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900">{step.label}</p>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-black",
                      step.complete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {step.complete ? "완료" : "필요"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                  {step.note}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={card.label}
            >
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-black">{card.value}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {card.note}
              </p>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
