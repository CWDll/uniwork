"use server";

import { revalidatePath } from "next/cache";

import {
  adminRequestFilesBucket,
  getAdminRequestFileExtension,
  getAdminRequestFiles,
  getAdminRequestFileValidationError,
} from "@/lib/admin-request-files";
import { getLocale, type Locale } from "@/lib/i18n";
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
  const locale = getLocale(compact(formData.get("locale")));
  const copy = actionCopy[locale];
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: copy.loginRequired };
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
    return { error: copy.typeRequired };
  }

  if (fileValidationError) {
    return { error: fileValidationError };
  }

  if (!currentVisaType || !alienRegistrationStatus || !school || !contactEmail) {
    return {
      error: copy.requiredFields,
    };
  }

  if (!contactEmail.includes("@")) {
    return { error: copy.invalidEmail };
  }

  if (!handoffConsent) {
    return { error: copy.consentRequired };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seeker") {
    return { error: copy.seekerOnly };
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

  return { message: copy.requestSubmitted };
}

export async function createAdminRequestSupplementAction(
  _prevState: AdminRequestState,
  formData: FormData,
): Promise<AdminRequestState> {
  const supabase = await createClient();
  const locale = getLocale(compact(formData.get("locale")));
  const copy = actionCopy[locale];
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: copy.loginRequired };
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
    return { error: copy.supplementRequestRequired };
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
    return { error: copy.supplementRequired };
  }

  if (contactEmail && !contactEmail.includes("@")) {
    return { error: copy.invalidEmail };
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
    return { error: copy.supplementNotFound };
  }

  if (request.status === "completed" || request.status === "rejected") {
    return { error: copy.supplementClosed };
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

  return { message: copy.supplementSubmitted };
}

const actionCopy = {
  en: {
    consentRequired: "Please agree to operator review and possible external specialist handoff.",
    invalidEmail: "Please check the contact email format.",
    loginRequired: "Please log in first.",
    requestSubmitted: "Your administrative request has been submitted.",
    requiredFields:
      "Current visa status, alien registration status, school/institution, and contact email are required.",
    seekerOnly: "Only seeker accounts can create administrative requests.",
    supplementClosed: "Completed or rejected requests cannot receive more supplement details.",
    supplementNotFound: "We could not find a request you can supplement.",
    supplementRequestRequired: "Please check which administrative request you are supplementing.",
    supplementRequired:
      "Please enter at least one supplement detail, prepared document, or attached file.",
    supplementSubmitted: "Your supplement has been submitted.",
    typeRequired: "Please select a request type.",
  },
  ko: {
    consentRequired: "운영자 검토 및 외부 행정사 전달 동의가 필요합니다.",
    invalidEmail: "연락 이메일 형식을 확인해주세요.",
    loginRequired: "로그인이 필요합니다.",
    requestSubmitted: "행정 요청이 접수되었습니다.",
    requiredFields: "현재 체류자격, 외국인등록 상태, 학교/기관, 연락 이메일은 필수입니다.",
    seekerOnly: "구직자 계정으로만 행정 요청을 생성할 수 있습니다.",
    supplementClosed: "완료 또는 반려된 요청은 보완 내용을 추가할 수 없습니다.",
    supplementNotFound: "보완할 수 있는 행정 요청을 찾지 못했습니다.",
    supplementRequestRequired: "보완할 행정 요청을 확인해주세요.",
    supplementRequired: "보완 내용, 준비된 서류, 첨부 파일 중 하나 이상을 입력해주세요.",
    supplementSubmitted: "보완 내용이 제출되었습니다.",
    typeRequired: "요청 유형을 선택해주세요.",
  },
} satisfies Record<Locale, Record<string, string>>;

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
