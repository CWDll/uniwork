import type {
  ResumeSnapshot,
  SeekerProfileSnapshot,
} from "@/lib/applications/completeness";
import type { Locale } from "@/lib/i18n";

export type ApplicationProfileSnapshot = NonNullable<SeekerProfileSnapshot> & {
  captured_at?: string;
};

export type ApplicationResumeSnapshot = NonNullable<ResumeSnapshot> & {
  captured_at?: string;
  source_id?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function objectValue(value: unknown) {
  return isRecord(value) ? value : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function createProfileSnapshot(
  profile: SeekerProfileSnapshot,
): ApplicationProfileSnapshot | null {
  if (!profile) {
    return null;
  }

  return {
    alien_registration_status: profile.alien_registration_status ?? null,
    available_times: {
      weekday: profile.available_times?.weekday ?? null,
      weekend: profile.available_times?.weekend ?? null,
    },
    captured_at: new Date().toISOString(),
    english_level: profile.english_level ?? null,
    korean_level: profile.korean_level ?? null,
    major: profile.major ?? null,
    nationality: profile.nationality ?? null,
    preferred_job_types: profile.preferred_job_types ?? [],
    preferred_locations: profile.preferred_locations ?? [],
    school: profile.school ?? null,
    visa_type: profile.visa_type ?? null,
  };
}

export function createResumeSnapshot(
  resume: ResumeSnapshot,
): ApplicationResumeSnapshot | null {
  if (!resume?.id) {
    return null;
  }

  return {
    captured_at: new Date().toISOString(),
    education: resume.education ?? [],
    experience: resume.experience ?? [],
    id: resume.id,
    intro: resume.intro ?? null,
    languages: resume.languages ?? [],
    source_id: resume.id,
    title: resume.title ?? null,
  };
}

export function parseProfileSnapshot(
  value: unknown,
): ApplicationProfileSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const availableTimes = objectValue(value.available_times);

  return {
    alien_registration_status: stringValue(value.alien_registration_status),
    available_times: {
      weekday: stringValue(availableTimes.weekday),
      weekend: stringValue(availableTimes.weekend),
    },
    captured_at: stringValue(value.captured_at) ?? undefined,
    english_level: stringValue(value.english_level),
    korean_level: stringValue(value.korean_level),
    major: stringValue(value.major),
    nationality: stringValue(value.nationality),
    preferred_job_types: stringArrayValue(value.preferred_job_types),
    preferred_locations: stringArrayValue(value.preferred_locations),
    school: stringValue(value.school),
    visa_type: stringValue(value.visa_type),
  };
}

export function parseResumeSnapshot(
  value: unknown,
): ApplicationResumeSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    captured_at: stringValue(value.captured_at) ?? undefined,
    education: arrayValue(value.education),
    experience: arrayValue(value.experience),
    id: stringValue(value.id),
    intro: stringValue(value.intro),
    languages: arrayValue(value.languages),
    source_id: stringValue(value.source_id),
    title: stringValue(value.title),
  };
}

export function getProfileForApplication({
  liveProfile,
  snapshot,
}: {
  liveProfile: SeekerProfileSnapshot;
  snapshot: unknown;
}) {
  return parseProfileSnapshot(snapshot) ?? liveProfile;
}

export function getResumeForApplication({
  liveResume,
  snapshot,
}: {
  liveResume: ResumeSnapshot;
  snapshot: unknown;
}) {
  return parseResumeSnapshot(snapshot) ?? liveResume;
}

export function getApplicationSnapshotMeta({
  appliedAt,
  profileSnapshot,
  resumeSnapshot,
}: {
  appliedAt?: string | null;
  profileSnapshot: unknown;
  resumeSnapshot: unknown;
}) {
  const parsedProfile = parseProfileSnapshot(profileSnapshot);
  const parsedResume = parseResumeSnapshot(resumeSnapshot);
  const capturedAt =
    parsedResume?.captured_at ?? parsedProfile?.captured_at ?? appliedAt ?? null;
  const hasCompleteSnapshot = Boolean(parsedProfile && parsedResume);

  return {
    capturedAt,
    hasCompleteSnapshot,
    label: hasCompleteSnapshot ? "지원 시점 제출본" : "현재 정보 fallback",
    tone: hasCompleteSnapshot ? ("success" as const) : ("warning" as const),
  };
}

export function formatSnapshotTime(value?: string | null, locale: Locale = "ko") {
  if (!value) {
    return locale === "en" ? "No capture time" : "캡처 시각 없음";
  }

  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "ko-KR");
}
