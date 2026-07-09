"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createCompanyAction } from "@/app/company/settings/actions";
import { Button } from "@/components/ui/button";

export function CompanySettingsForm() {
  const [state, formAction] = useActionState(createCompanyAction, {});

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Company / branch name" name="name" />
        <Field label="Business number" name="business_number" />
        <Field label="Industry" name="industry" />
        <Field label="Address" name="address" />
        <Field label="Manager name" name="manager_name" />
        <Field label="Manager phone" name="manager_phone" />
        <Field
          helper="새 지원자, 미검토 알림을 받을 이메일입니다. 비워두면 계정 이메일을 사용합니다."
          label="Notification email"
          name="notification_email"
          type="email"
        />
        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          <input
            className="size-4"
            defaultChecked
            name="email_notifications_enabled"
            type="checkbox"
          />
          이메일 알림 받기
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

function Field({
  helper,
  label,
  name,
  type = "text",
}: {
  helper?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        name={name}
        type={type}
      />
      {helper ? (
        <span className="text-xs font-semibold leading-5 text-slate-400">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? "Saving..." : "Save company"}
    </Button>
  );
}
