"use server";

import { headers } from "next/headers";

import { getLocalizedPath, getLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

type ForgotPasswordState = {
  error?: string;
  message?: string;
};

function getPasswordResetErrorMessage(message: string, locale: "ko" | "en") {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit")) {
    return locale === "en"
      ? "You requested password reset emails too often. Please wait and try again."
      : "비밀번호 재설정 메일을 너무 자주 요청했습니다. 잠시 후 다시 시도해주세요.";
  }

  return message;
}

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  const locale = getLocale(String(formData.get("locale") ?? ""));

  if (!email) {
    return {
      error:
        locale === "en"
          ? "Please enter the email address for your account."
          : "비밀번호를 재설정할 이메일을 입력해주세요.",
    };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
      getLocalizedPath("/reset-password", locale),
    )}`,
  });

  if (error) {
    return { error: getPasswordResetErrorMessage(error.message, locale) };
  }

  return {
    message:
      locale === "en"
        ? "We sent a password reset link. If the email is registered, please check your inbox."
        : "비밀번호 재설정 링크를 보냈습니다. 가입된 이메일이라면 메일함에서 링크를 확인해주세요.",
  };
}
