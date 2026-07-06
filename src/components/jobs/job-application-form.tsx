"use client";

import { Send } from "lucide-react";
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
    <Button disabled={pending} type="submit">
      <Send className="size-4" />
      {pending ? "지원 중..." : "지원하기"}
    </Button>
  );
}
