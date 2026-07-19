"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { loginAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { getLocalizedPath, type Locale } from "@/lib/i18n";

const copy = {
  ko: {
    email: "이메일",
    forgotPassword: "비밀번호 재설정",
    password: "비밀번호",
    pending: "로그인 중...",
    submit: "로그인",
  },
  en: {
    email: "Email",
    forgotPassword: "Reset password",
    password: "Password",
    pending: "Logging in...",
    submit: "Log in",
  },
} satisfies Record<Locale, Record<string, string>>;

export function LoginForm({
  locale = "ko",
  next,
}: {
  locale?: Locale;
  next?: string;
}) {
  const [state, formAction] = useActionState(loginAction, {});
  const t = copy[locale];

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <input name="locale" type="hidden" value={locale} />
      {next ? <input name="next" type="hidden" value={next} /> : null}
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {t.email}
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        <span className="flex items-center justify-between gap-3">
          {t.password}
          <Link
            className="text-xs font-black text-blue-700 hover:text-blue-900"
            href={getLocalizedPath("/forgot-password", locale)}
          >
            {t.forgotPassword}
          </Link>
        </span>
        <input
          autoComplete="current-password"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="password"
          placeholder="••••••••"
          type="password"
        />
      </label>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel={t.pending} submitLabel={t.submit} />
    </form>
  );
}

function SubmitButton({
  pendingLabel,
  submitLabel,
}: {
  pendingLabel: string;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className="h-11" disabled={pending}>
      {pending ? pendingLabel : submitLabel}
    </Button>
  );
}
