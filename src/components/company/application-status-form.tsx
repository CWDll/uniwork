"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";

import { updateApplicationStatusAction } from "@/app/company/applications/actions";
import { Button } from "@/components/ui/button";

export function ApplicationStatusForm({
  applicationId,
  currentNote,
  currentStatus,
  showNoteField = false,
}: {
  applicationId: string;
  currentNote?: string | null;
  currentStatus: string;
  showNoteField?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <form
      action={updateApplicationStatusAction}
      className="grid gap-2 rounded-xl bg-slate-50 p-3 lg:min-w-[292px] lg:bg-transparent lg:p-0"
    >
      <input name="application_id" type="hidden" value={applicationId} />
      <input name="return_to" type="hidden" value={returnTo} />
      {showNoteField ? (
        <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          Candidate note
          <textarea
            className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
            defaultValue={currentNote ?? ""}
            maxLength={500}
            name="company_note"
            placeholder="구직자에게 보여줄 상태 안내 메모"
          />
        </label>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <SubmitButton
          disabled={currentStatus === "reviewing"}
          primary={currentStatus === "submitted"}
          status="reviewing"
        >
          {currentStatus === "reviewing"
            ? "현재 상태"
            : currentStatus === "submitted"
              ? "검토 시작"
              : "검토 중"}
        </SubmitButton>
        <SubmitButton
          disabled={currentStatus === "accepted"}
          primary={currentStatus === "reviewing"}
          status="accepted"
        >
          {currentStatus === "accepted" ? "현재 상태" : "합격 처리"}
        </SubmitButton>
        <SubmitButton
          disabled={currentStatus === "rejected"}
          primary={false}
          status="rejected"
        >
          {currentStatus === "rejected" ? "현재 상태" : "불합격"}
        </SubmitButton>
      </div>
    </form>
  );
}

function SubmitButton({
  children,
  disabled,
  primary,
  status,
}: {
  children: React.ReactNode;
  disabled: boolean;
  primary: boolean;
  status: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      disabled={pending || disabled}
      name="status"
      size="sm"
      type="submit"
      value={status}
      variant={primary ? "default" : "outline"}
    >
      {pending ? "저장 중..." : children}
    </Button>
  );
}
