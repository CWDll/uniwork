"use client";

import { RotateCcw, Upload } from "lucide-react";
import { useActionState, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

import {
  createCompanyAction,
  updateCompanyAction,
} from "@/app/company/settings/actions";
import { Button } from "@/components/ui/button";
import {
  allowedCompanyRegistrationDocumentTypes,
  maxCompanyRegistrationDocumentSize,
} from "@/lib/company-documents";

type CompanyFormValue = {
  address?: string | null;
  business_number?: string | null;
  business_registration_path?: string | null;
  email_notifications_enabled?: boolean | null;
  id: string;
  industry?: string | null;
  manager_name?: string | null;
  manager_phone?: string | null;
  name?: string | null;
  notification_email?: string | null;
};

export function CompanySettingsForm({
  company,
  mode = "create",
}: {
  company?: CompanyFormValue;
  mode?: "create" | "edit";
}) {
  const [createState, createFormAction] = useActionState(createCompanyAction, {});
  const [updateState, updateFormAction] = useActionState(updateCompanyAction, {});
  const [registrationFileName, setRegistrationFileName] = useState("");
  const state = mode === "edit" ? updateState : createState;
  const formAction = mode === "edit" ? updateFormAction : createFormAction;
  const hasExistingDocument = Boolean(company?.business_registration_path);

  function handleRegistrationFileChange(event: ChangeEvent<HTMLInputElement>) {
    setRegistrationFileName(event.target.files?.[0]?.name ?? "");
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {mode === "edit" && company ? (
        <input name="company_id" type="hidden" value={company.id} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          defaultValue={company?.name ?? ""}
          label="회사/지점명"
          name="name"
        />
        <Field
          defaultValue={company?.business_number ?? ""}
          label="사업자등록번호"
          name="business_number"
        />
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          사업자등록증
          <span className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
            {Math.round(maxCompanyRegistrationDocumentSize / 1024 / 1024)}MB
            이하의 PDF, JPG, JPEG, PNG 파일만 업로드 가능해요.
          </span>
          {hasExistingDocument && !registrationFileName ? (
            <span className="flex h-11 items-center rounded-md border border-emerald-100 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
              기존 사업자등록증 제출 완료
            </span>
          ) : null}
          {registrationFileName ? (
            <span className="flex h-11 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              {registrationFileName}
            </span>
          ) : null}
          <input
            accept={allowedCompanyRegistrationDocumentTypes.join(",")}
            className="sr-only"
            name="business_registration_document"
            onChange={handleRegistrationFileChange}
            type="file"
          />
          <span className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 text-sm font-black text-blue-700">
            {registrationFileName ? (
              <RotateCcw className="size-4" />
            ) : (
              <Upload className="size-4" />
            )}
            {registrationFileName ? "다시 업로드" : "업로드하기"}
          </span>
        </label>
        <Field
          defaultValue={company?.industry ?? ""}
          label="업종"
          name="industry"
        />
        <Field
          defaultValue={company?.address ?? ""}
          label="사업장 주소"
          name="address"
        />
        <Field
          defaultValue={company?.manager_name ?? ""}
          label="담당자명"
          name="manager_name"
        />
        <Field
          defaultValue={company?.manager_phone ?? ""}
          label="담당자 연락처"
          name="manager_phone"
        />
        <Field
          defaultValue={company?.notification_email ?? ""}
          helper="새 지원자, 미검토 알림을 받을 이메일입니다. 비워두면 계정 이메일을 사용합니다."
          label="알림 받을 이메일"
          name="notification_email"
          type="email"
        />
        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          <input
            className="size-4"
            defaultChecked={company?.email_notifications_enabled ?? true}
            name="email_notifications_enabled"
            type="checkbox"
          />
          이메일 알림 받기
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
  defaultValue,
  helper,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  helper?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        defaultValue={defaultValue}
        name={name}
        type={type}
      />
      {helper ? (
        <span className="text-xs font-semibold leading-5 text-slate-400">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? "저장 중..." : "회사 정보 저장"}
    </Button>
  );
}
