"use server";

import { revalidatePath } from "next/cache";

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
  const missingDocumentsNote = compact(formData.get("missing_documents_note"));
  const handoffConsent = formData.get("handoff_consent") === "on";

  if (!type) {
    return { error: "요청 유형을 선택해주세요." };
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

  const { error } = await supabase.from("admin_requests").insert({
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
  });

  if (error) {
    return { error: error.message };
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
  const missingDocumentsNote = compact(
    formData.get("supplement_missing_documents_note"),
  );

  if (!requestId) {
    return { error: "보완할 행정 요청을 확인해주세요." };
  }

  if (!message && documentsReady.length === 0 && !missingDocumentsNote) {
    return { error: "보완 내용이나 준비된 서류를 입력해주세요." };
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

  const { error } = await supabase.from("admin_request_supplements").insert({
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
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/me/admin-requests");
  revalidatePath("/admin");
  revalidatePath("/admin/admin-requests");
  revalidatePath(`/admin/admin-requests/${requestId}/handoff`);

  return { message: "보완 내용이 제출되었습니다." };
}
