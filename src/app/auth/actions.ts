"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  allowedCompanyRegistrationDocumentTypes,
  companyRegistrationDocumentsBucket,
  getCompanyRegistrationDocumentExtension,
  maxCompanyRegistrationDocumentSize,
} from "@/lib/company-documents";
import { getLocalizedPath, getLocale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AuthState = {
  error?: string;
  message?: string;
};

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
  const businessRegistrationDocument = getCompanyDocumentFile(formData);

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
      !businessRegistrationDocument)
  ) {
    return {
      error:
        locale === "en"
          ? "Company accounts must provide company name, manager name, manager phone, business registration number, and business registration document."
          : "기업 회원은 기업명, 담당자명, 담당자 휴대폰 번호, 사업자등록번호, 사업자등록증을 입력해주세요.",
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

    const { error: companyError } = await admin.from("companies").insert({
      owner_id: data.user.id,
      name: companyName,
      business_number: businessNumber,
      business_registration_path: businessRegistrationPath,
      industry: String(formData.get("industry") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      manager_name: managerName,
      manager_phone: managerPhone,
      notification_email: email,
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
