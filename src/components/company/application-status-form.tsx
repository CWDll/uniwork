"use client";

import { usePathname, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3 lg:min-w-[292px] lg:bg-transparent lg:p-0">
      <ApplicationStatusButton
        applicationId={applicationId}
        currentStatus={currentStatus}
        label={currentStatus === "submitted" ? "검토 시작" : "검토 중"}
        primary={currentStatus === "submitted"}
        returnTo={returnTo}
        status="reviewing"
      />
      <ApplicationStatusButton
        applicationId={applicationId}
        currentStatus={currentStatus}
        label="합격 처리"
        primary={currentStatus === "reviewing"}
        returnTo={returnTo}
        status="accepted"
      />
      <ApplicationStatusButton
        applicationId={applicationId}
        currentStatus={currentStatus}
        label="불합격"
        primary={false}
        returnTo={returnTo}
        status="rejected"
      />
    </div>
  );
}

function ApplicationStatusButton({
  applicationId,
  currentStatus,
  label,
  primary,
  returnTo,
  status,
}: {
  applicationId: string;
  currentStatus: string;
  label: string;
  primary: boolean;
  returnTo: string;
  status: string;
}) {
  const isCurrent = currentStatus === status;

  return (
    <form action={updateApplicationStatusAction}>
      <input name="application_id" type="hidden" value={applicationId} />
      <input name="return_to" type="hidden" value={returnTo} />
      <input name="status" type="hidden" value={status} />
      <SubmitButton disabled={isCurrent} primary={primary}>
        {isCurrent ? "현재 상태" : label}
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
