"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
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
  const [note, setNote] = useState(currentNote ?? "");
  const statusHelp = getStatusHelp(currentStatus);

  return (
    <form
      action={updateApplicationStatusAction}
      className="grid gap-2 rounded-xl bg-slate-50 p-3 lg:min-w-[292px] lg:bg-transparent lg:p-0"
    >
      <input name="application_id" type="hidden" value={applicationId} />
      <input name="return_to" type="hidden" value={returnTo} />
      {showNoteField ? (
        <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
          지원자 안내 메모
          <textarea
            className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
            maxLength={500}
            name="company_note"
            onChange={(event) => setNote(event.target.value)}
            placeholder="구직자에게 보여줄 상태 안내 메모"
            value={note}
          />
          <span className="flex items-center justify-between gap-3 text-[11px] font-bold normal-case tracking-normal text-slate-500">
            <span>이 메모는 구직자 지원 현황과 상태 변경 이력에 표시됩니다.</span>
            <span>{note.length}/500</span>
          </span>
        </label>
      ) : null}
      <p className="text-xs font-semibold leading-5 text-slate-500">
        {statusHelp}
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {currentStatus === "submitted" || showNoteField ? (
          <SubmitButton
            disabled={currentStatus === "reviewing" && !showNoteField}
            primary={currentStatus === "submitted"}
            status="reviewing"
          >
            {getStatusButtonLabel({
              currentStatus,
              showNoteField,
              status: "reviewing",
            })}
          </SubmitButton>
        ) : null}
        <SubmitButton
          disabled={currentStatus === "accepted" && !showNoteField}
          primary={currentStatus === "reviewing"}
          status="accepted"
        >
          {getStatusButtonLabel({
            currentStatus,
            showNoteField,
            status: "accepted",
          })}
        </SubmitButton>
        <SubmitButton
          disabled={currentStatus === "rejected" && !showNoteField}
          primary={false}
          status="rejected"
        >
          {getStatusButtonLabel({
            currentStatus,
            showNoteField,
            status: "rejected",
          })}
        </SubmitButton>
      </div>
    </form>
  );
}

function getStatusHelp(status: string) {
  if (status === "submitted") {
    return "처음 확인했다면 검토 시작으로 바꾸고, 필요하면 안내 메모를 남겨주세요.";
  }

  if (status === "reviewing") {
    return "검토가 끝났다면 합격 또는 불합격으로 상태를 정리하세요.";
  }

  if (status === "accepted") {
    return "합격 상태입니다. 최종 안내가 필요하면 메모를 수정한 뒤 다시 저장하세요.";
  }

  if (status === "rejected") {
    return "불합격 상태입니다. 지원자에게 보여줄 안내가 필요하면 메모를 수정하세요.";
  }

  return "상태를 변경하면 구직자 지원 현황에 바로 반영됩니다.";
}

function getStatusButtonLabel({
  currentStatus,
  showNoteField,
  status,
}: {
  currentStatus: string;
  showNoteField: boolean;
  status: "accepted" | "rejected" | "reviewing";
}) {
  if (currentStatus === status) {
    return showNoteField ? "메모 저장" : "현재 상태";
  }

  if (status === "reviewing") {
    return currentStatus === "submitted" ? "검토 시작" : "검토 중";
  }

  if (status === "accepted") {
    return "합격 처리";
  }

  return "불합격";
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
