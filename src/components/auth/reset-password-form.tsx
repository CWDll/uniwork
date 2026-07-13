"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updatePasswordAction } from "@/app/reset-password/actions";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, {});

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        새 비밀번호
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="password"
          placeholder="8자 이상"
          type="password"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        새 비밀번호 확인
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="password_confirm"
          placeholder="한 번 더 입력"
          type="password"
        />
      </label>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
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
      {pending ? "변경 중..." : "비밀번호 변경"}
    </Button>
  );
}
