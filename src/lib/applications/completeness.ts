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

export function getProfileCompletion(profile: SeekerProfileSnapshot): CompletionResult {
  const checks = [
    { done: hasText(profile?.nationality), label: "국적" },
    { done: hasText(profile?.visa_type), label: "비자 종류" },
    { done: hasText(profile?.alien_registration_status), label: "외국인등록 상태" },
    { done: hasText(profile?.school), label: "학교" },
    { done: hasText(profile?.major), label: "전공" },
    { done: hasText(profile?.korean_level), label: "한국어 수준" },
    { done: hasText(profile?.english_level), label: "영어 수준" },
    { done: hasAny(profile?.preferred_locations), label: "희망 지역" },
    { done: hasAny(profile?.preferred_job_types), label: "희망 직무" },
    {
      done:
        hasText(profile?.available_times?.weekday) ||
        hasText(profile?.available_times?.weekend),
      label: "근무 가능 시간",
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

export function getResumeCompletion(resume: ResumeSnapshot): CompletionResult {
  const checks = [
    { done: Boolean(resume?.id), label: "이력서 생성" },
    { done: hasText(resume?.title), label: "이력서 제목" },
    { done: (resume?.intro?.trim().length ?? 0) >= 20, label: "자기소개 20자 이상" },
    { done: hasRows(resume?.languages), label: "언어 능력" },
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
  profile,
  resume,
}: {
  profile: SeekerProfileSnapshot;
  resume: ResumeSnapshot;
}) {
  const profileCompletion = getProfileCompletion(profile);
  const resumeCompletion = getResumeCompletion(resume);
  const missing = [
    ...profileCompletion.missing.map((item) => `프로필: ${item}`),
    ...resumeCompletion.missing.map((item) => `이력서: ${item}`),
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
