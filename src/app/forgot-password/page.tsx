import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PublicShell } from "@/components/layout/public-shell";

export default function ForgotPasswordPage() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            Password reset
          </p>
          <h1 className="mt-3 text-2xl font-black">비밀번호 재설정</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            가입한 이메일을 입력하면 새 비밀번호를 설정할 수 있는 링크를
            보내드립니다.
          </p>
          <ForgotPasswordForm />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            비밀번호가 기억나면{" "}
            <Link className="text-blue-700" href="/login">
              로그인
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
