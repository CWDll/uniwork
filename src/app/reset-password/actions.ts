"use server";

import { redirect } from "next/navigation";

import { getLocalizedPath, getLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

type ResetPasswordState = {
  error?: string;
};

export async function updatePasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const locale = getLocale(String(formData.get("locale") ?? ""));

  if (!password || !passwordConfirm) {
    return {
      error:
        locale === "en"
          ? "Please enter and confirm your new password."
          : "새 비밀번호와 확인 값을 모두 입력해주세요.",
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

  if (password !== passwordConfirm) {
    return {
      error:
        locale === "en"
          ? "Password confirmation does not match."
          : "비밀번호 확인이 일치하지 않습니다.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        locale === "en"
          ? "Your password reset session expired. Please request another reset email."
          : "비밀번호 재설정 세션이 만료되었습니다. 재설정 메일을 다시 요청해주세요.",
    };
  }

  await supabase.auth.signOut();

  const message =
    locale === "en"
      ? "Your password has been changed. Please log in with the new password."
      : "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.";

  redirect(`${getLocalizedPath("/login", locale)}?message=${encodeURIComponent(message)}`);
}
