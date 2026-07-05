"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signupAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, {});

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Role
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="role"
          >
            <option value="seeker">Seeker</option>
            <option value="company">Company</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Name
          <input
            autoComplete="name"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="name"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
          Email
          <input
            autoComplete="email"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="email"
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
          Password
          <input
            autoComplete="new-password"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="password"
            type="password"
          />
        </label>
      </div>
      {state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
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
    <Button className="mt-6 h-11 w-full" disabled={pending}>
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}
