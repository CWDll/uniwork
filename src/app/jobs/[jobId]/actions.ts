"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getApplicationCompletion } from "@/lib/applications/completeness";
import {
  createProfileSnapshot,
  createResumeSnapshot,
} from "@/lib/applications/snapshot";
import { getJobEligibility } from "@/lib/jobs/eligibility";
import { createClient } from "@/lib/supabase/server";

type ApplyState = {
  error?: string;
};

export async function applyToJobAction(
  _prevState: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    return { error: "공고 정보를 찾을 수 없습니다." };
  }

  if (!user) {
    redirect(`/login?next=/jobs/${jobId}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seeker") {
    return { error: "구직자 계정으로만 지원할 수 있습니다." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, visa_support_type")
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle();

  if (!job) {
    return { error: "지원 가능한 공개 공고를 찾을 수 없습니다." };
  }

  const { data: seekerProfile } = await supabase
    .from("seeker_profiles")
    .select(
      "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: visaRule } = seekerProfile?.visa_type
    ? await supabase
        .from("visa_eligibility_rules")
        .select("visa_type, can_apply, needs_review, blocked_reason")
        .eq("visa_type", seekerProfile.visa_type)
        .maybeSingle()
    : { data: null };
  const eligibility = getJobEligibility({
    isSignedIn: true,
    jobVisaSupportType: job.visa_support_type,
    rule: visaRule,
    visaType: seekerProfile?.visa_type,
  });

  if (!eligibility.canApply) {
    return { error: eligibility.description };
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, title, intro, education, experience, languages")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const completion = getApplicationCompletion({
    profile: seekerProfile,
    resume,
  });

  if (!completion.isComplete || !resume?.id) {
    return {
      error: `지원 전 정보를 보완해주세요: ${completion.missing.slice(0, 4).join(", ")}`,
    };
  }

  const message = String(formData.get("message") ?? "").trim();
  const { error } = await supabase.from("job_applications").insert({
    job_id: job.id,
    profile_snapshot: createProfileSnapshot(seekerProfile),
    resume_id: resume.id,
    resume_snapshot: createResumeSnapshot(resume),
    seeker_id: user.id,
    message,
    status: "submitted",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 지원한 공고입니다." };
    }

    return { error: error.message };
  }

  revalidatePath("/me/applications");
  revalidatePath(`/jobs/${job.id}`);
  revalidatePath("/company/applications");

  redirect(`/me/applications?applied=${job.id}`);
}
