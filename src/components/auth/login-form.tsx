"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      {next ? <input name="next" type="hidden" value={next} /> : null}
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Email
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
          name="email"
          placeholder="you@example.com"
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Password
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
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="h-11" disabled={pending}>
      {pending ? "Logging in..." : "Log in"}
    </Button>
  );
}
