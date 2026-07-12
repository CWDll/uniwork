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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const requestId = String(formData.get("request_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const partnerId = String(formData.get("assigned_partner_id") ?? "").trim();
  const seekerFollowupNote = String(
    formData.get("seeker_followup_note") ?? "",
  ).trim();
  const internalNote = String(formData.get("internal_note") ?? "").trim();
  const handoffStatus = String(formData.get("handoff_status") ?? "").trim();
  const handoffHoldReason = String(
    formData.get("handoff_hold_reason") ?? "",
  ).trim();

  const allowedStatuses = [
    "received",
    "reviewing",
    "partner_needed",
    "assigned",
    "completed",
    "rejected",
  ];
  const allowedHandoffStatuses = ["not_ready", "ready", "handed_off", "paused"];

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  if (!requestId || !allowedStatuses.includes(status)) {
    return { error: "요청 상태를 확인해주세요." };
  }

  if (!allowedHandoffStatuses.includes(handoffStatus)) {
    return { error: "전달 상태를 확인해주세요." };
  }

  const { error } = await supabase
    .from("admin_requests")
    .update({
      assigned_partner_id: partnerId || null,
      status,
      memo,
      seeker_followup_note: seekerFollowupNote,
      seeker_followup_requested_at: seekerFollowupNote
        ? new Date().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    return { error: error.message };
  }

  const { error: reviewError } = await supabase
    .from("admin_request_reviews")
    .upsert({
      handoff_hold_reason: handoffHoldReason,
      handoff_status: handoffStatus,
      internal_note: internalNote,
      request_id: requestId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (reviewError) {
    return { error: reviewError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath(`/admin/admin-requests/${requestId}/handoff`);
  revalidatePath("/me/admin-requests");

  return { message: "행정 요청이 업데이트되었습니다." };
}
