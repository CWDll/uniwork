"use client";

import { useFormStatus } from "react-dom";

import { updateApplicationStatusAction } from "@/app/company/applications/actions";
import { Button } from "@/components/ui/button";

export function ApplicationStatusForm({
  applicationId,
}: {
  applicationId: string;
}) {
  return (
    <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3 lg:min-w-[292px] lg:bg-transparent lg:p-0">
      <ApplicationStatusButton applicationId={applicationId} status="reviewing">
        Reviewing
      </ApplicationStatusButton>
      <ApplicationStatusButton applicationId={applicationId} status="accepted">
        Accept
      </ApplicationStatusButton>
      <ApplicationStatusButton applicationId={applicationId} status="rejected">
        Reject
      </ApplicationStatusButton>
    </div>
  );
}

function ApplicationStatusButton({
  applicationId,
  children,
  status,
}: {
  applicationId: string;
  children: React.ReactNode;
  status: string;
}) {
  return (
    <form action={updateApplicationStatusAction}>
      <input name="application_id" type="hidden" value={applicationId} />
      <input name="status" type="hidden" value={status} />
      <SubmitButton primary={status === "accepted"}>{children}</SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  primary,
}: {
  children: React.ReactNode;
  primary: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      disabled={pending}
      size="sm"
      type="submit"
      variant={primary ? "default" : "outline"}
    >
      {pending ? "Saving..." : children}
    </Button>
  );
}
