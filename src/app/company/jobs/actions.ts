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
    .select("id")
    .eq("owner_id", user.id)
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return { error: "선택한 회사/지점을 찾을 수 없습니다." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
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

  if (description.length < 20) {
    return { error: "공고 설명은 최소 20자 이상 입력해주세요." };
  }

  const rawWageAmount = String(formData.get("wage_amount") ?? "").trim();
  const wageAmount = rawWageAmount ? Number(rawWageAmount) : null;

  if (wageAmount !== null && (!Number.isFinite(wageAmount) || wageAmount < 0)) {
    return { error: "급여 금액은 0 이상의 숫자로 입력해주세요." };
  }

  const { error } = await supabase.from("jobs").insert({
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
    status: "draft",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/company");
  revalidatePath("/company/jobs");

  return {
    message: "채용공고 초안이 생성되었습니다.",
    successKey: new Date().toISOString(),
  };
}
