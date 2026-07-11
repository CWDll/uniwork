"use server";

import { revalidatePath } from "next/cache";

import { normalizeNotificationEmail } from "@/lib/notifications/recipients";
import { createClient } from "@/lib/supabase/server";

type ProfileState = {
  error?: string;
  message?: string;
};

const allowedVisaTypes = ["D-2", "D-4", "F-1", "F-2", "F-3", "F-4"];
const allowedRegistrationStatuses = ["has_card", "pending", "not_yet"];
const allowedKoreanLevels = ["Beginner", "TOPIK 2", "TOPIK 3", "TOPIK 4", "TOPIK 5+"];
const allowedEnglishLevels = ["Basic", "Business", "Fluent", "Native"];

function toArray(values: FormDataEntryValue[]) {
  return values
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 8);
}

function getAllowedValue(value: FormDataEntryValue | null, allowed: string[]) {
  const nextValue = String(value ?? "").trim();

  return allowed.includes(nextValue) ? nextValue : "";
}

function getVisaReviewStatus(visaType: string) {
  if (visaType === "D-2" || visaType === "D-4" || visaType === "F-2") {
    return "needs_review";
  }

  return "blocked";
}

export async function saveSeekerProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  const visaType = getAllowedValue(formData.get("visa_type"), allowedVisaTypes);
  const nationality = String(formData.get("nationality") ?? "").trim();
  const alienRegistrationStatus = getAllowedValue(
    formData.get("alien_registration_status"),
    allowedRegistrationStatuses,
  );
  const school = String(formData.get("school") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();
  const koreanLevel = getAllowedValue(formData.get("korean_level"), allowedKoreanLevels);
  const englishLevel = getAllowedValue(formData.get("english_level"), allowedEnglishLevels);
  const preferredLocations = toArray(formData.getAll("preferred_locations"));
  const preferredJobTypes = toArray(formData.getAll("preferred_job_types"));
  const weekdayAvailability = String(
    formData.get("weekday_availability") ?? "",
  ).trim();
  const weekendAvailability = String(
    formData.get("weekend_availability") ?? "",
  ).trim();
  const notificationEmail = normalizeNotificationEmail(
    String(formData.get("notification_email") ?? ""),
  );
  const emailNotificationsEnabled =
    formData.get("email_notifications_enabled") === "on";

  if (!nationality || !visaType || !alienRegistrationStatus || !school || !major) {
    return { error: "국적, 비자, 외국인등록 상태, 학교, 전공은 필수입니다." };
  }

  if (!koreanLevel || !englishLevel) {
    return { error: "한국어와 영어 수준을 선택해주세요." };
  }

  if (preferredLocations.length === 0 || preferredJobTypes.length === 0) {
    return { error: "희망 근무 지역과 희망 직무를 최소 1개 이상 선택해주세요." };
  }

  if (!weekdayAvailability && !weekendAvailability) {
    return { error: "평일 또는 주말 근무 가능 시간을 입력해주세요." };
  }

  if (notificationEmail === null) {
    return { error: "알림 이메일 형식을 확인해주세요." };
  }

  const [{ error }, { error: profileError }] = await Promise.all([
    supabase.from("seeker_profiles").upsert({
      user_id: user.id,
      nationality,
      visa_type: visaType,
      visa_review_status: getVisaReviewStatus(visaType),
      alien_registration_status: alienRegistrationStatus,
      school,
      major,
      korean_level: koreanLevel,
      english_level: englishLevel,
      preferred_locations: preferredLocations,
      preferred_job_types: preferredJobTypes,
      available_times: {
        weekday: weekdayAvailability,
        weekend: weekendAvailability,
      },
      updated_at: new Date().toISOString(),
    }),
    supabase
      .from("profiles")
      .update({
        email_notifications_enabled: emailNotificationsEnabled,
        notification_email: notificationEmail || user.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id),
  ]);

  if (error) {
    return { error: error.message };
  }

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/me/profile");
  revalidatePath("/me");
  revalidatePath("/jobs");
  revalidatePath("/me/applications");

  return { message: "프로필이 저장되었습니다." };
}
