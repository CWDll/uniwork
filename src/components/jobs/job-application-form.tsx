"use client";

import { ShieldCheck, Send } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { applyToJobAction } from "@/app/jobs/[jobId]/actions";
import { Button } from "@/components/ui/button";

export function JobApplicationForm({ jobId }: { jobId: string }) {
  const [state, formAction] = useActionState(applyToJobAction, {});

  return (
    <form action={formAction} className="mt-5 grid gap-3">
      <input name="job_id" type="hidden" value={jobId} />
      <textarea
        className="min-h-28 rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none focus:border-blue-500"
        name="message"
        placeholder="기업에게 전달할 간단한 메시지"
      />
      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700">
        <input
          className="mt-1 size-4 rounded border-slate-300 text-blue-600"
          name="confirm_submission"
          required
          type="checkbox"
        />
        <span>
          제출 정보가 기업에 전달되고, 지원 시점의 프로필/이력서가 고정 저장되는
          것을 확인했습니다.
        </span>
      </label>
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <ShieldCheck className="size-4" /> : <Send className="size-4" />}
      {pending ? "지원 중..." : "지원하기"}
    </Button>
  );
}
