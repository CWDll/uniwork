import type { Locale } from "@/lib/i18n";

type JsonArrayValue = unknown[] | null | undefined;

export type SeekerProfileSnapshot = {
  alien_registration_status?: string | null;
  available_times?: {
    weekday?: string | null;
    weekend?: string | null;
  } | null;
  english_level?: string | null;
  korean_level?: string | null;
  major?: string | null;
  nationality?: string | null;
  preferred_job_types?: string[] | null;
  preferred_locations?: string[] | null;
  school?: string | null;
  visa_type?: string | null;
} | null;

export type ResumeSnapshot = {
  education?: JsonArrayValue;
  experience?: JsonArrayValue;
  id?: string | null;
  intro?: string | null;
  languages?: JsonArrayValue;
  title?: string | null;
} | null;

type CompletionResult = {
  completedCount: number;
  isComplete: boolean;
  missing: string[];
  totalCount: number;
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasAny(values?: string[] | null) {
  return Array.isArray(values) && values.length > 0;
}

function hasRows(value: JsonArrayValue) {
  return Array.isArray(value) && value.length > 0;
}

export function getProfileCompletion(
  profile: SeekerProfileSnapshot,
  locale: Locale = "ko",
): CompletionResult {
  const labels = completionLabels[locale];
  const checks = [
    { done: hasText(profile?.nationality), label: labels.nationality },
    { done: hasText(profile?.visa_type), label: labels.visaType },
    {
      done: hasText(profile?.alien_registration_status),
      label: labels.alienRegistration,
    },
    { done: hasText(profile?.school), label: labels.school },
    { done: hasText(profile?.major), label: labels.major },
    { done: hasText(profile?.korean_level), label: labels.koreanLevel },
    { done: hasText(profile?.english_level), label: labels.englishLevel },
    { done: hasAny(profile?.preferred_locations), label: labels.preferredLocations },
    { done: hasAny(profile?.preferred_job_types), label: labels.preferredJobTypes },
    {
      done:
        hasText(profile?.available_times?.weekday) ||
        hasText(profile?.available_times?.weekend),
      label: labels.availableTimes,
    },
  ];
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    completedCount: checks.length - missing.length,
    isComplete: missing.length === 0,
    missing,
    totalCount: checks.length,
  };
}

export function getResumeCompletion(
  resume: ResumeSnapshot,
  locale: Locale = "ko",
): CompletionResult {
  const labels = completionLabels[locale];
  const checks = [
    { done: Boolean(resume?.id), label: labels.resumeCreated },
    { done: hasText(resume?.title), label: labels.resumeTitle },
    {
      done: (resume?.intro?.trim().length ?? 0) >= 20,
      label: labels.introduction,
    },
    { done: hasRows(resume?.languages), label: labels.languageAbilities },
  ];
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    completedCount: checks.length - missing.length,
    isComplete: missing.length === 0,
    missing,
    totalCount: checks.length,
  };
}

export function getApplicationCompletion({
  locale = "ko",
  profile,
  resume,
}: {
  locale?: Locale;
  profile: SeekerProfileSnapshot;
  resume: ResumeSnapshot;
}) {
  const profileCompletion = getProfileCompletion(profile, locale);
  const resumeCompletion = getResumeCompletion(resume, locale);
  const prefix = completionPrefixLabels[locale];
  const missing = [
    ...profileCompletion.missing.map((item) => `${prefix.profile}: ${item}`),
    ...resumeCompletion.missing.map((item) => `${prefix.resume}: ${item}`),
  ];

  return {
    completedCount:
      profileCompletion.completedCount + resumeCompletion.completedCount,
    isComplete: profileCompletion.isComplete && resumeCompletion.isComplete,
    missing,
    profile: profileCompletion,
    resume: resumeCompletion,
    totalCount: profileCompletion.totalCount + resumeCompletion.totalCount,
  };
}

const completionLabels = {
  ko: {
    alienRegistration: "외국인등록 상태",
    availableTimes: "근무 가능 시간",
    englishLevel: "영어 수준",
    introduction: "자기소개 20자 이상",
    koreanLevel: "한국어 수준",
    languageAbilities: "언어 능력",
    major: "전공",
    nationality: "국적",
    preferredJobTypes: "희망 직무",
    preferredLocations: "희망 지역",
    resumeCreated: "이력서 생성",
    resumeTitle: "이력서 제목",
    school: "학교",
    visaType: "비자 종류",
  },
  en: {
    alienRegistration: "Alien registration status",
    availableTimes: "Available work hours",
    englishLevel: "English level",
    introduction: "Self introduction, at least 20 characters",
    koreanLevel: "Korean level",
    languageAbilities: "Language ability",
    major: "Major",
    nationality: "Nationality",
    preferredJobTypes: "Preferred job type",
    preferredLocations: "Preferred work location",
    resumeCreated: "Resume created",
    resumeTitle: "Resume title",
    school: "School",
    visaType: "Visa type",
  },
} satisfies Record<Locale, Record<string, string>>;

const completionPrefixLabels = {
  ko: {
    profile: "프로필",
    resume: "이력서",
  },
  en: {
    profile: "Profile",
    resume: "Resume",
  },
} satisfies Record<Locale, Record<string, string>>;
