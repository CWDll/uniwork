"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createCompanyJobAction } from "@/app/company/jobs/actions";
import { Button } from "@/components/ui/button";

export function CompanyJobForm({ disabled }: { disabled: boolean }) {
  const [state, formAction] = useActionState(createCompanyJobAction, {});

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">New job draft</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            작성한 공고는 초안으로 저장되고, 운영자 승인 후 공개됩니다.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field disabled={disabled} label="Title" name="title" />
        <Field disabled={disabled} label="Location" name="location" />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Employment type
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            disabled={disabled}
            name="employment_type"
          >
            <option>Part-time</option>
            <option>Contract</option>
            <option>Internship</option>
            <option>Full-time</option>
          </select>
        </label>
        <Field disabled={disabled} label="Category" name="category" />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Wage type
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            disabled={disabled}
            name="wage_type"
          >
            <option value="hourly">Hourly</option>
            <option value="monthly">Monthly</option>
            <option value="project">Project</option>
          </select>
        </label>
        <Field disabled={disabled} label="Wage amount" name="wage_amount" />
        <Field
          disabled={disabled}
          label="Visa support"
          name="visa_support_type"
          placeholder="D-2/D-4 review, E-7 not included..."
        />
        <Field
          disabled={disabled}
          label="Korean requirement"
          name="korean_requirement"
          placeholder="TOPIK 3+, conversational..."
        />
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Description
          <textarea
            className="min-h-32 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            disabled={disabled}
            name="description"
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

      <SubmitButton disabled={disabled} />
    </form>
  );
}

function Field({
  disabled,
  label,
  name,
  placeholder,
}: {
  disabled: boolean;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400 disabled:bg-slate-50"
        disabled={disabled}
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={disabled || pending}>
      {pending ? "Creating..." : "Create draft"}
    </Button>
  );
}
