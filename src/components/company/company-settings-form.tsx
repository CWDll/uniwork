"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveCompanyAction } from "@/app/company/settings/actions";
import { Button } from "@/components/ui/button";

type Company = {
  address: string | null;
  business_number: string | null;
  industry: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  name: string | null;
};

export function CompanySettingsForm({ company }: { company: Company | null }) {
  const [state, formAction] = useActionState(saveCompanyAction, {});

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Company name" name="name" value={company?.name} />
        <Field
          label="Business number"
          name="business_number"
          value={company?.business_number}
        />
        <Field label="Industry" name="industry" value={company?.industry} />
        <Field label="Address" name="address" value={company?.address} />
        <Field
          label="Manager name"
          name="manager_name"
          value={company?.manager_name}
        />
        <Field
          label="Manager phone"
          name="manager_phone"
          value={company?.manager_phone}
        />
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
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        defaultValue={value ?? ""}
        name={name}
      />
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
