import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { PublicShell } from "@/components/layout/public-shell";

export default function LoginPage() {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black">Log in</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            이메일과 비밀번호로 로그인하면 역할에 맞는 대시보드로 이동합니다.
          </p>
          <LoginForm />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            No account?{" "}
            <Link className="text-blue-700" href="/signup">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
