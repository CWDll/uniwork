import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";

const copy = {
  ko: {
    body: "이 화면은 비밀번호 변경을 위한 임시 인증 상태입니다. 변경을 완료하면 로그아웃되고, 새 비밀번호로 다시 로그인해야 합니다.",
    resend: "재설정 메일 다시 받기",
    resendLead: "링크가 만료되었나요?",
    title: "새 비밀번호 설정",
  },
  en: {
    body: "This is a temporary authenticated session for changing your password. After the change, you will be logged out and must log in again with the new password.",
    resend: "Request another reset email",
    resendLead: "Did the link expire?",
    title: "Set a new password",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-lg font-black text-blue-700"
          href={getLocalizedPath("/", locale)}
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
          <h1 className="mt-3 text-2xl font-black">{t.title}</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {t.body}
          </p>
          <ResetPasswordForm locale={locale} />
          <p className="mt-5 text-center text-sm font-semibold text-slate-600">
            {t.resendLead}{" "}
            <Link
              className="text-blue-700"
              href={getLocalizedPath("/forgot-password", locale)}
            >
              {t.resend}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
