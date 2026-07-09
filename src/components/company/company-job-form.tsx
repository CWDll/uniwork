"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { createCompanyJobAction } from "@/app/company/jobs/actions";
import { Button } from "@/components/ui/button";

type CompanyOption = {
  id: string;
  name: string;
};

const categoryOptions = [
  "Cafe & Service",
  "Office",
  "Translation",
  "Marketing",
  "Education",
  "Retail",
  "Restaurant",
  "Event",
  "Other",
];

const employmentTypeOptions = ["Part-time", "Contract", "Internship", "Full-time"];

const wageTypeOptions = [
  { label: "Hourly", value: "hourly" },
  { label: "Monthly", value: "monthly" },
  { label: "Project", value: "project" },
];

const visaSupportOptions = [
  "D-2/D-4",
  "D-2/D-4/F review",
  "F visa only",
  "Visa review required",
];

const koreanRequirementOptions = [
  "No Korean required",
  "Basic conversation",
  "TOPIK 2+",
  "TOPIK 3+",
  "Business Korean",
];

export function CompanyJobForm({
  companies,
  disabled,
}: {
  companies: CompanyOption[];
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(createCompanyJobAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.successKey) {
      formRef.current?.reset();
    }
  }, [state.successKey]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      ref={formRef}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">New job post</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            운영자 인증이 완료된 회사/지점은 공고를 저장하면 바로 공개됩니다.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Company / branch
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            disabled={disabled}
            name="company_id"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          disabled={disabled}
          help="예: 홍대 주말 카페 스태프"
          label="Title"
          name="title"
          placeholder="Hongdae weekend cafe staff"
          required
        />
        <Field
          disabled={disabled}
          help="구/동 또는 지점명을 포함하면 구직자가 판단하기 쉽습니다."
          label="Location"
          name="location"
          placeholder="Seoul, Hongdae"
          required
        />
        <SelectField
          disabled={disabled}
          label="Employment type"
          name="employment_type"
          options={employmentTypeOptions.map((option) => ({
            label: option,
            value: option,
          }))}
        />
        <SelectField
          disabled={disabled}
          label="Category"
          name="category"
          options={categoryOptions.map((option) => ({ label: option, value: option }))}
        />
        <SelectField
          disabled={disabled}
          label="Wage type"
          name="wage_type"
          options={wageTypeOptions}
        />
        <Field
          disabled={disabled}
          help="숫자만 입력하세요. 협의가 필요하면 비워둘 수 있습니다."
          inputMode="numeric"
          label="Wage amount"
          name="wage_amount"
          placeholder="12000"
        />
        <SelectField
          disabled={disabled}
          label="Visa support"
          name="visa_support_type"
          options={visaSupportOptions.map((option) => ({
            label: option,
            value: option,
          }))}
        />
        <SelectField
          disabled={disabled}
          label="Korean requirement"
          name="korean_requirement"
          options={koreanRequirementOptions.map((option) => ({
            label: option,
            value: option,
          }))}
        />
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Description
          <textarea
            className="min-h-32 rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-blue-400"
            disabled={disabled}
            name="description"
            placeholder={`Responsibilities:
- Customer service and simple store tasks

Working hours:
- Weekdays evening or weekend shifts

Notes:
- D-2/D-4 students must confirm legal working-hour conditions before starting.`}
            required
          />
          <span className="text-xs font-semibold leading-5 text-slate-500">
            업무, 근무시간, 외국인 유학생 근무 조건 확인 필요 여부를 함께 적어주세요.
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

      <SubmitButton disabled={disabled} />
    </form>
  );
}

function Field({
  disabled,
  help,
  inputMode,
  label,
  name,
  placeholder,
  required,
}: {
  disabled: boolean;
  help?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400 disabled:bg-slate-50"
        disabled={disabled}
        inputMode={inputMode}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      {help ? (
        <span className="text-xs font-semibold leading-5 text-slate-500">{help}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  disabled,
  label,
  name,
  options,
}: {
  disabled: boolean;
  label: string;
  name: string;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400 disabled:bg-slate-50"
        disabled={disabled}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={disabled || pending}>
      {pending ? "초안 저장 중..." : "공고 초안 저장"}
    </Button>
  );
}
