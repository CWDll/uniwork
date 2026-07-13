"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestPasswordResetAction } from "@/app/forgot-password/actions";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, {});

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        이메일
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
      </label>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="h-11" disabled={pending}>
      {pending ? "메일 전송 중..." : "재설정 메일 보내기"}
    </Button>
  );
}
