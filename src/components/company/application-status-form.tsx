"use client";

import { useFormStatus } from "react-dom";

import { updateApplicationStatusAction } from "@/app/company/applications/actions";
import { Button } from "@/components/ui/button";

export function ApplicationStatusForm({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  return (
    <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3 lg:min-w-[292px] lg:bg-transparent lg:p-0">
      <ApplicationStatusButton
        applicationId={applicationId}
        currentStatus={currentStatus}
        status="reviewing"
      >
        검토 중
      </ApplicationStatusButton>
      <ApplicationStatusButton
        applicationId={applicationId}
        currentStatus={currentStatus}
        status="accepted"
      >
        합격
      </ApplicationStatusButton>
      <ApplicationStatusButton
        applicationId={applicationId}
        currentStatus={currentStatus}
        status="rejected"
      >
        불합격
      </ApplicationStatusButton>
    </div>
  );
}

function ApplicationStatusButton({
  applicationId,
  children,
  currentStatus,
  status,
}: {
  applicationId: string;
  children: React.ReactNode;
  currentStatus: string;
  status: string;
}) {
  const isCurrent = currentStatus === status;

  return (
    <form action={updateApplicationStatusAction}>
      <input name="application_id" type="hidden" value={applicationId} />
      <input name="status" type="hidden" value={status} />
      <SubmitButton disabled={isCurrent} primary={status === "accepted"}>
        {isCurrent ? "현재 상태" : children}
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  disabled: boolean;
  primary: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      disabled={pending || disabled}
      size="sm"
      type="submit"
      variant={primary ? "default" : "outline"}
    >
      {pending ? "저장 중..." : children}
    </Button>
  );
}
