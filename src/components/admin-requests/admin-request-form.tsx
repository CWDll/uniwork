"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createAdminRequestAction } from "@/app/me/admin-requests/actions";
import { Button } from "@/components/ui/button";

export function AdminRequestForm() {
  const [state, formAction] = useActionState(createAdminRequestAction, {});

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <h2 className="text-lg font-black">새 행정 요청</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
        운영자가 먼저 검토한 뒤 필요한 경우 행정사 파트너에게 수동 배정합니다.
      </p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          요청 유형
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="type"
          >
            <option value="part_time_work_permission">
              시간제 취업 허가 검토
            </option>
            <option value="visa_eligibility_review">비자 지원 가능성 검토</option>
            <option value="document_review">서류 검토</option>
            <option value="other">기타 상담</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          요청 메모
          <textarea
            className="min-h-28 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            name="memo"
            placeholder="학교, 비자, 근무 예정 시간 등 운영자가 확인해야 할 내용을 적어주세요."
          />
        </label>
      </div>

      {state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
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
    <Button className="mt-5 w-full sm:w-auto" disabled={pending}>
      {pending ? "Submitting..." : "요청 접수"}
    </Button>
  );
}
