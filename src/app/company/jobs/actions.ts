"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type JobState = {
  error?: string;
  message?: string;
  successKey?: string;
};

const allowedEmploymentTypes = ["Part-time", "Contract", "Internship", "Full-time"];
const allowedCategories = [
  "Cafe & Service",
  "Office",
  "Translation",
  "Marketing",
  "Education",
  "Retail",
  "Restaurant",
  "Event",
  "Other",
];
const allowedWageTypes = ["hourly", "monthly", "project"];
const allowedVisaSupportTypes = [
  "D-2/D-4",
  "D-2/D-4/F review",
  "F visa only",
  "Visa review required",
];
const allowedKoreanRequirements = [
  "No Korean required",
  "Basic conversation",
  "TOPIK 2+",
  "TOPIK 3+",
  "Business Korean",
];

function getAllowedValue(value: FormDataEntryValue | null, allowed: string[]) {
  const nextValue = String(value ?? "").trim();

  return allowed.includes(nextValue) ? nextValue : "";
}

export async function createCompanyJobAction(
  _prevState: JobState,
  formData: FormData,
): Promise<JobState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  const companyId = String(formData.get("company_id") ?? "").trim();

  if (!companyId) {
    return { error: "공고를 등록할 회사/지점을 선택해주세요." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, verification_status")
    .eq("owner_id", user.id)
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return { error: "선택한 회사/지점을 찾을 수 없습니다." };
  }

  if (company.verification_status !== "verified") {
    return { error: "운영자 인증이 완료된 회사/지점만 공고를 공개할 수 있습니다." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const enTitle = String(formData.get("en_title") ?? "").trim();
  const enLocation = String(formData.get("en_location") ?? "").trim();
  const enDescription = String(formData.get("en_description") ?? "").trim();
  const enVisaSupportType = String(formData.get("en_visa_support_type") ?? "").trim();
  const enKoreanRequirement = String(formData.get("en_korean_requirement") ?? "").trim();
  const employmentType = getAllowedValue(
    formData.get("employment_type"),
    allowedEmploymentTypes,
  );
  const category = getAllowedValue(formData.get("category"), allowedCategories);
  const wageType = getAllowedValue(formData.get("wage_type"), allowedWageTypes);
  const visaSupportType = getAllowedValue(
    formData.get("visa_support_type"),
    allowedVisaSupportTypes,
  );
  const koreanRequirement = getAllowedValue(
    formData.get("korean_requirement"),
    allowedKoreanRequirements,
  );

  if (!title || !location || !description) {
    return { error: "공고 제목, 근무지, 설명은 필수입니다." };
  }

  if (!employmentType || !category || !wageType || !visaSupportType || !koreanRequirement) {
    return { error: "근무형태, 카테고리, 급여, 비자, 한국어 조건을 선택해주세요." };
  }

  if (title.length < 4) {
    return { error: "공고 제목은 최소 4자 이상 입력해주세요." };
  }

  if (description.length < 60) {
    return { error: "공고 설명은 업무, 근무시간, 유의사항을 포함해 최소 60자 이상 입력해주세요." };
  }

  const hasEnglishTranslation = Boolean(
    enTitle || enLocation || enDescription || enVisaSupportType || enKoreanRequirement,
  );

  if (hasEnglishTranslation && !enTitle) {
    return { error: "영문 번역을 입력할 때는 영문 공고 제목을 함께 입력해주세요." };
  }

  if (enDescription && enDescription.length < 60) {
    return { error: "영문 공고 설명은 60자 이상 입력하거나 비워주세요." };
  }

  const rawWageAmount = String(formData.get("wage_amount") ?? "").trim();
  const wageAmount = rawWageAmount ? Number(rawWageAmount) : null;
  const rawClosedAt = String(formData.get("closed_at") ?? "").trim();
  const closedAt = rawClosedAt ? new Date(rawClosedAt) : null;

  if (wageAmount !== null && (!Number.isFinite(wageAmount) || wageAmount < 0)) {
    return { error: "급여 금액은 0 이상의 숫자로 입력해주세요." };
  }

  if (closedAt && Number.isNaN(closedAt.getTime())) {
    return { error: "공고 마감일시를 확인해주세요." };
  }

  if (closedAt && closedAt.getTime() <= Date.now()) {
    return { error: "공고 마감일시는 현재 이후로 입력해주세요." };
  }

  const { data: createdJob, error } = await supabase
    .from("jobs")
    .insert({
      company_id: company.id,
      title,
      description,
      employment_type: employmentType,
      category,
      location,
      wage_type: wageType,
      wage_amount: wageAmount,
      visa_support_type: visaSupportType,
      korean_requirement: koreanRequirement,
      closed_at: closedAt ? closedAt.toISOString() : null,
      published_at: new Date().toISOString(),
      status: "published",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (hasEnglishTranslation && createdJob?.id) {
    const { error: translationError } = await supabase
      .from("job_translations")
      .insert({
        description: enDescription || null,
        job_id: createdJob.id,
        korean_requirement: enKoreanRequirement || null,
        locale: "en",
        location: enLocation || null,
        title: enTitle,
        visa_support_type: enVisaSupportType || null,
      });

    if (translationError) {
      return {
        error: `공고는 등록되었지만 영문 번역 저장에 실패했습니다: ${translationError.message}`,
      };
    }
  }

  revalidatePath("/company");
  revalidatePath("/company/jobs");
  revalidatePath("/jobs");
  revalidatePath("/en/jobs");

  return {
    message: "채용공고가 공개되었습니다.",
    successKey: new Date().toISOString(),
  };
}

export async function closeCompanyJobAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!user || !jobId) {
    return;
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, company_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", job.company_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!company) {
    return;
  }

  await supabase
    .from("jobs")
    .update({
      closed_at: new Date().toISOString(),
      status: "closed",
    })
    .eq("id", job.id);

  revalidatePath("/company");
  revalidatePath("/company/jobs");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.id}`);
}
