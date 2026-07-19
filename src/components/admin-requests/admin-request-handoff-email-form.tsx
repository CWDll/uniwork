"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { sendAdminRequestHandoffEmailAction } from "@/app/admin/admin-requests/actions";
import { Button } from "@/components/ui/button";

export function AdminRequestHandoffEmailForm({
  canSendEmail,
  hasRecipient,
  requestId,
}: {
  canSendEmail: boolean;
  hasRecipient: boolean;
  requestId: string;
}) {
  const [state, formAction] = useActionState(
    sendAdminRequestHandoffEmailAction,
    {},
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input name="request_id" type="hidden" value={requestId} />
      <SubmitButton canSendEmail={canSendEmail} hasRecipient={hasRecipient} />
      {!canSendEmail ? (
        <p className="text-xs font-bold leading-5 text-amber-700">
          이메일 발송은 아직 비활성입니다. Resend 발신 도메인과 EMAIL_FROM 설정 후
          사용할 수 있습니다.
        </p>
      ) : !hasRecipient ? (
        <p className="text-xs font-bold leading-5 text-amber-700">
          수동 전달 기록에 행정사/외부 담당자 이메일을 먼저 저장해주세요.
        </p>
      ) : (
        <p className="text-xs font-bold leading-5 text-slate-500">
          요청 요약과 첨부 파일을 수신처 이메일로 발송합니다.
        </p>
      )}
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton({
  canSendEmail,
  hasRecipient,
}: {
  canSendEmail: boolean;
  hasRecipient: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending || !canSendEmail || !hasRecipient}
      size="sm"
      type="submit"
      variant={canSendEmail && hasRecipient ? "default" : "outline"}
    >
      {pending ? "발송 중..." : "이메일 발송"}
    </Button>
  );
}
