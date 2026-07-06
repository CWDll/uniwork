"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type AdminRequestState = {
  error?: string;
  message?: string;
};

export async function createAdminRequestAction(
  _prevState: AdminRequestState,
  formData: FormData,
): Promise<AdminRequestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const type = String(formData.get("type") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!type) {
    return { error: "요청 유형을 선택해주세요." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seeker") {
    return { error: "구직자 계정으로만 행정 요청을 생성할 수 있습니다." };
  }

  const { data: consent, error: consentError } = await supabase
    .from("consents")
    .insert({
      user_id: user.id,
      purpose: "administrative_request_review",
      data_scope: {
        profile: true,
        visa: true,
        applications: false,
      },
      recipient_type: "operator_and_assigned_partner",
      status: "agreed",
    })
    .select("id")
    .single();

  if (consentError) {
    return { error: consentError.message };
  }

  const { error } = await supabase.from("admin_requests").insert({
    seeker_id: user.id,
    type,
    consent_id: consent.id,
    memo,
    status: "received",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/me/admin-requests");
  revalidatePath("/admin/admin-requests");

  return { message: "행정 요청이 접수되었습니다." };
}
