import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "error",
        "이메일 인증 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인하거나 회원가입 메일을 새로 받아주세요.",
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
