"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createAdminRequestSupplementAction } from "@/app/me/admin-requests/actions";
import { Button } from "@/components/ui/button";

export function AdminRequestSupplementForm({
  contactEmail,
  contactPhone,
  requestId,
}: {
  contactEmail: string;
  contactPhone: string;
  requestId: string;
}) {
  const [state, formAction] = useActionState(
    createAdminRequestSupplementAction,
    {},
  );

  return (
    <form
      action={formAction}
      className="mt-3 grid gap-3 rounded-xl border border-amber-100 bg-white p-3"
    >
      <input name="request_id" type="hidden" value={requestId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        보완 내용
        <textarea
          className="min-h-24 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-400"
          name="supplement_message"
          placeholder="운영자가 요청한 확인 내용, 추가 설명, 준비 상황을 적어주세요."
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          연락 이메일
          <input
            className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
            defaultValue={contactEmail}
            name="supplement_contact_email"
            placeholder="name@example.com"
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          연락 전화번호
          <input
            className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
            defaultValue={contactPhone}
            name="supplement_contact_phone"
            placeholder="010-0000-0000"
          />
        </label>
      </div>
      <fieldset className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <legend className="text-sm font-black text-slate-900">
          추가로 준비된 서류
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {documentOptions.map((document) => (
            <label
              className="flex min-h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-slate-700"
              key={document.value}
            >
              <input
                className="size-4 accent-blue-600"
                name="supplement_documents_ready"
                type="checkbox"
                value={document.value}
              />
              {document.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        아직 부족하거나 확인이 필요한 서류
        <textarea
          className="min-h-20 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-400"
          name="supplement_missing_documents_note"
          placeholder="예: 학교 담당자 확인은 이번 주 안에 받을 예정입니다."
        />
      </label>

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

const documentOptions = [
  { label: "여권", value: "passport" },
  { label: "외국인등록증", value: "alien_registration_card" },
  { label: "재학증명서", value: "certificate_of_enrollment" },
  { label: "성적/출석 관련 서류", value: "attendance_or_transcript" },
  { label: "근로계약서/채용 예정 확인", value: "employment_contract" },
  { label: "사업자등록증 사본", value: "company_business_registration" },
  { label: "학교 담당자 확인", value: "school_approval" },
  { label: "기타 참고 서류", value: "other" },
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full sm:w-auto" disabled={pending} size="sm">
      {pending ? "제출 중..." : "보완 내용 제출"}
    </Button>
  );
}
