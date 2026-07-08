"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type ProfileState = {
  error?: string;
  message?: string;
};

function toArray(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

  const visaType = String(formData.get("visa_type") ?? "");
  const school = String(formData.get("school") ?? "").trim();

  if (!visaType || !school) {
    return { error: "비자 유형과 학교명은 필수입니다." };
  }

  const { error } = await supabase.from("seeker_profiles").upsert({
    user_id: user.id,
    nationality: String(formData.get("nationality") ?? "").trim(),
    visa_type: visaType,
    visa_review_status: getVisaReviewStatus(visaType),
    alien_registration_status: String(
      formData.get("alien_registration_status") ?? "",
    ),
    school,
    major: String(formData.get("major") ?? "").trim(),
    korean_level: String(formData.get("korean_level") ?? ""),
    english_level: String(formData.get("english_level") ?? ""),
    preferred_locations: toArray(formData.get("preferred_locations")),
    preferred_job_types: toArray(formData.get("preferred_job_types")),
    available_times: {
      weekday: String(formData.get("weekday_availability") ?? "").trim(),
      weekend: String(formData.get("weekend_availability") ?? "").trim(),
    },
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/me/profile");
  revalidatePath("/me");

  return { message: "프로필이 저장되었습니다." };
}
