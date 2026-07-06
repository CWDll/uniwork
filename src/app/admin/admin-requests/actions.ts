"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type AdminRequestUpdateState = {
  error?: string;
  message?: string;
};

export async function updateAdminRequestAction(
  _prevState: AdminRequestUpdateState,
  formData: FormData,
): Promise<AdminRequestUpdateState> {
  const supabase = await createClient();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const partnerId = String(formData.get("assigned_partner_id") ?? "").trim();

  const allowedStatuses = [
    "received",
    "reviewing",
    "partner_needed",
    "assigned",
    "completed",
    "rejected",
  ];

  if (!requestId || !allowedStatuses.includes(status)) {
    return { error: "요청 상태를 확인해주세요." };
  }

  const { error } = await supabase
    .from("admin_requests")
    .update({
      assigned_partner_id: partnerId || null,
      status,
      memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath("/me/admin-requests");

  return { message: "행정 요청이 업데이트되었습니다." };
}
