"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type JobState = {
  error?: string;
  message?: string;
};

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
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !description) {
    return { error: "공고 제목과 설명은 필수입니다." };
  }

  const wageAmount = Number(formData.get("wage_amount") ?? 0);

  const { error } = await supabase.from("jobs").insert({
    company_id: company.id,
    title,
    description,
    employment_type: String(formData.get("employment_type") ?? ""),
    category: String(formData.get("category") ?? ""),
    location: String(formData.get("location") ?? ""),
    wage_type: String(formData.get("wage_type") ?? "hourly"),
    wage_amount: Number.isFinite(wageAmount) ? wageAmount : null,
    visa_support_type: String(formData.get("visa_support_type") ?? ""),
    korean_requirement: String(formData.get("korean_requirement") ?? ""),
    status: "draft",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/company");
  revalidatePath("/company/jobs");

  return { message: "채용공고 초안이 생성되었습니다." };
}
