"use server";

import { revalidatePath } from "next/cache";

import {
  allowedCompanyRegistrationDocumentTypes,
  companyRegistrationDocumentsBucket,
  getCompanyRegistrationDocumentExtension,
  maxCompanyRegistrationDocumentSize,
} from "@/lib/company-documents";
import {
  allowedCompanyLogoTypes,
  companyLogosBucket,
  getCompanyLogoExtension,
  maxCompanyLogoSize,
} from "@/lib/company-logos";
import { normalizeNotificationEmail } from "@/lib/notifications/recipients";
import { createClient } from "@/lib/supabase/server";

type CompanyState = {
  error?: string;
  message?: string;
};

const allowedCompanyTypes = new Set([
  "corporation",
  "sole_proprietor",
  "school_institution",
  "startup",
  "other",
]);

const allowedEmployeeCountRanges = new Set([
  "1-4",
  "5-9",
  "10-49",
  "50-99",
  "100+",
]);

function getCompanyDocumentFile(formData: FormData) {
  const value = formData.get("business_registration_document");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function getCompanyLogoFile(formData: FormData) {
  const value = formData.get("company_logo");

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function getOptionalUrl(value: FormDataEntryValue | null) {
  const url = String(value ?? "").trim();

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);

    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function parseForeignEmployees(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (text === "true") {
    return true;
  }

  if (text === "false") {
    return false;
  }

  return null;
}

async function uploadCompanyLogo({
  file,
  supabase,
  userId,
}: {
  file: File;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  if (!allowedCompanyLogoTypes.includes(file.type)) {
    return {
      error: "기업 로고는 JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
      path: null,
    };
  }

  if (file.size > maxCompanyLogoSize) {
    return {
      error: "기업 로고는 5MB 이하로 업로드해주세요.",
      path: null,
    };
  }

  const logoPath = `${userId}/${crypto.randomUUID()}/logo.${getCompanyLogoExtension(file)}`;
  const { error } = await supabase.storage
    .from(companyLogosBucket)
    .upload(logoPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  return {
    error: error?.message ?? null,
    path: error ? null : logoPath,
  };
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
  const industry = String(formData.get("industry") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const managerName = String(formData.get("manager_name") ?? "").trim();
  const managerPhone = String(formData.get("manager_phone") ?? "").trim();
  const businessRegistrationDocument = getCompanyDocumentFile(formData);
  const companyLogo = getCompanyLogoFile(formData);
  const companyType = String(formData.get("company_type") ?? "").trim();
  const employeeCountRange = String(
    formData.get("employee_count_range") ?? "",
  ).trim();
  const hasForeignEmployees = parseForeignEmployees(
    formData.get("has_foreign_employees"),
  );
  const websiteUrl = getOptionalUrl(formData.get("website_url"));
  const notificationEmail = normalizeNotificationEmail(
    String(formData.get("notification_email") ?? ""),
  );

  if (
    !name ||
    !industry ||
    !address ||
    !managerName ||
    !managerPhone ||
    !companyType ||
    !employeeCountRange ||
    hasForeignEmployees === null
  ) {
    return {
      error:
        "기업명, 업종, 주소, 담당자 정보, 기업 유형, 재직 인원, 외국인 재직 여부는 필수입니다.",
    };
  }

  if (
    !allowedCompanyTypes.has(companyType) ||
    !allowedEmployeeCountRanges.has(employeeCountRange)
  ) {
    return { error: "기업 유형과 재직 인원 값을 올바르게 선택해주세요." };
  }

  if (!businessNumber || !businessRegistrationDocument) {
    return { error: "사업자등록번호와 사업자등록증은 필수입니다." };
  }

  if (notificationEmail === null) {
    return { error: "알림 이메일 형식을 확인해주세요." };
  }

  if (websiteUrl === null) {
    return { error: "웹사이트 주소는 http:// 또는 https://로 시작해야 합니다." };
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

  let logoPath: string | null = null;

  if (companyLogo) {
    const logoUpload = await uploadCompanyLogo({
      file: companyLogo,
      supabase,
      userId: user.id,
    });

    if (logoUpload.error) {
      return { error: logoUpload.error };
    }

    logoPath = logoUpload.path;
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
    company_type: companyType,
    employee_count_range: employeeCountRange,
    has_foreign_employees: hasForeignEmployees,
    industry,
    address,
    email_notifications_enabled:
      formData.get("email_notifications_enabled") === "on",
    logo_path: logoPath,
    manager_name: managerName,
    manager_phone: managerPhone,
    notification_email: notificationEmail || user.email,
    website_url: websiteUrl || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/company");
  revalidatePath("/company/settings");
  revalidatePath("/company/jobs");

  return { message: "회사/지점 정보가 추가되었습니다." };
}

export async function updateCompanyAction(
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

  const companyId = String(formData.get("company_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const businessNumber = String(formData.get("business_number") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const managerName = String(formData.get("manager_name") ?? "").trim();
  const managerPhone = String(formData.get("manager_phone") ?? "").trim();
  const businessRegistrationDocument = getCompanyDocumentFile(formData);
  const companyLogo = getCompanyLogoFile(formData);
  const companyType = String(formData.get("company_type") ?? "").trim();
  const employeeCountRange = String(
    formData.get("employee_count_range") ?? "",
  ).trim();
  const hasForeignEmployees = parseForeignEmployees(
    formData.get("has_foreign_employees"),
  );
  const websiteUrl = getOptionalUrl(formData.get("website_url"));
  const notificationEmail = normalizeNotificationEmail(
    String(formData.get("notification_email") ?? ""),
  );

  if (!companyId) {
    return { error: "수정할 회사/지점을 찾을 수 없습니다." };
  }

  if (
    !name ||
    !businessNumber ||
    !industry ||
    !address ||
    !managerName ||
    !managerPhone ||
    !companyType ||
    !employeeCountRange ||
    hasForeignEmployees === null
  ) {
    return {
      error:
        "기업명, 사업자등록번호, 업종, 주소, 담당자 정보, 기업 유형, 재직 인원, 외국인 재직 여부는 필수입니다.",
    };
  }

  if (
    !allowedCompanyTypes.has(companyType) ||
    !allowedEmployeeCountRanges.has(employeeCountRange)
  ) {
    return { error: "기업 유형과 재직 인원 값을 올바르게 선택해주세요." };
  }

  if (notificationEmail === null) {
    return { error: "알림 이메일 형식을 확인해주세요." };
  }

  if (websiteUrl === null) {
    return { error: "웹사이트 주소는 http:// 또는 https://로 시작해야 합니다." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, business_registration_path, logo_path, verification_status")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!company) {
    return { error: "수정할 회사/지점을 찾을 수 없습니다." };
  }

  let documentPath = company.business_registration_path;
  let logoPath = company.logo_path;

  if (businessRegistrationDocument) {
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

    documentPath = `${user.id}/${crypto.randomUUID()}/business-registration.${getCompanyRegistrationDocumentExtension(businessRegistrationDocument)}`;
    const { error: uploadError } = await supabase.storage
      .from(companyRegistrationDocumentsBucket)
      .upload(documentPath, businessRegistrationDocument, {
        contentType: businessRegistrationDocument.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }
  }

  if (!documentPath) {
    return { error: "사업자등록증은 필수입니다." };
  }

  if (companyLogo) {
    const logoUpload = await uploadCompanyLogo({
      file: companyLogo,
      supabase,
      userId: user.id,
    });

    if (logoUpload.error) {
      return { error: logoUpload.error };
    }

    logoPath = logoUpload.path;
  }

  const { error } = await supabase
    .from("companies")
    .update({
      address,
      business_number: businessNumber,
      business_registration_path: documentPath,
      company_type: companyType,
      email_notifications_enabled:
        formData.get("email_notifications_enabled") === "on",
      employee_count_range: employeeCountRange,
      has_foreign_employees: hasForeignEmployees,
      industry,
      logo_path: logoPath,
      manager_name: managerName,
      manager_phone: managerPhone,
      name,
      notification_email: notificationEmail || user.email,
      website_url: websiteUrl || null,
      verification_note: null,
      verification_status:
        company.verification_status === "verified" ? "verified" : "pending",
    })
    .eq("id", company.id)
    .eq("owner_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/company");
  revalidatePath("/company/settings");
  revalidatePath("/company/jobs");

  return { message: "회사/지점 정보가 수정되었습니다." };
}
