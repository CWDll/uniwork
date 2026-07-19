import { redirect } from "next/navigation";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProfilePhotoUploader } from "@/components/profile/profile-photo-uploader";
import { SeekerProfileForm } from "@/components/profile/seeker-profile-form";
import { buttonVariants } from "@/components/ui/button";
import { getProfileCompletion } from "@/lib/applications/completeness";
import { translateCompletionLabel } from "@/lib/applications/completion-labels";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const profilePageCopy = {
  en: {
    complete: "Ready to apply",
    completion: "Profile readiness",
    description:
      "Save the basic information used to check job eligibility for D-2/D-4 students. Uniwork does not collect original alien registration numbers or passport numbers.",
    incomplete: "Needs update",
    jobs: "View eligible jobs",
    note: "This information is used for job eligibility checks and the submission snapshot.",
    resume: "Check resume",
    title: "Enter your visa and work availability",
  },
  ko: {
    complete: "지원 준비 완료",
    completion: "지원 프로필 완성도",
    description:
      "D-2/D-4 유학생을 중심으로 지원 가능성을 판단하기 위한 기본 정보를 저장합니다. 외국인등록번호나 여권번호 원본은 받지 않습니다.",
    incomplete: "보완 필요",
    jobs: "지원 가능한 공고 보기",
    note: "이 정보는 공고 지원 가능성 판단과 지원 시점 제출본에 사용됩니다.",
    resume: "이력서 확인",
    title: "비자와 근무 가능 조건을 입력합니다",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function SeekerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = profilePageCopy[locale];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(getLocalizedPath("/login?next=/me/profile", locale));
  }

  const { data: profile } = await supabase
    .from("seeker_profiles")
    .select(
      "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: accountProfile } = await supabase
    .from("profiles")
    .select("avatar_path, email, notification_email, email_notifications_enabled")
    .eq("id", user.id)
    .maybeSingle();
  const avatarUrl = getProfilePhotoUrl(supabase, accountProfile?.avatar_path);
  const completion = getProfileCompletion(profile);

  return (
    <DashboardShell area="me" locale={locale}>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Seeker profile
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {t.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          {t.description}
        </p>
      </div>

      <div className="grid gap-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
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
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                href={getLocalizedPath("/jobs?profile_fit=eligible", locale)}
              >
                {t.jobs}
              </Link>
              <Link
                className={cn(buttonVariants({ size: "sm" }))}
                href={getLocalizedPath("/me/resume", locale)}
              >
                {t.resume}
              </Link>
            </div>
          )}
        </section>
        <ProfilePhotoUploader avatarUrl={avatarUrl} locale={locale} userId={user.id} />
        <SeekerProfileForm
          accountEmail={accountProfile?.email ?? user.email ?? ""}
          emailNotificationsEnabled={
            accountProfile?.email_notifications_enabled ?? true
          }
          notificationEmail={accountProfile?.notification_email ?? ""}
          locale={locale}
          profile={profile}
        />
      </div>
    </DashboardShell>
  );
}
