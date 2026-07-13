"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

type ForgotPasswordState = {
  error?: string;
  message?: string;
};

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "비밀번호를 재설정할 이메일을 입력해주세요." };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "비밀번호 재설정 링크를 보냈습니다. 가입된 이메일이라면 메일함에서 링크를 확인해주세요.",
  };
}
