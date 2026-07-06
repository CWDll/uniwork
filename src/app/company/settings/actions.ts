"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type CompanyState = {
  error?: string;
  message?: string;
};

export async function saveCompanyAction(
  _prevState: CompanyState,
  formData: FormData,
): Promise<CompanyState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "로그인이 필요합니다." };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "기업명은 필수입니다." };
  }

  const payload = {
    owner_id: user.id,
    name,
    business_number: String(formData.get("business_number") ?? "").trim(),
    industry: String(formData.get("industry") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    manager_name: String(formData.get("manager_name") ?? "").trim(),
    manager_phone: String(formData.get("manager_phone") ?? "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("companies")
    .upsert(payload, { onConflict: "owner_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/company");
  revalidatePath("/company/settings");
  revalidatePath("/company/jobs");

  return { message: "기업 정보가 저장되었습니다." };
}
