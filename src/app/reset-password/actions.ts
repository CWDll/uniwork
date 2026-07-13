"use server";

import { redirect } from "next/navigation";

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

  if (!password || !passwordConfirm) {
    return { error: "새 비밀번호와 확인 값을 모두 입력해주세요." };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 최소 8자 이상으로 입력해주세요." };
  }

  if (password !== passwordConfirm) {
    return { error: "비밀번호 확인이 일치하지 않습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        "비밀번호 재설정 세션이 만료되었습니다. 재설정 메일을 다시 요청해주세요.",
    };
  }

  redirect("/login?message=비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
}
