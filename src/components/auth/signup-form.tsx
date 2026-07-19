"use client";

import { ImagePlus, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";

import { signupAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  allowedCompanyRegistrationDocumentTypes,
  maxCompanyRegistrationDocumentSize,
} from "@/lib/company-documents";
import {
  allowedCompanyLogoTypes,
  maxCompanyLogoSize,
} from "@/lib/company-logos";
import { getLocalizedPath, type Locale } from "@/lib/i18n";

const copy = {
  ko: {
    accountManagerName: "계정 담당자 이름",
    accountManagerPlaceholder: "담당자 이름",
    address: "사업장 주소",
    addressPlaceholder: "사업장 주소",
    businessNumber: "사업자등록번호",
    businessNumberPlaceholder: "000-00-00000",
    businessRegistration: "사업자등록증",
    company: "기업",
    companyName: "기업명",
    companyNamePlaceholder: "사업자등록증의 상호명",
    companyType: "기업 유형",
    companyTypePlaceholder: "기업 유형 선택",
    companyReviewBody:
      "가입 후 회사 정보는 운영자가 검토합니다. 승인 전에는 인증 기업 배지가 표시되지 않습니다.",
    companyReviewTitle: "기업 인증 검토 정보",
    duplicateReset: "비밀번호 재설정",
    email: "이메일",
    industry: "업종",
    industryPlaceholder: "예: 카페, 음식점, 교육",
    employeeCount: "재직 인원",
    employeeCountPlaceholder: "재직 인원 선택",
    foreignEmployees: "외국인 재직 여부",
    foreignEmployeesPlaceholder: "외국인 재직 여부 선택",
    foreignNo: "아니요",
    foreignYes: "예",
    logo: "기업 로고",
    logoHelp: "정사각형 로고 이미지를 권장합니다. JPG, PNG, WebP 파일만 가능해요.",
    managerName: "담당자명",
    managerNamePlaceholder: "채용 담당자명",
    managerPhone: "담당자 휴대폰 번호",
    name: "이름",
    namePlaceholder: "이름",
    password: "비밀번호",
    passwordPlaceholder: "8자 이상",
    pending: "가입 처리 중...",
    reviewChecklist:
      "운영자는 사업자등록번호, 사업자등록증, 담당자 연락처, 업종, 사업장 주소, 기업 규모 정보를 기준으로 기업 인증을 검토합니다.",
    reupload: "다시 업로드",
    role: "가입 유형",
    seeker: "구직자",
    submit: "가입하기",
    upload: "업로드하기",
    uploadHelp: "MB 이하의 PDF, JPG, JPEG, PNG 파일만 업로드 가능해요.",
    website: "웹사이트 주소",
    websitePlaceholder: "https://company.kr",
  },
  en: {
    accountManagerName: "Account manager name",
    accountManagerPlaceholder: "Manager name",
    address: "Workplace address",
    addressPlaceholder: "Workplace address",
    businessNumber: "Business registration number",
    businessNumberPlaceholder: "000-00-00000",
    businessRegistration: "Business registration document",
    company: "Company",
    companyName: "Company name",
    companyNamePlaceholder: "Legal business name",
    companyType: "Company type",
    companyTypePlaceholder: "Select company type",
    companyReviewBody:
      "After sign-up, Uniwork admins review the company information. The verified badge is not shown before approval.",
    companyReviewTitle: "Company verification information",
    duplicateReset: "Reset password",
    email: "Email",
    industry: "Industry",
    industryPlaceholder: "e.g. cafe, restaurant, education",
    employeeCount: "Employee count",
    employeeCountPlaceholder: "Select employee count",
    foreignEmployees: "Foreign employees",
    foreignEmployeesPlaceholder: "Select foreign employee status",
    foreignNo: "No",
    foreignYes: "Yes",
    logo: "Company logo",
    logoHelp: "A square logo image is recommended. JPG, PNG, and WebP files only.",
    managerName: "Manager name",
    managerNamePlaceholder: "Recruiting manager name",
    managerPhone: "Manager phone number",
    name: "Name",
    namePlaceholder: "Name",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    pending: "Submitting...",
    reviewChecklist:
      "Uniwork admins review the business number, registration document, manager contact, industry, workplace address, and company scale before verification.",
    reupload: "Upload again",
    role: "Account type",
    seeker: "Job seeker",
    submit: "Sign up",
    upload: "Upload",
    uploadHelp: "MB or smaller. PDF, JPG, JPEG, and PNG files only.",
    website: "Website URL",
    websitePlaceholder: "https://company.kr",
  },
} satisfies Record<Locale, Record<string, string>>;

const companyTypeOptions = [
  { en: "Corporation", ko: "법인사업자", value: "corporation" },
  { en: "Sole proprietor", ko: "개인사업자", value: "sole_proprietor" },
  { en: "School or institution", ko: "학교/기관", value: "school_institution" },
  { en: "Startup", ko: "스타트업", value: "startup" },
  { en: "Other", ko: "기타", value: "other" },
];

const employeeCountOptions = [
  { label: "1-4", value: "1-4" },
  { label: "5-9", value: "5-9" },
  { label: "10-49", value: "10-49" },
  { label: "50-99", value: "50-99" },
  { label: "100+", value: "100+" },
];

export function SignupForm({
  initialRole = "seeker",
  locale = "ko",
}: {
  initialRole?: string;
  locale?: Locale;
}) {
  const [role, setRole] = useState(initialRole);
  const [hideFeedback, setHideFeedback] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");
  const [registrationFileName, setRegistrationFileName] = useState("");
  const [state, formAction] = useActionState(signupAction, {});
  const isCompany = role === "company";
  const showFeedback = !hideFeedback;
  const t = copy[locale];

  function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
    setRole(event.target.value);
    setHideFeedback(true);
  }

  function handleRegistrationFileChange(event: ChangeEvent<HTMLInputElement>) {
    setRegistrationFileName(event.target.files?.[0]?.name ?? "");
  }

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    setLogoFileName(event.target.files?.[0]?.name ?? "");
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6"
      onSubmit={() => setHideFeedback(false)}
    >
      <input name="locale" type="hidden" value={locale} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {t.role}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="role"
            onChange={handleRoleChange}
            value={role}
          >
            <option value="seeker">{t.seeker}</option>
            <option value="company">{t.company}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {isCompany ? t.accountManagerName : t.name}
          <input
            autoComplete="name"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="name"
            placeholder={
              isCompany ? t.accountManagerPlaceholder : t.namePlaceholder
            }
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
          {t.email}
          <input
            autoComplete="email"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
          {t.password}
          <input
            autoComplete="new-password"
            className="h-11 rounded-md border border-slate-200 px-3"
            name="password"
            placeholder={t.passwordPlaceholder}
            required
            type="password"
          />
        </label>
        {isCompany ? (
          <div className="grid gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-sm font-black text-blue-950">
                {t.companyReviewTitle}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-blue-700">
                {t.companyReviewBody}
              </p>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              {t.companyName}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="company_name"
                placeholder={t.companyNamePlaceholder}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t.managerName}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="manager_name"
                placeholder={t.managerNamePlaceholder}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t.managerPhone}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="manager_phone"
                placeholder="010-0000-0000"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              {t.businessNumber}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="business_number"
                placeholder={t.businessNumberPlaceholder}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              {t.businessRegistration}
              <span className="rounded-md bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                {Math.round(maxCompanyRegistrationDocumentSize / 1024 / 1024)}
                {" "}
                {t.uploadHelp}
              </span>
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
                required
                type="file"
              />
              <span className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 text-sm font-black text-blue-700">
                {registrationFileName ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <Upload className="size-4" />
                )}
                {registrationFileName ? t.reupload : t.upload}
              </span>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t.industry}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="industry"
                placeholder={t.industryPlaceholder}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t.companyType}
              <select
                className="h-11 rounded-md border border-slate-200 px-3"
                name="company_type"
                required
              >
                <option value="">{t.companyTypePlaceholder}</option>
                {companyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t.employeeCount}
              <select
                className="h-11 rounded-md border border-slate-200 px-3"
                name="employee_count_range"
                required
              >
                <option value="">{t.employeeCountPlaceholder}</option>
                {employeeCountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t.foreignEmployees}
              <select
                className="h-11 rounded-md border border-slate-200 px-3"
                name="has_foreign_employees"
                required
              >
                <option value="">{t.foreignEmployeesPlaceholder}</option>
                <option value="true">{t.foreignYes}</option>
                <option value="false">{t.foreignNo}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              {t.address}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="address"
                placeholder={t.addressPlaceholder}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              {t.website}
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                name="website_url"
                placeholder={t.websitePlaceholder}
                type="url"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              {t.logo}
              <span className="rounded-md bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
                {Math.round(maxCompanyLogoSize / 1024 / 1024)}MB 이하 ·{" "}
                {t.logoHelp}
              </span>
              {logoFileName ? (
                <span className="flex h-11 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  {logoFileName}
                </span>
              ) : null}
              <input
                accept={allowedCompanyLogoTypes.join(",")}
                className="sr-only"
                name="company_logo"
                onChange={handleLogoFileChange}
                type="file"
              />
              <span className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600 bg-white px-4 text-sm font-black text-blue-700">
                {logoFileName ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {logoFileName ? t.reupload : t.upload}
              </span>
            </label>
            <p className="text-xs font-semibold leading-5 text-slate-500 sm:col-span-2">
              {t.reviewChecklist}
            </p>
          </div>
        ) : null}
      </div>
      {showFeedback && state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
          {state.error.includes("이미 가입된 이메일") ||
          state.error.includes("already registered") ? (
            <>
              {" "}
              <Link
                className="font-black underline"
                href={getLocalizedPath("/forgot-password", locale)}
              >
                {t.duplicateReset}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {showFeedback && state.message ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {state.message}
        </p>
      ) : null}
      <SubmitButton pendingLabel={t.pending} submitLabel={t.submit} />
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
    <Button className="mt-6 h-11 w-full" disabled={pending}>
      {pending ? pendingLabel : submitLabel}
    </Button>
  );
}
