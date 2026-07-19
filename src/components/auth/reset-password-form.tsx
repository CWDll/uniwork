"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updatePasswordAction } from "@/app/reset-password/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

const copy = {
  ko: {
    confirm: "새 비밀번호 확인",
    confirmPlaceholder: "한 번 더 입력",
    password: "새 비밀번호",
    passwordPlaceholder: "8자 이상",
    pending: "변경 중...",
    submit: "비밀번호 변경",
  },
  en: {
    confirm: "Confirm new password",
    confirmPlaceholder: "Enter it again",
    password: "New password",
    passwordPlaceholder: "At least 8 characters",
    pending: "Updating...",
    submit: "Change password",
  },
} satisfies Record<Locale, Record<string, string>>;

export function ResetPasswordForm({ locale = "ko" }: { locale?: Locale }) {
  const [state, formAction] = useActionState(updatePasswordAction, {});
  const t = copy[locale];

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <input name="locale" type="hidden" value={locale} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {t.password}
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="password"
          placeholder={t.passwordPlaceholder}
          type="password"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {t.confirm}
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="password_confirm"
          placeholder={t.confirmPlaceholder}
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
