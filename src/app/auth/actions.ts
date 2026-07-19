"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
import { getLocalizedPath, getLocale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AuthState = {
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

function getSafeNextPath(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

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

export async function loginAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"));
  const locale = getLocale(String(formData.get("locale") ?? ""));

  if (!email || !password) {
    return {
      error:
        locale === "en"
          ? "Please enter both your email and password."
          : "이메일과 비밀번호를 모두 입력해주세요.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(next ?? getLocalizedPath("/", locale));
}

export async function signupAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const role = String(formData.get("role") ?? "seeker");
  const locale = getLocale(String(formData.get("locale") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const safeRole = role === "company" ? "company" : "seeker";
  const companyName = String(formData.get("company_name") ?? "").trim();
  const managerName = String(formData.get("manager_name") ?? "").trim();
  const managerPhone = String(formData.get("manager_phone") ?? "").trim();
  const businessNumber = String(formData.get("business_number") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const businessRegistrationDocument = getCompanyDocumentFile(formData);
  const companyLogo = getCompanyLogoFile(formData);
  const companyType = String(formData.get("company_type") ?? "").trim();
  const employeeCountRange = String(
    formData.get("employee_count_range") ?? "",
  ).trim();
  const foreignEmployeesValue = String(
    formData.get("has_foreign_employees") ?? "",
  ).trim();
  const websiteUrl = getOptionalUrl(formData.get("website_url"));

  if (!name || !email || !password) {
    return {
      error:
        locale === "en"
          ? "Please enter your name, email, and password."
          : "이름, 이메일, 비밀번호를 모두 입력해주세요.",
    };
  }

  if (password.length < 8) {
    return {
      error:
        locale === "en"
          ? "Password must be at least 8 characters."
          : "비밀번호는 최소 8자 이상으로 입력해주세요.",
    };
  }

  if (
    safeRole === "company" &&
    (!companyName ||
      !managerName ||
      !managerPhone ||
      !businessNumber ||
      !businessRegistrationDocument ||
      !industry ||
      !address ||
      !companyType ||
      !employeeCountRange ||
      !foreignEmployeesValue)
  ) {
    return {
      error:
        locale === "en"
          ? "Company accounts must provide company, manager, business, industry, address, company type, employee count, and foreign employee status information."
          : "기업 회원은 기업명, 담당자 정보, 사업자 정보, 업종, 주소, 기업 유형, 재직 인원, 외국인 재직 여부를 입력해주세요.",
    };
  }

  if (websiteUrl === null) {
    return {
      error:
        locale === "en"
          ? "Please enter the website URL starting with http:// or https://."
          : "웹사이트 주소는 http:// 또는 https://로 시작하는 주소로 입력해주세요.",
    };
  }

  if (
    safeRole === "company" &&
    (!allowedCompanyTypes.has(companyType) ||
      !allowedEmployeeCountRanges.has(employeeCountRange) ||
      !["true", "false"].includes(foreignEmployeesValue))
  ) {
    return {
      error:
        locale === "en"
          ? "Please select valid company type, employee count, and foreign employee status options."
          : "기업 유형, 재직 인원, 외국인 재직 여부를 올바르게 선택해주세요.",
    };
  }

  if (safeRole === "company" && businessRegistrationDocument) {
    if (
      !allowedCompanyRegistrationDocumentTypes.includes(
        businessRegistrationDocument.type,
      )
    ) {
      return {
        error:
          locale === "en"
            ? "Business registration documents must be PDF, JPG, JPEG, or PNG files."
            : "사업자등록증은 PDF, JPG, JPEG, PNG 파일만 업로드할 수 있습니다.",
      };
    }

    if (businessRegistrationDocument.size > maxCompanyRegistrationDocumentSize) {
      return {
        error:
          locale === "en"
            ? "Business registration documents must be 5MB or smaller."
            : "사업자등록증은 5MB 이하로 업로드해주세요.",
      };
    }
  }

  if (safeRole === "company" && companyLogo) {
    if (!allowedCompanyLogoTypes.includes(companyLogo.type)) {
      return {
        error:
          locale === "en"
            ? "Company logos must be JPG, PNG, or WebP images."
            : "기업 로고는 JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
      };
    }

    if (companyLogo.size > maxCompanyLogoSize) {
      return {
        error:
          locale === "en"
            ? "Company logos must be 5MB or smaller."
            : "기업 로고는 5MB 이하로 업로드해주세요.",
      };
    }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (data) {
      return {
        error:
          locale === "en"
            ? "This email is already registered. Please log in or reset your password."
            : "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정 기능을 이용해주세요.",
      };
    }
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: safeRole,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        getLocalizedPath("/", locale),
      )}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && data.user.identities?.length === 0) {
    return {
      error:
        locale === "en"
          ? "This email is already registered. Please log in or reset your password."
          : "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정 기능을 이용해주세요.",
    };
  }

  if (safeRole === "company" && data.user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    let businessRegistrationPath: string | null = null;
    let logoPath: string | null = null;

    if (businessRegistrationDocument) {
      businessRegistrationPath = `${data.user.id}/business-registration.${getCompanyRegistrationDocumentExtension(businessRegistrationDocument)}`;
      const { error: uploadError } = await admin.storage
        .from(companyRegistrationDocumentsBucket)
        .upload(businessRegistrationPath, businessRegistrationDocument, {
          contentType: businessRegistrationDocument.type,
          upsert: true,
        });

      if (uploadError) {
        return { error: uploadError.message };
      }
    }

    if (companyLogo) {
      logoPath = `${data.user.id}/logo.${getCompanyLogoExtension(companyLogo)}`;
      const { error: logoUploadError } = await admin.storage
        .from(companyLogosBucket)
        .upload(logoPath, companyLogo, {
          contentType: companyLogo.type,
          upsert: true,
        });

      if (logoUploadError) {
        return { error: logoUploadError.message };
      }
    }

    const { error: companyError } = await admin.from("companies").insert({
      owner_id: data.user.id,
      name: companyName,
      business_number: businessNumber,
      business_registration_path: businessRegistrationPath,
      company_type: companyType,
      employee_count_range: employeeCountRange,
      has_foreign_employees: foreignEmployeesValue === "true",
      industry,
      address,
      logo_path: logoPath,
      manager_name: managerName,
      manager_phone: managerPhone,
      notification_email: email,
      website_url: websiteUrl || null,
      verification_status: "pending",
      verification_note:
        "기업 회원가입 단계에서 접수되었습니다. 사업자 정보와 담당자 정보를 검토해주세요.",
    });

    if (companyError) {
      return { error: companyError.message };
    }
  }

  if (!data.session) {
    return {
      message:
        safeRole === "company"
          ? locale === "en"
            ? "Your company sign-up has been submitted. After email verification, check your approval status."
            : "기업 회원가입이 접수되었습니다. 이메일 인증 후 운영자 승인 상태를 확인해주세요."
          : locale === "en"
            ? "Your sign-up has been submitted. If email verification is enabled, please check your inbox."
            : "회원가입이 접수되었습니다. Supabase 이메일 인증이 켜져 있다면 메일함에서 인증 링크를 확인해주세요.",
    };
  }

  redirect(getLocalizedPath("/", locale));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
