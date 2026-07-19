"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createAdminRequestSupplementAction } from "@/app/me/admin-requests/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

export function AdminRequestSupplementForm({
  contactEmail,
  contactPhone,
  locale = "ko",
  requestId,
}: {
  contactEmail: string;
  contactPhone: string;
  locale?: Locale;
  requestId: string;
}) {
  const copy = supplementFormCopy[locale];
  const [state, formAction] = useActionState(
    createAdminRequestSupplementAction,
    {},
  );

  return (
    <form
      action={formAction}
      className="mt-3 grid gap-3 rounded-xl border border-amber-100 bg-white p-3"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="request_id" type="hidden" value={requestId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {copy.message}
        <textarea
          className="min-h-24 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-400"
          name="supplement_message"
          placeholder={copy.messagePlaceholder}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.contactEmail}
          <input
            className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
            defaultValue={contactEmail}
            name="supplement_contact_email"
            placeholder="name@example.com"
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.contactPhone}
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
          {copy.readyDocuments}
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
              {document.labels[locale]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {copy.missingDocuments}
        <textarea
          className="min-h-20 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-400"
          name="supplement_missing_documents_note"
          placeholder={copy.missingDocumentsPlaceholder}
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        {copy.files}
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="w-full rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-black file:text-white"
          multiple
          name="supplement_files"
          type="file"
        />
        <span className="text-xs font-semibold leading-5 text-slate-500">
          {copy.fileHelp}
        </span>
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
      <SubmitButton copy={copy.submit} />
    </form>
  );
}

const documentOptions = [
  { labels: { en: "Passport", ko: "여권" }, value: "passport" },
  { labels: { en: "Alien registration card", ko: "외국인등록증" }, value: "alien_registration_card" },
  { labels: { en: "Certificate of enrollment", ko: "재학증명서" }, value: "certificate_of_enrollment" },
  { labels: { en: "Grades/attendance documents", ko: "성적/출석 관련 서류" }, value: "attendance_or_transcript" },
  { labels: { en: "Employment contract or hiring confirmation", ko: "근로계약서/채용 예정 확인" }, value: "employment_contract" },
  { labels: { en: "Company business registration copy", ko: "사업자등록증 사본" }, value: "company_business_registration" },
  { labels: { en: "School approval/contact confirmation", ko: "학교 담당자 확인" }, value: "school_approval" },
  { labels: { en: "Other supporting document", ko: "기타 참고 서류" }, value: "other" },
];

function SubmitButton({ copy }: { copy: { pending: string; submit: string } }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full sm:w-auto" disabled={pending} size="sm">
      {pending ? copy.pending : copy.submit}
    </Button>
  );
}

const supplementFormCopy = {
  en: {
    contactEmail: "Contact email",
    contactPhone: "Contact phone number",
    fileHelp: "Up to 5 files. PDF, JPG, JPEG, PNG only. Max 10MB per file.",
    files: "Supplement files",
    message: "Supplement details",
    messagePlaceholder:
      "Write the information requested by the operator, additional explanations, or your preparation status.",
    missingDocuments: "Documents still missing or uncertain",
    missingDocumentsPlaceholder:
      "Example: I expect to receive school approval this week.",
    readyDocuments: "Newly prepared documents",
    submit: { pending: "Submitting...", submit: "Submit supplement" },
  },
  ko: {
    contactEmail: "연락 이메일",
    contactPhone: "연락 전화번호",
    fileHelp: "파일당 10MB 이하, 최대 5개까지 PDF, JPG, JPEG, PNG 파일을 첨부할 수 있습니다.",
    files: "보완 파일",
    message: "보완 내용",
    messagePlaceholder: "운영자가 요청한 확인 내용, 추가 설명, 준비 상황을 적어주세요.",
    missingDocuments: "아직 부족하거나 확인이 필요한 서류",
    missingDocumentsPlaceholder: "예: 학교 담당자 확인은 이번 주 안에 받을 예정입니다.",
    readyDocuments: "추가로 준비된 서류",
    submit: { pending: "제출 중...", submit: "보완 내용 제출" },
  },
} satisfies Record<Locale, Record<string, unknown>>;
