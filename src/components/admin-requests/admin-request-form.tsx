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
      id="new-admin-request"
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
            <option value="document_review">서류 사전 검토</option>
            <option value="other">기타 상담</option>
          </select>
        </label>

        <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-black text-blue-950">
            운영자가 외부 행정사에게 전달할 수 있는 검토 패킷을 준비합니다
          </p>
          <p className="text-sm font-semibold leading-6 text-blue-900">
            실제 비자 신청 대행은 아직 서비스 안에서 처리하지 않습니다. 입력한
            내용은 Uniwork 운영자가 확인한 뒤 필요한 경우 별도 행정사에게 수동
            전달하기 위한 기초 정보로 사용합니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="현재 체류자격"
            name="current_visa_type"
            placeholder="D-2"
            required
          />
          <Field
            label="외국인등록 상태"
            name="alien_registration_status"
            placeholder="등록증 있음 / 신청 중 / 아직 없음"
            required
          />
          <Field
            label="학교/기관"
            name="school"
            placeholder="학교명 또는 어학원명"
            required
          />
          <Field
            label="전공/과정"
            name="major"
            placeholder="전공 또는 과정명"
          />
          <Field
            label="희망 근무 시작일"
            name="target_start_date"
            placeholder="예: 2026-08-01"
          />
          <Field
            label="예정 근무 시간"
            name="planned_work_hours"
            placeholder="예: 주 20시간, 평일 저녁"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="연락 가능한 이메일"
            name="contact_email"
            placeholder="name@example.com"
            required
            type="email"
          />
          <Field
            label="연락 가능한 전화번호"
            name="contact_phone"
            placeholder="010-0000-0000"
          />
        </div>

        <fieldset className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <legend className="text-sm font-black text-slate-900">
            현재 준비된 서류
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {documentOptions.map((document) => (
              <label
                className="flex min-h-11 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-slate-700"
                key={document.value}
              >
                <input
                  className="size-4 accent-blue-600"
                  name="documents_ready"
                  type="checkbox"
                  value={document.value}
                />
                {document.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          부족하거나 확인이 필요한 서류
          <textarea
            className="min-h-20 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            name="missing_documents_note"
            placeholder="예: 학교 담당자 확인서가 아직 없습니다."
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          요청 메모
          <textarea
            className="min-h-28 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            name="memo"
            placeholder="상황 설명, 궁금한 점, 이미 상담받은 내용 등을 적어주세요."
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold leading-6 text-slate-700">
          <input
            className="mt-1 size-4 shrink-0 accent-blue-600"
            name="handoff_consent"
            required
            type="checkbox"
          />
          <span>
            Uniwork 운영자가 입력 정보, 프로필, 요청 메모를 검토하고 필요한 경우
            외부 행정사에게 전달할 수 있음에 동의합니다.
          </span>
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

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
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
    <Button className="mt-5 w-full sm:w-auto" disabled={pending}>
      {pending ? "Submitting..." : "요청 접수"}
    </Button>
  );
}
