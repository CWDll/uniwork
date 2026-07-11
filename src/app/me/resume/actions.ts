"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type ResumeState = {
  error?: string;
  message?: string;
};

function compact(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseEducation(formData: FormData) {
  return [0, 1].flatMap((index) => {
    const school = compact(formData.get(`education_${index}_school`));
    const major = compact(formData.get(`education_${index}_major`));
    const period = compact(formData.get(`education_${index}_period`));

    if (!school && !major && !period) {
      return [];
    }

    return [{ major, period, school }];
  });
}

function parseExperience(formData: FormData) {
  return [0, 1, 2].flatMap((index) => {
    const company = compact(formData.get(`experience_${index}_company`));
    const role = compact(formData.get(`experience_${index}_role`));
    const period = compact(formData.get(`experience_${index}_period`));
    const description = compact(formData.get(`experience_${index}_description`));

    if (!company && !role && !period && !description) {
      return [];
    }

    return [{ company, description, period, role }];
  });
}

function parseLanguages(formData: FormData) {
  return [0, 1, 2].flatMap((index) => {
    const name = compact(formData.get(`language_${index}_name`));
    const level = compact(formData.get(`language_${index}_level`));

    if (!name && !level) {
      return [];
    }

    return [{ level, name }];
  });
}

export async function saveResumeAction(
  _prevState: ResumeState,
  formData: FormData,
): Promise<ResumeState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  const title = compact(formData.get("title")) || "Uniwork Resume";
  const intro = compact(formData.get("intro"));
  const education = parseEducation(formData);
  const experience = parseExperience(formData);
  const languages = parseLanguages(formData);

  if (intro.length < 20) {
    return { error: "자기소개는 최소 20자 이상 입력해주세요." };
  }

  if (languages.length === 0) {
    return { error: "언어 능력을 최소 1개 이상 입력해주세요." };
  }

  const { data: existing } = await supabase
    .from("resumes")
    .select("id")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    education,
    experience,
    intro,
    languages,
    seeker_id: user.id,
    title,
    updated_at: new Date().toISOString(),
    visibility: "private",
  };

  const { error } = existing?.id
    ? await supabase.from("resumes").update(payload).eq("id", existing.id)
    : await supabase.from("resumes").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/me/resume");
  revalidatePath("/me");
  revalidatePath("/jobs");
  revalidatePath("/me/applications");
  revalidatePath("/company/applications");

  return { message: "이력/소개 정보가 저장되었습니다." };
}
