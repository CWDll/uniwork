"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type JobState = {
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

function getJobFormValues(formData: FormData) {
  return {
    category: getAllowedValue(formData.get("category"), allowedCategories),
    closedAt: String(formData.get("closed_at") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    employmentType: getAllowedValue(
      formData.get("employment_type"),
      allowedEmploymentTypes,
    ),
    enDescription: String(formData.get("en_description") ?? "").trim(),
    enKoreanRequirement: String(
      formData.get("en_korean_requirement") ?? "",
    ).trim(),
    enLocation: String(formData.get("en_location") ?? "").trim(),
    enTitle: String(formData.get("en_title") ?? "").trim(),
    enVisaSupportType: String(formData.get("en_visa_support_type") ?? "").trim(),
    koreanRequirement: getAllowedValue(
      formData.get("korean_requirement"),
      allowedKoreanRequirements,
    ),
    location: String(formData.get("location") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    visaSupportType: getAllowedValue(
      formData.get("visa_support_type"),
      allowedVisaSupportTypes,
    ),
    wageAmount: String(formData.get("wage_amount") ?? "").trim(),
    wageType: getAllowedValue(formData.get("wage_type"), allowedWageTypes),
  };
}

function validateJobForm(values: ReturnType<typeof getJobFormValues>) {
  if (!values.title || !values.location || !values.description) {
    return { error: "공고 제목, 근무지, 설명은 필수입니다." };
  }

  if (
    !values.employmentType ||
    !values.category ||
    !values.wageType ||
    !values.visaSupportType ||
    !values.koreanRequirement
  ) {
    return { error: "근무형태, 카테고리, 급여, 비자, 한국어 조건을 선택해주세요." };
  }

  if (values.title.length < 4) {
    return { error: "공고 제목은 최소 4자 이상 입력해주세요." };
  }

  if (values.description.length < 60) {
    return {
      error:
        "공고 설명은 업무, 근무시간, 유의사항을 포함해 최소 60자 이상 입력해주세요.",
    };
  }

  const hasEnglishTranslation = Boolean(
    values.enTitle ||
      values.enLocation ||
      values.enDescription ||
      values.enVisaSupportType ||
      values.enKoreanRequirement,
  );

  if (hasEnglishTranslation && !values.enTitle) {
    return { error: "영문 번역을 입력할 때는 영문 공고 제목을 함께 입력해주세요." };
  }

  if (values.enDescription && values.enDescription.length < 60) {
    return { error: "영문 공고 설명은 60자 이상 입력하거나 비워주세요." };
  }

  const wageAmount = values.wageAmount ? Number(values.wageAmount) : null;
  const closedAt = values.closedAt ? new Date(values.closedAt) : null;

  if (wageAmount !== null && (!Number.isFinite(wageAmount) || wageAmount < 0)) {
    return { error: "급여 금액은 0 이상의 숫자로 입력해주세요." };
  }

  if (closedAt && Number.isNaN(closedAt.getTime())) {
    return { error: "공고 마감일시를 확인해주세요." };
  }

  if (closedAt && closedAt.getTime() <= Date.now()) {
    return { error: "공고 마감일시는 현재 이후로 입력해주세요." };
  }

  return {
    closedAt,
    hasEnglishTranslation,
    wageAmount,
  };
}

async function saveEnglishTranslation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  values: ReturnType<typeof getJobFormValues>,
  hasEnglishTranslation: boolean,
) {
  if (!hasEnglishTranslation) {
    return supabase
      .from("job_translations")
      .delete()
      .eq("job_id", jobId)
      .eq("locale", "en");
  }

  return supabase.from("job_translations").upsert(
    {
      description: values.enDescription || null,
      job_id: jobId,
      korean_requirement: values.enKoreanRequirement || null,
      locale: "en",
      location: values.enLocation || null,
      title: values.enTitle,
      visa_support_type: values.enVisaSupportType || null,
    },
    { onConflict: "job_id,locale" },
  );
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

  const values = getJobFormValues(formData);
  const validation = validateJobForm(values);

  if ("error" in validation) {
    return validation;
  }

  const { data: createdJob, error } = await supabase
    .from("jobs")
    .insert({
      company_id: company.id,
      title: values.title,
      description: values.description,
      employment_type: values.employmentType,
      category: values.category,
      location: values.location,
      wage_type: values.wageType,
      wage_amount: validation.wageAmount,
      visa_support_type: values.visaSupportType,
      korean_requirement: values.koreanRequirement,
      closed_at: validation.closedAt ? validation.closedAt.toISOString() : null,
      published_at: new Date().toISOString(),
      status: "published",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (createdJob?.id) {
    const { error: translationError } = await saveEnglishTranslation(
      supabase,
      createdJob.id,
      values,
      validation.hasEnglishTranslation,
    );

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

export async function updateCompanyJobAction(
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

  const jobId = String(formData.get("job_id") ?? "").trim();

  if (!jobId) {
    return { error: "수정할 공고를 찾을 수 없습니다." };
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, company_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return { error: "수정할 공고를 찾을 수 없습니다." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, verification_status")
    .eq("owner_id", user.id)
    .eq("id", job.company_id)
    .maybeSingle();

  if (!company) {
    return { error: "이 공고를 수정할 권한이 없습니다." };
  }

  if (company.verification_status !== "verified") {
    return { error: "운영자 인증이 완료된 회사/지점의 공고만 수정할 수 있습니다." };
  }

  const values = getJobFormValues(formData);
  const validation = validateJobForm(values);

  if ("error" in validation) {
    return validation;
  }

  const { error } = await supabase
    .from("jobs")
    .update({
      category: values.category,
      closed_at: validation.closedAt ? validation.closedAt.toISOString() : null,
      description: values.description,
      employment_type: values.employmentType,
      korean_requirement: values.koreanRequirement,
      location: values.location,
      title: values.title,
      updated_at: new Date().toISOString(),
      visa_support_type: values.visaSupportType,
      wage_amount: validation.wageAmount,
      wage_type: values.wageType,
    })
    .eq("id", job.id);

  if (error) {
    return { error: error.message };
  }

  const { error: translationError } = await saveEnglishTranslation(
    supabase,
    job.id,
    values,
    validation.hasEnglishTranslation,
  );

  if (translationError) {
    return { error: `영문 번역 저장에 실패했습니다: ${translationError.message}` };
  }

  revalidatePath("/company");
  revalidatePath("/company/jobs");
  revalidatePath(`/company/jobs/${job.id}/edit`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.id}`);
  revalidatePath("/en/jobs");
  revalidatePath(`/en/jobs/${job.id}`);

  return {
    message: "채용공고가 수정되었습니다.",
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
  revalidatePath("/en/jobs");
  revalidatePath(`/en/jobs/${job.id}`);
}
