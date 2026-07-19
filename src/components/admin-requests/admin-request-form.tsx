"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createAdminRequestAction } from "@/app/me/admin-requests/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

export function AdminRequestForm({ locale = "ko" }: { locale?: Locale }) {
  const copy = adminRequestFormCopy[locale];
  const [state, formAction] = useActionState(createAdminRequestAction, {});

  return (
    <form
      action={formAction}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      id="new-admin-request"
    >
      <input name="locale" type="hidden" value={locale} />
      <h2 className="text-lg font-black">{copy.title}</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
        {copy.description}
      </p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.type}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="type"
          >
            <option value="part_time_work_permission">
              {copy.requestTypes.partTime}
            </option>
            <option value="visa_eligibility_review">{copy.requestTypes.visa}</option>
            <option value="document_review">{copy.requestTypes.documents}</option>
            <option value="other">{copy.requestTypes.other}</option>
          </select>
        </label>

        <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-black text-blue-950">
            {copy.noticeTitle}
          </p>
          <p className="text-sm font-semibold leading-6 text-blue-900">
            {copy.noticeBody}
          </p>
        </div>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
          <Field
            label={copy.fields.currentVisa}
            name="current_visa_type"
            placeholder="D-2"
            required
          />
          <Field
            label={copy.fields.alienRegistration}
            name="alien_registration_status"
            placeholder={copy.placeholders.alienRegistration}
            required
          />
          <Field
            label={copy.fields.school}
            name="school"
            placeholder={copy.placeholders.school}
            required
          />
          <Field
            label={copy.fields.major}
            name="major"
            placeholder={copy.placeholders.major}
          />
          <Field
            label={copy.fields.targetStartDate}
            name="target_start_date"
            placeholder={copy.placeholders.targetStartDate}
          />
          <Field
            label={copy.fields.plannedWorkHours}
            name="planned_work_hours"
            placeholder={copy.placeholders.plannedWorkHours}
          />
        </div>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
          <Field
            label={copy.fields.contactEmail}
            name="contact_email"
            placeholder="name@example.com"
            required
            type="email"
          />
          <Field
            label={copy.fields.contactPhone}
            name="contact_phone"
            placeholder="010-0000-0000"
          />
        </div>

        <fieldset className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <legend className="text-sm font-black text-slate-900">
            {copy.readyDocuments}
          </legend>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
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
                {document.labels[locale]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.missingDocuments}
          <textarea
            className="min-h-20 w-full min-w-0 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            name="missing_documents_note"
            placeholder={copy.placeholders.missingDocuments}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.memo}
          <textarea
            className="min-h-28 w-full min-w-0 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            name="memo"
            placeholder={copy.placeholders.memo}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.referenceFiles}
          <input
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="w-full rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-4 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-black file:text-white"
            multiple
            name="request_files"
            type="file"
          />
          <span className="text-xs font-semibold leading-5 text-slate-500">
            {copy.fileHelp}
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold leading-6 text-slate-700">
          <input
            className="mt-1 size-4 shrink-0 accent-blue-600"
            name="handoff_consent"
            required
            type="checkbox"
          />
          <span>
            {copy.consent}
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

      <SubmitButton copy={copy.submit} />
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
    <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
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
    <Button className="mt-5 w-full sm:w-auto" disabled={pending}>
      {pending ? copy.pending : copy.submit}
    </Button>
  );
}

const adminRequestFormCopy = {
  en: {
    consent:
      "I agree that Uniwork operators may review the information, profile, files, and request memo I submit and, if needed, share them with an external administrative partner.",
    description:
      "A Uniwork operator reviews your request first and manually forwards it to an administrative partner only when needed.",
    fields: {
      alienRegistration: "Alien registration status",
      contactEmail: "Contact email",
      contactPhone: "Contact phone number",
      currentVisa: "Current visa status",
      major: "Major/program",
      plannedWorkHours: "Planned work hours",
      school: "School/institution",
      targetStartDate: "Preferred work start date",
    },
    fileHelp: "Up to 5 files. PDF, JPG, JPEG, PNG only. Max 10MB per file.",
    memo: "Request memo",
    missingDocuments: "Missing or uncertain documents",
    noticeBody:
      "Uniwork does not currently process official visa applications inside the service. Your information is used as a review packet that Uniwork operators can manually pass to a separate specialist if needed.",
    noticeTitle: "Prepare a review packet that an operator can share with a specialist",
    placeholders: {
      alienRegistration: "Card issued / applied / not yet",
      major: "Major or program name",
      memo: "Describe your situation, questions, and any consultation you already had.",
      missingDocuments: "Example: I do not have school approval yet.",
      plannedWorkHours: "Example: 20 hours/week, weekday evenings",
      school: "University or language institute",
      targetStartDate: "Example: 2026-08-01",
    },
    readyDocuments: "Documents you already have",
    referenceFiles: "Reference files",
    requestTypes: {
      documents: "Document pre-check",
      other: "Other consultation",
      partTime: "Part-time work permission review",
      visa: "Visa eligibility review",
    },
    submit: { pending: "Submitting...", submit: "Submit request" },
    title: "New administrative request",
    type: "Request type",
  },
  ko: {
    consent:
      "Uniwork 운영자가 입력 정보, 프로필, 요청 메모를 검토하고 필요한 경우 외부 행정사에게 전달할 수 있음에 동의합니다.",
    description: "운영자가 먼저 검토한 뒤 필요한 경우 행정사 파트너에게 수동 배정합니다.",
    fields: {
      alienRegistration: "외국인등록 상태",
      contactEmail: "연락 가능한 이메일",
      contactPhone: "연락 가능한 전화번호",
      currentVisa: "현재 체류자격",
      major: "전공/과정",
      plannedWorkHours: "예정 근무 시간",
      school: "학교/기관",
      targetStartDate: "희망 근무 시작일",
    },
    fileHelp: "파일당 10MB 이하, 최대 5개까지 PDF, JPG, JPEG, PNG 파일을 첨부할 수 있습니다.",
    memo: "요청 메모",
    missingDocuments: "부족하거나 확인이 필요한 서류",
    noticeBody:
      "실제 비자 신청 대행은 아직 서비스 안에서 처리하지 않습니다. 입력한 내용은 Uniwork 운영자가 확인한 뒤 필요한 경우 별도 행정사에게 수동 전달하기 위한 기초 정보로 사용합니다.",
    noticeTitle: "운영자가 외부 행정사에게 전달할 수 있는 검토 패킷을 준비합니다",
    placeholders: {
      alienRegistration: "등록증 있음 / 신청 중 / 아직 없음",
      major: "전공 또는 과정명",
      memo: "상황 설명, 궁금한 점, 이미 상담받은 내용 등을 적어주세요.",
      missingDocuments: "예: 학교 담당자 확인서가 아직 없습니다.",
      plannedWorkHours: "예: 주 20시간, 평일 저녁",
      school: "학교명 또는 어학원명",
      targetStartDate: "예: 2026-08-01",
    },
    readyDocuments: "현재 준비된 서류",
    referenceFiles: "참고 파일",
    requestTypes: {
      documents: "서류 사전 검토",
      other: "기타 상담",
      partTime: "시간제 취업 허가 검토",
      visa: "비자 지원 가능성 검토",
    },
    submit: { pending: "제출 중...", submit: "요청 접수" },
    title: "새 행정 요청",
    type: "요청 유형",
  },
} satisfies Record<Locale, Record<string, unknown>>;
