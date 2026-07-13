"use server";

import { revalidatePath } from "next/cache";

import {
  allowedCompanyRegistrationDocumentTypes,
  companyRegistrationDocumentsBucket,
  getCompanyRegistrationDocumentExtension,
  maxCompanyRegistrationDocumentSize,
} from "@/lib/company-documents";
import { normalizeNotificationEmail } from "@/lib/notifications/recipients";
import { createClient } from "@/lib/supabase/server";

type CompanyState = {
  error?: string;
  message?: string;
};

function getCompanyDocumentFile(formData: FormData) {
  const value = formData.get("business_registration_document");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

export async function createCompanyAction(
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
  const businessNumber = String(formData.get("business_number") ?? "").trim();
  const businessRegistrationDocument = getCompanyDocumentFile(formData);
  const notificationEmail = normalizeNotificationEmail(
    String(formData.get("notification_email") ?? ""),
  );

  if (!name) {
    return { error: "기업명은 필수입니다." };
  }

  if (!businessNumber || !businessRegistrationDocument) {
    return { error: "사업자등록번호와 사업자등록증은 필수입니다." };
  }

  if (notificationEmail === null) {
    return { error: "알림 이메일 형식을 확인해주세요." };
  }

  if (
    !allowedCompanyRegistrationDocumentTypes.includes(
      businessRegistrationDocument.type,
    )
  ) {
    return {
      error: "사업자등록증은 PDF, JPG, JPEG, PNG 파일만 업로드할 수 있습니다.",
    };
  }

  if (businessRegistrationDocument.size > maxCompanyRegistrationDocumentSize) {
    return { error: "사업자등록증은 5MB 이하로 업로드해주세요." };
  }

  const documentPath = `${user.id}/${crypto.randomUUID()}/business-registration.${getCompanyRegistrationDocumentExtension(businessRegistrationDocument)}`;
  const { error: uploadError } = await supabase.storage
    .from(companyRegistrationDocumentsBucket)
    .upload(documentPath, businessRegistrationDocument, {
      contentType: businessRegistrationDocument.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase.from("companies").insert({
    owner_id: user.id,
    name,
    business_number: businessNumber,
    business_registration_path: documentPath,
    industry: String(formData.get("industry") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    email_notifications_enabled:
      formData.get("email_notifications_enabled") === "on",
    manager_name: String(formData.get("manager_name") ?? "").trim(),
    manager_phone: String(formData.get("manager_phone") ?? "").trim(),
    notification_email: notificationEmail || user.email,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/company");
  revalidatePath("/company/settings");
  revalidatePath("/company/jobs");

  return { message: "회사/지점 정보가 추가되었습니다." };
}
