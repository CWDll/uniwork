import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { PublicShell } from "@/components/layout/public-shell";
import { getLocalizedPath, getLocale } from "@/lib/i18n";

const copy = {
  ko: {
    body: "이메일과 비밀번호로 로그인하면 역할에 맞는 대시보드로 이동합니다.",
    signUp: "회원가입",
    signUpLead: "아직 계정이 없나요?",
    title: "로그인",
  },
  en: {
    body: "Log in with your email and password to continue to the right workspace.",
    signUp: "Sign up",
    signUpLead: "No account yet?",
    title: "Log in",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    locale?: string;
    message?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  return (
    <PublicShell locale={locale}>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black">{t.title}</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {t.body}
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
          <LoginForm locale={locale} next={next} />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            {t.signUpLead}{" "}
            <Link
              className="text-blue-700"
              href={getLocalizedPath("/signup", locale)}
            >
              {t.signUp}
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
