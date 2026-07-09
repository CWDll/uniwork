import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProfilePhotoUploader } from "@/components/profile/profile-photo-uploader";
import { SeekerProfileForm } from "@/components/profile/seeker-profile-form";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { createClient } from "@/lib/supabase/server";

export default async function SeekerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/profile");
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

  return (
    <DashboardShell area="me">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Seeker profile
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          비자와 근무 가능 조건을 입력합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          D-2/D-4 유학생을 중심으로 지원 가능성을 판단하기 위한 기본 정보를
          저장합니다. 외국인등록번호나 여권번호 원본은 받지 않습니다.
        </p>
      </div>

      <div className="grid gap-5">
        <ProfilePhotoUploader avatarUrl={avatarUrl} userId={user.id} />
        <SeekerProfileForm
          accountEmail={accountProfile?.email ?? user.email ?? ""}
          emailNotificationsEnabled={
            accountProfile?.email_notifications_enabled ?? true
          }
          notificationEmail={accountProfile?.notification_email ?? ""}
          profile={profile}
        />
      </div>
    </DashboardShell>
  );
}
