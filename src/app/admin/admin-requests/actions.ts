"use server";

import { revalidatePath } from "next/cache";

import { adminRequestFilesBucket } from "@/lib/admin-request-files";
import { getAdminContext } from "@/lib/admin-auth";
import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import { renderAdminRequestHandoffEmail } from "@/lib/email/templates";

type AdminRequestUpdateState = {
  error?: string;
  message?: string;
};

const maxHandoffEmailAttachmentBytes = 18 * 1024 * 1024;

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

export async function sendAdminRequestHandoffEmailAction(
  _prevState: AdminRequestUpdateState,
  formData: FormData,
): Promise<AdminRequestUpdateState> {
  const adminContext = await getAdminContext();
  const requestId = String(formData.get("request_id") ?? "").trim();

  if (!adminContext) {
    return { error: "관리자 권한이 필요합니다." };
  }

  if (!requestId) {
    return { error: "행정 요청을 확인해주세요." };
  }

  if (!isEmailConfigured()) {
    return {
      message:
        "이메일 발송은 아직 비활성 상태입니다. Resend 발신 도메인과 EMAIL_FROM 설정 후 사용할 수 있습니다.",
    };
  }

  const { supabase, user } = adminContext;
  const { data: request } = await supabase
    .from("admin_requests")
    .select(
      "id, seeker_id, type, status, memo, request_details, contact_snapshot",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return { error: "행정 요청을 찾을 수 없습니다." };
  }

  if (request.status === "completed" || request.status === "rejected") {
    return { error: "완료 또는 반려된 요청은 이메일로 전달할 수 없습니다." };
  }

  const [{ data: profile }, { data: seekerProfile }, { data: review }, { data: files }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, phone")
        .eq("id", request.seeker_id)
        .maybeSingle(),
      supabase
        .from("seeker_profiles")
        .select("user_id, school, visa_type")
        .eq("user_id", request.seeker_id)
        .maybeSingle(),
      supabase
        .from("admin_request_reviews")
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle(),
      supabase
        .from("admin_request_files")
        .select("id, storage_path, original_name, mime_type, size_bytes")
        .eq("request_id", requestId)
        .order("uploaded_at", { ascending: true }),
    ]);

  const recipient = review?.handoff_recipient_email?.trim();

  if (!recipient || !recipient.includes("@")) {
    return {
      error:
        "행정사/외부 담당자 이메일을 먼저 저장한 뒤 이메일 발송을 시도해주세요.",
    };
  }

  const totalAttachmentBytes = (files ?? []).reduce(
    (total, file) => total + (file.size_bytes ?? 0),
    0,
  );

  if (totalAttachmentBytes > maxHandoffEmailAttachmentBytes) {
    return {
      error:
        "첨부 파일 용량이 커서 이메일 발송 대신 파일 묶음 다운로드 후 수동 전달해주세요.",
    };
  }

  const attachments = [];

  for (const file of files ?? []) {
    const { data, error } = await supabase.storage
      .from(adminRequestFilesBucket)
      .download(file.storage_path);

    if (error) {
      return { error: `${file.original_name} 파일을 가져오지 못했습니다.` };
    }

    attachments.push({
      content: Buffer.from(await data.arrayBuffer()).toString("base64"),
      filename: sanitizeAttachmentFilename(file.original_name),
    });
  }

  const details = parseRecord(request.request_details);
  const contact = parseRecord(request.contact_snapshot);
  const now = new Date().toISOString();

  try {
    await sendEmail({
      attachments,
      to: recipient,
      ...renderAdminRequestHandoffEmail({
        adminNote: review?.internal_note,
        contactEmail:
          getString(contact.email) || profile?.email || undefined,
        contactPhone:
          getString(contact.phone) || profile?.phone || undefined,
        files: (files ?? []).map((file) => ({
          name: file.original_name,
          size: formatFileSize(file.size_bytes),
        })),
        handoffNote: review?.handoff_note,
        requestId: request.id,
        requestMemo: request.memo,
        requestType: request.type,
        school: getString(details.school) || seekerProfile?.school,
        seekerName: profile?.name || profile?.email,
        visaType: getString(details.current_visa_type) || seekerProfile?.visa_type,
      }),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "이메일 발송 중 오류가 발생했습니다.",
    };
  }

  const { error: reviewUpdateError } = await supabase
    .from("admin_request_reviews")
    .update({
    handoff_channel: "email",
    handoff_recipient_email: recipient,
    handoff_sent_at: review?.handoff_sent_at ?? now,
    handoff_sent_by: review?.handoff_sent_by ?? user.id,
    handoff_status: "handed_off",
    reviewed_at: now,
    reviewed_by: user.id,
    updated_at: now,
    })
    .eq("request_id", requestId);

  if (reviewUpdateError) {
    return { error: reviewUpdateError.message };
  }

  await supabase
    .from("admin_requests")
    .update({ status: "assigned" })
    .eq("id", requestId);

  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath(`/admin/admin-requests/${requestId}/handoff`);

  return { message: "행정사/외부 담당자에게 이메일을 발송했습니다." };
}

function parseRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ko-KR")}KB`;
}

function sanitizeAttachmentFilename(value: string) {
  return value.replace(/[\r\n"]/g, "").trim() || "admin-request-file";
}
