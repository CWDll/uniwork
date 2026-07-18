"use server";

import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/admin-auth";

type AdminRequestUpdateState = {
  error?: string;
  message?: string;
};

export async function updateAdminRequestAction(
  _prevState: AdminRequestUpdateState,
  formData: FormData,
): Promise<AdminRequestUpdateState> {
  const adminContext = await getAdminContext();
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
  const handoffRecipientEmail = String(
    formData.get("handoff_recipient_email") ?? "",
  ).trim();
  const handoffChannel = String(formData.get("handoff_channel") ?? "").trim();
  const handoffNote = String(formData.get("handoff_note") ?? "").trim();
  const shouldMarkHandoffSent = formData.get("mark_handoff_sent") === "on";

  const allowedStatuses = [
    "received",
    "reviewing",
    "partner_needed",
    "assigned",
    "completed",
    "rejected",
  ];
  const allowedHandoffStatuses = ["not_ready", "ready", "handed_off", "paused"];
  const allowedHandoffChannels = ["manual", "email", "phone", "kakao", "other"];

  if (!adminContext) {
    return { error: "관리자 권한이 필요합니다." };
  }

  if (!requestId || !allowedStatuses.includes(status)) {
    return { error: "요청 상태를 확인해주세요." };
  }

  if (!allowedHandoffStatuses.includes(handoffStatus)) {
    return { error: "전달 상태를 확인해주세요." };
  }

  if (!allowedHandoffChannels.includes(handoffChannel)) {
    return { error: "전달 채널을 확인해주세요." };
  }

  if (handoffRecipientEmail && !handoffRecipientEmail.includes("@")) {
    return { error: "행정사/외부 담당자 이메일 형식을 확인해주세요." };
  }

  const { supabase, user } = adminContext;
  const [{ data: currentRequest }, { data: currentReview }] = await Promise.all([
    supabase
      .from("admin_requests")
      .select("seeker_followup_note")
      .eq("id", requestId)
      .maybeSingle(),
    supabase
      .from("admin_request_reviews")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle(),
  ]);
  const followupNoteChanged =
    (currentRequest?.seeker_followup_note ?? "") !== seekerFollowupNote;
  const now = new Date().toISOString();
  const nextHandoffSentAt =
    shouldMarkHandoffSent && !currentReview?.handoff_sent_at
      ? now
      : currentReview?.handoff_sent_at ?? null;
  const nextHandoffSentBy =
    shouldMarkHandoffSent && !currentReview?.handoff_sent_by
      ? user.id
      : currentReview?.handoff_sent_by ?? null;

  const requestUpdate: {
    assigned_partner_id: string | null;
    memo: string;
    seeker_followup_note: string;
    seeker_followup_requested_at?: string | null;
    status: string;
    updated_at: string;
  } = {
    assigned_partner_id: partnerId || null,
    memo,
    seeker_followup_note: seekerFollowupNote,
    status,
    updated_at: now,
  };

  if (!seekerFollowupNote) {
    requestUpdate.seeker_followup_requested_at = null;
  } else if (followupNoteChanged) {
    requestUpdate.seeker_followup_requested_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("admin_requests")
    .update(requestUpdate)
    .eq("id", requestId);

  if (error) {
    return { error: error.message };
  }

  const { error: reviewError } = await supabase
    .from("admin_request_reviews")
    .upsert({
      handoff_hold_reason: handoffHoldReason,
      handoff_channel: handoffChannel,
      handoff_note: handoffNote,
      handoff_recipient_email: handoffRecipientEmail,
      handoff_sent_at: nextHandoffSentAt,
      handoff_sent_by: nextHandoffSentBy,
      handoff_status: handoffStatus,
      internal_note: internalNote,
      request_id: requestId,
      reviewed_at: now,
      reviewed_by: user.id,
      updated_at: now,
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

export async function markAdminRequestSupplementsCheckedAction(formData: FormData) {
  const adminContext = await getAdminContext();
  const requestId = String(formData.get("request_id") ?? "").trim();

  if (!adminContext || !requestId) {
    return;
  }

  const now = new Date().toISOString();
  const { supabase, user } = adminContext;
  const { error } = await supabase
    .from("admin_request_reviews")
    .upsert({
      request_id: requestId,
      reviewed_at: now,
      reviewed_by: user.id,
      supplement_checked_at: now,
      supplement_checked_by: user.id,
      updated_at: now,
    });

  if (error) {
    return;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath(`/admin/admin-requests/${requestId}/handoff`);
}
