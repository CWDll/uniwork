"use client";

import { ShieldCheck, Send } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { applyToJobAction } from "@/app/jobs/[jobId]/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

export function JobApplicationForm({
  jobId,
  locale = "ko",
}: {
  jobId: string;
  locale?: Locale;
}) {
  const [state, formAction] = useActionState(applyToJobAction, {});
  const copy = applicationFormCopy[locale];

  return (
    <form action={formAction} className="mt-5 grid gap-3">
      <input name="job_id" type="hidden" value={jobId} />
      <input name="locale" type="hidden" value={locale} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {copy.messageLabel}
        <textarea
          className="min-h-28 rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none focus:border-blue-500"
          maxLength={700}
          name="message"
          placeholder={copy.messagePlaceholder}
        />
        <span className="text-xs font-semibold leading-5 text-slate-500">
          {copy.messageHelp}
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700">
        <input
          className="mt-1 size-4 rounded border-slate-300 text-blue-600"
          name="confirm_submission"
          required
          type="checkbox"
        />
        <span>{copy.confirm}</span>
      </label>
      <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
        {copy.notice}
      </div>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel={copy.pending} submitLabel={copy.submit} />
    </form>
  );
}

function SubmitButton({
  pendingLabel,
  submitLabel,
}: {
  pendingLabel: string;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <ShieldCheck className="size-4" /> : <Send className="size-4" />}
      {pending ? pendingLabel : submitLabel}
    </Button>
  );
}

const applicationFormCopy = {
  ko: {
    confirm:
      "제출 정보가 기업에 전달되고, 지원 시점의 프로필/이력서가 고정 저장되는 것을 확인했습니다.",
    messageHelp:
      "선택 입력입니다. 근무 가능 시간, 관련 경험, 바로 연락 가능한 시간을 적으면 기업이 더 빠르게 검토할 수 있습니다.",
    messageLabel: "지원 메시지",
    messagePlaceholder:
      "예: 안녕하세요. 주말 오후 근무가 가능하고, 카페 고객 응대 경험이 있습니다.",
    notice:
      "제출 후 기업 담당자가 상태를 변경하면 지원 내역에서 확인할 수 있습니다. 제출한 프로필/이력서는 기업 검토용으로만 표시됩니다.",
    pending: "지원 중...",
    submit: "지원하기",
  },
  en: {
    confirm:
      "I understand that my submitted information will be shared with the company and my profile/resume will be saved as a snapshot at the time of application.",
    messageHelp:
      "Optional. Add your available hours, related experience, and the best time to contact you so the company can review faster.",
    messageLabel: "Application message",
    messagePlaceholder:
      "Example: I am available on weekend afternoons and have experience serving cafe customers.",
    notice:
      "After submission, you can check status updates in your applications. Your submitted profile and resume are shown only for company review.",
    pending: "Applying...",
    submit: "Apply",
  },
} satisfies Record<Locale, Record<string, string>>;
