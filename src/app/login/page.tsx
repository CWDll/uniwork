import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { PublicShell } from "@/components/layout/public-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black">로그인</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            이메일과 비밀번호로 로그인하면 역할에 맞는 대시보드로 이동합니다.
          </p>
          {params.error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {params.error}
            </p>
          ) : null}
          {params.message ? (
            <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
              {params.message}
            </p>
          ) : null}
          <LoginForm next={next} />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            아직 계정이 없나요?{" "}
            <Link className="text-blue-700" href="/signup">
              회원가입
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
