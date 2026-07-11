"use client";

import { AlertCircle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveSeekerProfileAction } from "@/app/me/profile/actions";
import { Button } from "@/components/ui/button";

type SeekerProfile = {
  alien_registration_status: string | null;
  available_times: {
    weekday?: string;
    weekend?: string;
  } | null;
  english_level: string | null;
  korean_level: string | null;
  major: string | null;
  nationality: string | null;
  preferred_job_types: string[] | null;
  preferred_locations: string[] | null;
  school: string | null;
  visa_type: string | null;
};

const nationalityOptions = [
  "Vietnam",
  "Mongolia",
  "China",
  "Uzbekistan",
  "Indonesia",
  "Japan",
  "Thailand",
  "Philippines",
  "United States",
  "Other",
];

const locationOptions = [
  "Seoul",
  "Gyeonggi",
  "Incheon",
  "Busan",
  "Daegu",
  "Daejeon",
  "Gwangju",
  "Other",
];

const jobTypeOptions = [
  "Cafe & Service",
  "Restaurant",
  "Retail",
  "Office",
  "Translation",
  "Marketing",
  "Education",
  "Event",
];

export function SeekerProfileForm({
  accountEmail,
  emailNotificationsEnabled,
  notificationEmail,
  profile,
}: {
  accountEmail: string;
  emailNotificationsEnabled: boolean;
  notificationEmail: string;
  profile: SeekerProfile | null;
}) {
  const [state, formAction] = useActionState(saveSeekerProfileAction, {});
  const [visaType, setVisaType] = useState(profile?.visa_type ?? "D-2");
  const visaGuidance = getVisaGuidance(visaType);
  const isStudentVisa = visaType === "D-2" || visaType === "D-4";

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <VisaGuidancePanel guidance={visaGuidance} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
          <p className="text-sm font-black text-slate-900">Email notifications</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            지원 상태 변경과 기업 안내를 받을 이메일입니다. 비워두면 계정 이메일을 사용합니다.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field
              helper={`계정 이메일: ${accountEmail || "미확인"}`}
              label="Notification email"
              name="notification_email"
              placeholder={accountEmail || "name@example.com"}
              type="email"
              value={notificationEmail || accountEmail}
            />
            <label className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
              <input
                className="size-4"
                defaultChecked={emailNotificationsEnabled}
                name="email_notifications_enabled"
                type="checkbox"
              />
              이메일 알림 받기
            </label>
          </div>
        </div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Nationality
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.nationality ?? "Vietnam"}
            name="nationality"
            required
          >
            {nationalityOptions.map((nationality) => (
              <option key={nationality} value={nationality}>
                {nationality}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Visa type
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.visa_type ?? "D-2"}
            name="visa_type"
            onChange={(event) => setVisaType(event.target.value)}
            required
          >
            <option value="D-2">D-2</option>
            <option value="D-4">D-4</option>
            <option value="F-1">F-1 - blocked</option>
            <option value="F-2">F-2 - needs review</option>
            <option value="F-3">F-3 - blocked</option>
            <option value="F-4">F-4 - blocked</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Alien registration
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.alien_registration_status ?? "has_card"}
            name="alien_registration_status"
            required
          >
            <option value="has_card">Has registration card</option>
            <option value="pending">Pending</option>
            <option value="not_yet">Not yet</option>
          </select>
        </label>
        <Field label="School" name="school" required value={profile?.school} />
        <Field label="Major" name="major" required value={profile?.major} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Korean level
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.korean_level ?? "TOPIK 3"}
            name="korean_level"
            required
          >
            <option>Beginner</option>
            <option>TOPIK 2</option>
            <option>TOPIK 3</option>
            <option>TOPIK 4</option>
            <option>TOPIK 5+</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          English level
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            defaultValue={profile?.english_level ?? "Business"}
            name="english_level"
            required
          >
            <option>Basic</option>
            <option>Business</option>
            <option>Fluent</option>
            <option>Native</option>
          </select>
        </label>
        <CheckboxGroup
          className="md:col-span-2"
          label="Preferred locations"
          name="preferred_locations"
          options={locationOptions}
          selected={profile?.preferred_locations ?? []}
        />
        <CheckboxGroup
          className="md:col-span-2"
          label="Preferred job types"
          name="preferred_job_types"
          options={jobTypeOptions}
          selected={profile?.preferred_job_types ?? []}
        />
        <Field
          helper={isStudentVisa ? "예: Mon-Fri 18:00-22:00, 최대 주 20시간" : undefined}
          label="Weekday availability"
          name="weekday_availability"
          placeholder="Mon-Fri 18:00-22:00"
          value={profile?.available_times?.weekday}
        />
        <Field
          helper={isStudentVisa ? "예: Sat 10:00-18:00" : undefined}
          label="Weekend availability"
          name="weekend_availability"
          placeholder="Sat 10:00-18:00"
          value={profile?.available_times?.weekend}
        />
      </div>

      {isStudentVisa ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-black text-blue-900">D-2/D-4 확인 항목</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-blue-900 sm:grid-cols-2">
            {studentChecklist.map((item) => (
              <span className="flex items-start gap-2" key={item}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <div className="mt-4 rounded-md bg-emerald-50 px-3 py-3">
          <p className="text-sm font-semibold text-emerald-700">{state.message}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
            이제 이력서를 확인하면 공고 상세에서 제출 정보 기준으로 지원할 수 있습니다.
          </p>
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}

type VisaGuidance = {
  description: string;
  icon: typeof CheckCircle2;
  label: string;
  tone: "success" | "warning" | "danger";
};

const visaGuidanceByType: Record<string, VisaGuidance> = {
  "D-2": {
    description:
      "유학생 시간제 취업 검토 대상입니다. 학교, 외국인등록 상태, 근무 가능 시간을 정확히 입력하면 지원 가능성이 더 잘 표시됩니다.",
    icon: CheckCircle2,
    label: "D-2 지원 가능성 검토",
    tone: "success",
  },
  "D-4": {
    description:
      "어학연수생 시간제 취업 검토 대상입니다. 체류 기간과 학교 확인이 필요할 수 있어 운영자 확인 흐름을 거칩니다.",
    icon: CheckCircle2,
    label: "D-4 지원 가능성 검토",
    tone: "success",
  },
  "F-2": {
    description:
      "세부 조건에 따라 가능 여부가 달라질 수 있어 MVP에서는 운영자 검토 후 지원 흐름으로 안내합니다.",
    icon: Clock3,
    label: "F-2 운영자 검토 필요",
    tone: "warning",
  },
  "F-1": {
    description:
      "현재 MVP에서는 일반 지원을 제한합니다. 필요하면 행정 검토 요청으로 별도 확인을 진행합니다.",
    icon: ShieldAlert,
    label: "F-1 지원 제한",
    tone: "danger",
  },
  "F-3": {
    description:
      "현재 MVP에서는 일반 지원을 제한합니다. 필요하면 행정 검토 요청으로 별도 확인을 진행합니다.",
    icon: ShieldAlert,
    label: "F-3 지원 제한",
    tone: "danger",
  },
  "F-4": {
    description:
      "현재 MVP에서는 일반 지원을 제한합니다. 필요하면 행정 검토 요청으로 별도 확인을 진행합니다.",
    icon: ShieldAlert,
    label: "F-4 지원 제한",
    tone: "danger",
  },
};

const studentChecklist = [
  "학교/전공 정보",
  "외국인등록 상태",
  "평일/주말 근무 가능 시간",
  "한국어 가능 수준",
];

function getVisaGuidance(visaType: string) {
  return (
    visaGuidanceByType[visaType] ?? {
      description: "선택한 체류자격은 운영자 검토가 필요합니다.",
      icon: AlertCircle,
      label: "검토 필요",
      tone: "warning" as const,
    }
  );
}

function VisaGuidancePanel({ guidance }: { guidance: VisaGuidance }) {
  const Icon = guidance.icon;

  return (
    <div
      className={[
        "mb-5 rounded-2xl border p-4",
        guidance.tone === "success"
          ? "border-emerald-100 bg-emerald-50 text-emerald-900"
          : "",
        guidance.tone === "warning"
          ? "border-amber-100 bg-amber-50 text-amber-900"
          : "",
        guidance.tone === "danger" ? "border-red-100 bg-red-50 text-red-900" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0" />
        <p className="font-black">{guidance.label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">{guidance.description}</p>
    </div>
  );
}

function Field({
  helper,
  label,
  name,
  placeholder,
  required,
  type = "text",
  value,
}: {
  helper?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-400"
        defaultValue={value ?? ""}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      {helper ? (
        <span className="text-xs font-semibold text-slate-400">{helper}</span>
      ) : null}
    </label>
  );
}

function CheckboxGroup({
  className,
  label,
  name,
  options,
  selected,
}: {
  className?: string;
  label: string;
  name: string;
  options: string[];
  selected: string[];
}) {
  return (
    <fieldset className={["grid gap-2", className ?? ""].join(" ")}>
      <legend className="text-sm font-bold text-slate-700">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option) => (
          <label
            className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700"
            key={option}
          >
            <input
              className="size-4 accent-blue-600"
              defaultChecked={selected.includes(option)}
              name={name}
              type="checkbox"
              value={option}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? "저장 중..." : "프로필 저장"}
    </Button>
  );
}
