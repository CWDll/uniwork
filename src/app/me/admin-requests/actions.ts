"use server";

import { revalidatePath } from "next/cache";

import {
  adminRequestFilesBucket,
  getAdminRequestFileExtension,
  getAdminRequestFiles,
  getAdminRequestFileValidationError,
} from "@/lib/admin-request-files";
import { createClient } from "@/lib/supabase/server";

type AdminRequestState = {
  error?: string;
  message?: string;
};

function compact(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function toArray(values: FormDataEntryValue[]) {
  return values.map((value) => String(value).trim()).filter(Boolean);
}

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

  const type = compact(formData.get("type"));
  const memo = compact(formData.get("memo"));
  const currentVisaType = compact(formData.get("current_visa_type"));
  const alienRegistrationStatus = compact(
    formData.get("alien_registration_status"),
  );
  const school = compact(formData.get("school"));
  const major = compact(formData.get("major"));
  const targetStartDate = compact(formData.get("target_start_date"));
  const plannedWorkHours = compact(formData.get("planned_work_hours"));
  const contactEmail = compact(formData.get("contact_email"));
  const contactPhone = compact(formData.get("contact_phone"));
  const documentsReady = toArray(formData.getAll("documents_ready"));
  const requestFiles = getAdminRequestFiles(formData, "request_files");
  const missingDocumentsNote = compact(formData.get("missing_documents_note"));
  const handoffConsent = formData.get("handoff_consent") === "on";
  const fileValidationError = getAdminRequestFileValidationError(requestFiles);

  if (!type) {
    return { error: "요청 유형을 선택해주세요." };
  }

  if (fileValidationError) {
    return { error: fileValidationError };
  }

  if (!currentVisaType || !alienRegistrationStatus || !school || !contactEmail) {
    return {
      error: "현재 체류자격, 외국인등록 상태, 학교/기관, 연락 이메일은 필수입니다.",
    };
  }

  if (!contactEmail.includes("@")) {
    return { error: "연락 이메일 형식을 확인해주세요." };
  }

  if (!handoffConsent) {
    return { error: "운영자 검토 및 외부 행정사 전달 동의가 필요합니다." };
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
        contact: true,
        documents: true,
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

  const { data: request, error } = await supabase
    .from("admin_requests")
    .insert({
      consent_id: consent.id,
      contact_snapshot: {
        email: contactEmail,
        phone: contactPhone || null,
      },
      document_checklist: {
        missing_note: missingDocumentsNote || null,
        ready: documentsReady,
      },
      memo,
      request_details: {
        alien_registration_status: alienRegistrationStatus,
        current_visa_type: currentVisaType,
        handoff_consent: handoffConsent,
        major: major || null,
        planned_work_hours: plannedWorkHours || null,
        school,
        target_start_date: targetStartDate || null,
      },
      seeker_id: user.id,
      status: "received",
      type,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (requestFiles.length > 0) {
    const uploadError = await uploadAdminRequestFiles({
      files: requestFiles,
      requestId: request.id,
      seekerId: user.id,
      source: "request",
      supabase,
    });

    if (uploadError) {
      return { error: uploadError };
    }
  }

  revalidatePath("/me/admin-requests");
  revalidatePath("/admin/admin-requests");

  return { message: "행정 요청이 접수되었습니다." };
}

export async function createAdminRequestSupplementAction(
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

  const requestId = compact(formData.get("request_id"));
  const message = compact(formData.get("supplement_message"));
  const contactEmail = compact(formData.get("supplement_contact_email"));
  const contactPhone = compact(formData.get("supplement_contact_phone"));
  const documentsReady = toArray(formData.getAll("supplement_documents_ready"));
  const supplementFiles = getAdminRequestFiles(formData, "supplement_files");
  const missingDocumentsNote = compact(
    formData.get("supplement_missing_documents_note"),
  );
  const fileValidationError = getAdminRequestFileValidationError(supplementFiles);

  if (!requestId) {
    return { error: "보완할 행정 요청을 확인해주세요." };
  }

  if (fileValidationError) {
    return { error: fileValidationError };
  }

  if (
    !message &&
    documentsReady.length === 0 &&
    !missingDocumentsNote &&
    supplementFiles.length === 0
  ) {
    return { error: "보완 내용, 준비된 서류, 첨부 파일 중 하나 이상을 입력해주세요." };
  }

  if (contactEmail && !contactEmail.includes("@")) {
    return { error: "연락 이메일 형식을 확인해주세요." };
  }

  const { data: request, error: requestError } = await supabase
    .from("admin_requests")
    .select("id, seeker_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    return { error: requestError.message };
  }

  if (!request || request.seeker_id !== user.id) {
    return { error: "보완할 수 있는 행정 요청을 찾지 못했습니다." };
  }

  if (request.status === "completed" || request.status === "rejected") {
    return { error: "완료 또는 반려된 요청은 보완 내용을 추가할 수 없습니다." };
  }

  const { data: supplement, error } = await supabase
    .from("admin_request_supplements")
    .insert({
      contact_snapshot: {
        email: contactEmail || null,
        phone: contactPhone || null,
      },
      document_checklist: {
        missing_note: missingDocumentsNote || null,
        ready: documentsReady,
      },
      message,
      request_id: requestId,
      seeker_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (supplementFiles.length > 0) {
    const uploadError = await uploadAdminRequestFiles({
      files: supplementFiles,
      requestId,
      seekerId: user.id,
      source: "supplement",
      supplementId: supplement.id,
      supabase,
    });

    if (uploadError) {
      return { error: uploadError };
    }
  }

  revalidatePath("/me/admin-requests");
  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath(`/admin/admin-requests/${requestId}/handoff`);

  return { message: "보완 내용이 제출되었습니다." };
}

async function uploadAdminRequestFiles({
  files,
  requestId,
  seekerId,
  source,
  supplementId,
  supabase,
}: {
  files: File[];
  requestId: string;
  seekerId: string;
  source: "request" | "supplement";
  supplementId?: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const rows = [];

  for (const file of files) {
    const storagePath =
      source === "request"
        ? `${seekerId}/${requestId}/request/${crypto.randomUUID()}.${getAdminRequestFileExtension(file)}`
        : `${seekerId}/${requestId}/supplement/${supplementId}/${crypto.randomUUID()}.${getAdminRequestFileExtension(file)}`;

    const { error: uploadError } = await supabase.storage
      .from(adminRequestFilesBucket)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return uploadError.message;
    }

    rows.push({
      mime_type: file.type,
      original_name: file.name,
      request_id: requestId,
      seeker_id: seekerId,
      size_bytes: file.size,
      source,
      storage_path: storagePath,
      supplement_id: supplementId ?? null,
    });
  }

  const { error: insertError } = await supabase
    .from("admin_request_files")
    .insert(rows);

  return insertError?.message ?? null;
}
