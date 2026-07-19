"use client";

import { AlertCircle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { saveSeekerProfileAction } from "@/app/me/profile/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

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
  { labels: { en: "Vietnam", ko: "베트남" }, value: "Vietnam" },
  { labels: { en: "Mongolia", ko: "몽골" }, value: "Mongolia" },
  { labels: { en: "China", ko: "중국" }, value: "China" },
  { labels: { en: "Uzbekistan", ko: "우즈베키스탄" }, value: "Uzbekistan" },
  { labels: { en: "Indonesia", ko: "인도네시아" }, value: "Indonesia" },
  { labels: { en: "Japan", ko: "일본" }, value: "Japan" },
  { labels: { en: "Thailand", ko: "태국" }, value: "Thailand" },
  { labels: { en: "Philippines", ko: "필리핀" }, value: "Philippines" },
  { labels: { en: "United States", ko: "미국" }, value: "United States" },
  { labels: { en: "Other", ko: "기타" }, value: "Other" },
];

const locationOptions = [
  { labels: { en: "Seoul", ko: "서울" }, value: "Seoul" },
  { labels: { en: "Gyeonggi", ko: "경기" }, value: "Gyeonggi" },
  { labels: { en: "Incheon", ko: "인천" }, value: "Incheon" },
  { labels: { en: "Busan", ko: "부산" }, value: "Busan" },
  { labels: { en: "Daegu", ko: "대구" }, value: "Daegu" },
  { labels: { en: "Daejeon", ko: "대전" }, value: "Daejeon" },
  { labels: { en: "Gwangju", ko: "광주" }, value: "Gwangju" },
  { labels: { en: "Other", ko: "기타" }, value: "Other" },
];

const jobTypeOptions = [
  { labels: { en: "Cafe & Service", ko: "카페/서비스" }, value: "Cafe & Service" },
  { labels: { en: "Restaurant", ko: "음식점" }, value: "Restaurant" },
  { labels: { en: "Retail", ko: "리테일" }, value: "Retail" },
  { labels: { en: "Office", ko: "사무직" }, value: "Office" },
  { labels: { en: "Translation", ko: "통번역" }, value: "Translation" },
  { labels: { en: "Marketing", ko: "마케팅" }, value: "Marketing" },
  { labels: { en: "Education", ko: "교육" }, value: "Education" },
  { labels: { en: "Event", ko: "이벤트" }, value: "Event" },
];

const englishLevelOptions = [
  { labels: { en: "Basic", ko: "기초" }, value: "Basic" },
  { labels: { en: "Business", ko: "업무 가능" }, value: "Business" },
  { labels: { en: "Fluent", ko: "유창함" }, value: "Fluent" },
  { labels: { en: "Native", ko: "원어민 수준" }, value: "Native" },
];

const alienRegistrationOptions = [
  { labels: { en: "Card issued", ko: "등록증 있음" }, value: "has_card" },
  { labels: { en: "Applied / pending", ko: "신청 중" }, value: "pending" },
  { labels: { en: "Not yet", ko: "아직 없음" }, value: "not_yet" },
];

export function SeekerProfileForm({
  accountEmail,
  emailNotificationsEnabled,
  locale = "ko",
  notificationEmail,
  profile,
}: {
  accountEmail: string;
  emailNotificationsEnabled: boolean;
  locale?: Locale;
  notificationEmail: string;
  profile: SeekerProfile | null;
}) {
  const copy = profileFormCopy[locale];
  const [state, setState] = useState<{ error?: string; message?: string }>({});
  const [clientError, setClientError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    alien_registration_status: profile?.alien_registration_status ?? "has_card",
    email_notifications_enabled: emailNotificationsEnabled,
    english_level: profile?.english_level ?? "Business",
    korean_level: profile?.korean_level ?? "TOPIK 3",
    major: profile?.major ?? "",
    nationality: profile?.nationality ?? "Vietnam",
    notification_email: notificationEmail || accountEmail,
    preferred_job_types: profile?.preferred_job_types ?? [],
    preferred_locations: profile?.preferred_locations ?? [],
    school: profile?.school ?? "",
    visa_type: profile?.visa_type ?? "D-2",
    weekday_availability: profile?.available_times?.weekday ?? "",
    weekend_availability: profile?.available_times?.weekend ?? "",
  });
  const visaGuidance = getVisaGuidance(draft.visa_type);
  const isStudentVisa = draft.visa_type === "D-2" || draft.visa_type === "D-4";

  function updateDraft(name: keyof typeof draft, value: string | boolean | string[]) {
    setClientError("");
    setState({});
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draft.preferred_locations.length === 0 || draft.preferred_job_types.length === 0) {
      setClientError(copy.errors.workPreference);
      return;
    }

    if (!draft.weekday_availability.trim() && !draft.weekend_availability.trim()) {
      setClientError(copy.errors.time);
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setClientError("");
      setState(await saveSeekerProfileAction({}, formData));
    });
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      onSubmit={handleSubmit}
    >
      <input name="locale" type="hidden" value={locale} />
      <VisaGuidancePanel guidance={visaGuidance} locale={locale} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
          <p className="text-sm font-black text-slate-900">{copy.email.title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {copy.email.description}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field
              helper={`계정 이메일: ${accountEmail || "미확인"}`}
              label={copy.email.field}
              name="notification_email"
              onChange={(value) => updateDraft("notification_email", value)}
              placeholder={accountEmail || "name@example.com"}
              type="email"
              value={draft.notification_email}
            />
            <label className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
              <input
                className="size-4"
                checked={draft.email_notifications_enabled}
                name="email_notifications_enabled"
                onChange={(event) =>
                  updateDraft("email_notifications_enabled", event.target.checked)
                }
                type="checkbox"
              />
              {copy.email.toggle}
            </label>
          </div>
        </div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.nationality}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="nationality"
            onChange={(event) => updateDraft("nationality", event.target.value)}
            required
            value={draft.nationality}
          >
            {nationalityOptions.map((nationality) => (
              <option key={nationality.value} value={nationality.value}>
                {nationality.labels[locale]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.visaType}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="visa_type"
            onChange={(event) => updateDraft("visa_type", event.target.value)}
            required
            value={draft.visa_type}
          >
            <option value="D-2">D-2</option>
            <option value="D-4">D-4</option>
            <option value="F-1">F-1 - {copy.restricted}</option>
            <option value="F-2">F-2 - {copy.operatorReview}</option>
            <option value="F-3">F-3 - {copy.restricted}</option>
            <option value="F-4">F-4 - {copy.restricted}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.alienRegistration}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="alien_registration_status"
            onChange={(event) =>
              updateDraft("alien_registration_status", event.target.value)
            }
            required
            value={draft.alien_registration_status}
          >
            {alienRegistrationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labels[locale]}
              </option>
            ))}
          </select>
        </label>
        <Field
          label={copy.school}
          name="school"
          onChange={(value) => updateDraft("school", value)}
          required
          value={draft.school}
        />
        <Field
          label={copy.major}
          name="major"
          onChange={(value) => updateDraft("major", value)}
          required
          value={draft.major}
        />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.koreanLevel}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="korean_level"
            onChange={(event) => updateDraft("korean_level", event.target.value)}
            required
            value={draft.korean_level}
          >
            <option value="Beginner">{copy.beginner}</option>
            <option>TOPIK 2</option>
            <option>TOPIK 3</option>
            <option>TOPIK 4</option>
            <option>TOPIK 5+</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.englishLevel}
          <select
            className="h-11 rounded-md border border-slate-200 px-3"
            name="english_level"
            onChange={(event) => updateDraft("english_level", event.target.value)}
            required
            value={draft.english_level}
          >
            {englishLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labels[locale]}
              </option>
            ))}
          </select>
        </label>
        <CheckboxGroup
          className="md:col-span-2"
          label={copy.preferredLocations}
          name="preferred_locations"
          onChange={(selected) => updateDraft("preferred_locations", selected)}
          options={locationOptions}
          locale={locale}
          selected={draft.preferred_locations}
        />
        <CheckboxGroup
          className="md:col-span-2"
          label={copy.preferredJobTypes}
          name="preferred_job_types"
          onChange={(selected) => updateDraft("preferred_job_types", selected)}
          options={jobTypeOptions}
          locale={locale}
          selected={draft.preferred_job_types}
        />
        <Field
          helper={isStudentVisa ? copy.weekdayHelper : undefined}
          label={copy.weekdayAvailability}
          name="weekday_availability"
          onChange={(value) => updateDraft("weekday_availability", value)}
          placeholder={copy.weekdayPlaceholder}
          value={draft.weekday_availability}
        />
        <Field
          helper={isStudentVisa ? copy.weekendHelper : undefined}
          label={copy.weekendAvailability}
          name="weekend_availability"
          onChange={(value) => updateDraft("weekend_availability", value)}
          placeholder={copy.weekendPlaceholder}
          value={draft.weekend_availability}
        />
      </div>

      {isStudentVisa ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-black text-blue-900">{copy.studentChecklistTitle}</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-blue-900 sm:grid-cols-2">
            {copy.studentChecklist.map((item) => (
              <span className="flex items-start gap-2" key={item}>
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {clientError || state.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {clientError || state.error}
        </p>
      ) : null}
      {state.message ? (
        <div className="mt-4 rounded-md bg-emerald-50 px-3 py-3">
          <p className="text-sm font-semibold text-emerald-700">{state.message}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
            {copy.successHelp}
          </p>
        </div>
      ) : null}

      <SubmitButton copy={copy.submit} pending={isPending} />
    </form>
  );
}

type VisaGuidance = {
  descriptions: Record<Locale, string>;
  icon: typeof CheckCircle2;
  labels: Record<Locale, string>;
  tone: "success" | "warning" | "danger";
};

const visaGuidanceByType: Record<string, VisaGuidance> = {
  "D-2": {
    descriptions: {
      en: "This visa can be reviewed for student part-time work. Enter your school, alien registration status, and availability accurately to improve job fit checks.",
      ko: "유학생 시간제 취업 검토 대상입니다. 학교, 외국인등록 상태, 근무 가능 시간을 정확히 입력하면 지원 가능성이 더 잘 표시됩니다.",
    },
    icon: CheckCircle2,
    labels: { en: "D-2 eligibility review", ko: "D-2 지원 가능성 검토" },
    tone: "success",
  },
  "D-4": {
    descriptions: {
      en: "Language students may be reviewed for part-time work. Uniwork may check stay period and school information before guiding next steps.",
      ko: "어학연수생 시간제 취업 검토 대상입니다. 체류 기간과 학교 확인이 필요할 수 있어 운영자 확인 흐름을 거칩니다.",
    },
    icon: CheckCircle2,
    labels: { en: "D-4 eligibility review", ko: "D-4 지원 가능성 검토" },
    tone: "success",
  },
  "F-2": {
    descriptions: {
      en: "Eligibility can depend on detailed conditions. In the MVP, Uniwork guides this through operator review.",
      ko: "세부 조건에 따라 가능 여부가 달라질 수 있어 MVP에서는 운영자 검토 후 지원 흐름으로 안내합니다.",
    },
    icon: Clock3,
    labels: { en: "F-2 operator review needed", ko: "F-2 운영자 검토 필요" },
    tone: "warning",
  },
  "F-1": {
    descriptions: {
      en: "General applications are limited in the MVP. Use an administrative request if you need a separate review.",
      ko: "현재 MVP에서는 일반 지원을 제한합니다. 필요하면 행정 검토 요청으로 별도 확인을 진행합니다.",
    },
    icon: ShieldAlert,
    labels: { en: "F-1 application limited", ko: "F-1 지원 제한" },
    tone: "danger",
  },
  "F-3": {
    descriptions: {
      en: "General applications are limited in the MVP. Use an administrative request if you need a separate review.",
      ko: "현재 MVP에서는 일반 지원을 제한합니다. 필요하면 행정 검토 요청으로 별도 확인을 진행합니다.",
    },
    icon: ShieldAlert,
    labels: { en: "F-3 application limited", ko: "F-3 지원 제한" },
    tone: "danger",
  },
  "F-4": {
    descriptions: {
      en: "General applications are limited in the MVP. Use an administrative request if you need a separate review.",
      ko: "현재 MVP에서는 일반 지원을 제한합니다. 필요하면 행정 검토 요청으로 별도 확인을 진행합니다.",
    },
    icon: ShieldAlert,
    labels: { en: "F-4 application limited", ko: "F-4 지원 제한" },
    tone: "danger",
  },
};

function getVisaGuidance(visaType: string) {
  return (
    visaGuidanceByType[visaType] ?? {
      descriptions: {
        en: "The selected visa status requires operator review.",
        ko: "선택한 체류자격은 운영자 검토가 필요합니다.",
      },
      icon: AlertCircle,
      labels: { en: "Review needed", ko: "검토 필요" },
      tone: "warning" as const,
    }
  );
}

function VisaGuidancePanel({
  guidance,
  locale,
}: {
  guidance: VisaGuidance;
  locale: Locale;
}) {
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
        <p className="font-black">{guidance.labels[locale]}</p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">
        {guidance.descriptions[locale]}
      </p>
    </div>
  );
}

function Field({
  helper,
  label,
  name,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  helper?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
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
        name={name}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value ?? ""}
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
  onChange,
  options,
  locale,
  selected,
}: {
  className?: string;
  label: string;
  name: string;
  onChange?: (selected: string[]) => void;
  options: { labels: Record<Locale, string>; value: string }[];
  locale: Locale;
  selected: string[];
}) {
  return (
    <fieldset className={["grid gap-2", className ?? ""].join(" ")}>
      <legend className="text-sm font-bold text-slate-700">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option) => (
          <label
            className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-700"
            key={option.value}
          >
            <input
              className="size-4 accent-blue-600"
              checked={selected.includes(option.value)}
              name={name}
              onChange={(event) => {
                const nextSelected = event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((item) => item !== option.value);

                onChange?.(nextSelected);
              }}
              type="checkbox"
              value={option.value}
            />
            {option.labels[locale]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SubmitButton({
  copy,
  pending,
}: {
  copy: { pending: string; save: string };
  pending: boolean;
}) {
  return (
    <Button className="mt-6 h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? copy.pending : copy.save}
    </Button>
  );
}

const profileFormCopy = {
  en: {
    alienRegistration: "Alien registration status",
    beginner: "Beginner",
    email: {
      description:
        "This email receives application status updates and employer notes. If empty, your account email is used.",
      field: "Notification email",
      title: "Email notifications",
      toggle: "Receive email notifications",
    },
    englishLevel: "English level",
    errors: {
      time: "Please enter weekday or weekend availability.",
      workPreference:
        "Please select at least one preferred work location and one preferred job type.",
    },
    koreanLevel: "Korean level",
    major: "Major / course",
    nationality: "Nationality",
    operatorReview: "operator review",
    preferredJobTypes: "Preferred job types",
    preferredLocations: "Preferred locations",
    restricted: "limited",
    school: "School / institution",
    studentChecklist: [
      "School / major information",
      "Alien registration status",
      "Weekday / weekend availability",
      "Korean ability level",
    ],
    studentChecklistTitle: "D-2/D-4 checklist",
    submit: { pending: "Saving...", save: "Save profile" },
    successHelp:
      "After checking your resume, you can apply from job detail pages using your submitted information.",
    visaType: "Visa status",
    weekdayAvailability: "Weekday availability",
    weekdayHelper: "Example: Mon-Fri 18:00-22:00, max 20 hours/week",
    weekdayPlaceholder: "Mon-Fri 18:00-22:00",
    weekendAvailability: "Weekend availability",
    weekendHelper: "Example: Sat 10:00-18:00",
    weekendPlaceholder: "Sat 10:00-18:00",
  },
  ko: {
    alienRegistration: "외국인등록 상태",
    beginner: "초급",
    email: {
      description:
        "지원 상태 변경과 기업 안내를 받을 이메일입니다. 비워두면 계정 이메일을 사용합니다.",
      field: "알림 받을 이메일",
      title: "이메일 알림",
      toggle: "이메일 알림 받기",
    },
    englishLevel: "영어 수준",
    errors: {
      time: "평일 또는 주말 근무 가능 시간을 입력해주세요.",
      workPreference: "희망 근무 지역과 희망 직무를 최소 1개 이상 선택해주세요.",
    },
    koreanLevel: "한국어 수준",
    major: "전공/과정",
    nationality: "국적",
    operatorReview: "운영자 검토",
    preferredJobTypes: "희망 직무",
    preferredLocations: "희망 근무 지역",
    restricted: "지원 제한",
    school: "학교/기관",
    studentChecklist: [
      "학교/전공 정보",
      "외국인등록 상태",
      "평일/주말 근무 가능 시간",
      "한국어 가능 수준",
    ],
    studentChecklistTitle: "D-2/D-4 확인 항목",
    submit: { pending: "저장 중...", save: "프로필 저장" },
    successHelp:
      "이제 이력서를 확인하면 공고 상세에서 제출 정보 기준으로 지원할 수 있습니다.",
    visaType: "체류자격",
    weekdayAvailability: "평일 근무 가능 시간",
    weekdayHelper: "예: Mon-Fri 18:00-22:00, 최대 주 20시간",
    weekdayPlaceholder: "월-금 18:00-22:00",
    weekendAvailability: "주말 근무 가능 시간",
    weekendHelper: "예: Sat 10:00-18:00",
    weekendPlaceholder: "토 10:00-18:00",
  },
} satisfies Record<Locale, Record<string, unknown>>;
