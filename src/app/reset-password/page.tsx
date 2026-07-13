import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PublicShell } from "@/components/layout/public-shell";

export default function ResetPasswordPage() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            New password
          </p>
          <h1 className="mt-3 text-2xl font-black">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            메일 링크로 인증된 상태에서 사용할 새 비밀번호를 입력해주세요.
          </p>
          <ResetPasswordForm />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            링크가 만료되었나요?{" "}
            <Link className="text-blue-700" href="/forgot-password">
              재설정 메일 다시 받기
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
