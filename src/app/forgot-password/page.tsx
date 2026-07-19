import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PublicShell } from "@/components/layout/public-shell";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";

const copy = {
  ko: {
    body: "가입한 이메일을 입력하면 새 비밀번호를 설정할 수 있는 링크를 보내드립니다.",
    login: "로그인",
    loginLead: "비밀번호가 기억나면",
    title: "비밀번호 재설정",
  },
  en: {
    body: "Enter your account email and we will send a link to set a new password.",
    login: "Log in",
    loginLead: "Remember your password?",
    title: "Password reset",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];

  return (
    <PublicShell locale={locale}>
      <section className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            Password reset
          </p>
          <h1 className="mt-3 text-2xl font-black">{t.title}</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {t.body}
          </p>
          <ForgotPasswordForm locale={locale} />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            {t.loginLead}{" "}
            <Link
              className="text-blue-700"
              href={getLocalizedPath("/login", locale)}
            >
              {t.login}
            </Link>
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
