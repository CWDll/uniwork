"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

export async function loginAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(next ?? "/");
}

export async function signupAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const role = String(formData.get("role") ?? "seeker");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const safeRole = role === "company" ? "company" : "seeker";
  const companyName = String(formData.get("company_name") ?? "").trim();
  const managerName = String(formData.get("manager_name") ?? "").trim();
  const managerPhone = String(formData.get("manager_phone") ?? "").trim();

  if (!name || !email || !password) {
    return { error: "이름, 이메일, 비밀번호를 모두 입력해주세요." };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 최소 8자 이상으로 입력해주세요." };
  }

  if (safeRole === "company" && (!companyName || !managerName || !managerPhone)) {
    return {
      error: "기업 회원은 기업명, 담당자명, 담당자 휴대폰 번호를 입력해주세요.",
    };
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
          "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정 기능을 이용해주세요.",
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
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && data.user.identities?.length === 0) {
    return {
      error:
        "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정 기능을 이용해주세요.",
    };
  }

  if (safeRole === "company" && data.user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { error: companyError } = await admin.from("companies").insert({
      owner_id: data.user.id,
      name: companyName,
      business_number: String(formData.get("business_number") ?? "").trim(),
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
          ? "기업 회원가입이 접수되었습니다. 이메일 인증 후 운영자 승인 상태를 확인해주세요."
          : "회원가입이 접수되었습니다. Supabase 이메일 인증이 켜져 있다면 메일함에서 인증 링크를 확인해주세요.",
    };
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
