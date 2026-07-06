"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateAdminRequestAction } from "@/app/admin/admin-requests/actions";
import { Button } from "@/components/ui/button";

type PartnerOption = {
  email: string;
  id: string;
  name: string | null;
};

export function AdminRequestUpdateForm({
  assignedPartnerId,
  memo,
  partners,
  requestId,
  status,
}: {
  assignedPartnerId: string | null;
  memo: string | null;
  partners: PartnerOption[];
  requestId: string;
  status: string;
}) {
  const [state, formAction] = useActionState(updateAdminRequestAction, {});

  return (
    <form action={formAction} className="grid gap-3">
      <input name="request_id" type="hidden" value={requestId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Status
        <select
          className="h-10 rounded-md border border-slate-200 px-3"
          defaultValue={status}
          name="status"
        >
          <option value="received">received</option>
          <option value="reviewing">reviewing</option>
          <option value="partner_needed">partner_needed</option>
          <option value="assigned">assigned</option>
          <option value="completed">completed</option>
          <option value="rejected">rejected</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Operator memo
        <textarea
          className="min-h-24 rounded-md border border-slate-200 px-3 py-2"
          defaultValue={memo ?? ""}
          name="memo"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Partner
        <select
          className="h-10 rounded-md border border-slate-200 px-3"
          defaultValue={assignedPartnerId ?? ""}
          name="assigned_partner_id"
        >
          <option value="">Unassigned</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name || partner.email}
            </option>
          ))}
        </select>
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
    <Button disabled={pending} size="sm" type="submit">
      {pending ? "Updating..." : "Update"}
    </Button>
  );
}
