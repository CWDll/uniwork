"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateUserRoleAction } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";

const roles = ["seeker", "company", "partner", "admin"];

export function UserRoleForm({
  role,
  userId,
}: {
  role: string;
  userId: string;
}) {
  const [state, formAction] = useActionState(updateUserRoleAction, {});

  return (
    <form action={formAction} className="grid gap-2">
      <input name="user_id" type="hidden" value={userId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Role
        <select
          className="h-10 rounded-md border border-slate-200 px-3"
          defaultValue={role}
          name="role"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
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
      {pending ? "Updating..." : "Update role"}
    </Button>
  );
}
