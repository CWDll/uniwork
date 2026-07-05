"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AuthState = {
  error?: string;
  message?: string;
};

const roleRedirects = {
  admin: "/admin",
  company: "/company",
  partner: "/admin",
  seeker: "/me",
} as const;

function getDashboardPath(role?: string | null) {
  if (role && role in roleRedirects) {
    return roleRedirects[role as keyof typeof roleRedirects];
  }

  return "/me";
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .maybeSingle();

  redirect(getDashboardPath(profile?.role));
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

  if (!name || !email || !password) {
    return { error: "이름, 이메일, 비밀번호를 모두 입력해주세요." };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 최소 8자 이상으로 입력해주세요." };
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

  if (!data.session) {
    return {
      message:
        "회원가입이 접수되었습니다. Supabase 이메일 인증이 켜져 있다면 메일함에서 인증 링크를 확인해주세요.",
    };
  }

  redirect(getDashboardPath(safeRole));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
