import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-lg font-black text-blue-700"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm text-white">
            UW
          </span>
          Uniwork
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            New password
          </p>
          <h1 className="mt-3 text-2xl font-black">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            이 화면은 비밀번호 변경을 위한 임시 인증 상태입니다. 변경을
            완료하면 로그아웃되고, 새 비밀번호로 다시 로그인해야 합니다.
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
    </main>
  );
}
