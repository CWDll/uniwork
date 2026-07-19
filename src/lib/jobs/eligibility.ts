import type { Locale } from "@/lib/i18n";

export type VisaEligibilityRule = {
  blocked_reason: string | null;
  can_apply: boolean;
  needs_review: boolean;
  visa_type: string;
};

export type JobEligibilityStatus =
  | "eligible"
  | "review_required"
  | "blocked"
  | "profile_required"
  | "sign_in_required";

export type JobEligibility = {
  canApply: boolean;
  description: string;
  label: string;
  status: JobEligibilityStatus;
};

export function getJobEligibility({
  isSignedIn,
  jobVisaSupportType,
  locale = "ko",
  rule,
  visaType,
}: {
  isSignedIn: boolean;
  jobVisaSupportType?: string | null;
  locale?: Locale;
  rule?: VisaEligibilityRule | null;
  visaType?: string | null;
}): JobEligibility {
  const copy = eligibilityCopy[locale];

  if (!isSignedIn) {
    return {
      canApply: false,
      description: copy.signInDescription,
      label: copy.signInLabel,
      status: "sign_in_required",
    };
  }

  if (!visaType) {
    return {
      canApply: false,
      description: copy.profileDescription,
      label: copy.profileLabel,
      status: "profile_required",
    };
  }

  if (rule && !rule.can_apply && rule.needs_review) {
    return {
      canApply: false,
      description: localizeRuleReason(rule.blocked_reason, locale) || copy.reviewDescription,
      label:
        locale === "en"
          ? `${visaType} review required`
          : `${visaType} 검토 필요`,
      status: "review_required",
    };
  }

  if (!rule || !rule.can_apply) {
    return {
      canApply: false,
      description: localizeRuleReason(rule?.blocked_reason, locale) || copy.blockedDescription,
      label:
        locale === "en"
          ? `${visaType} restricted`
          : `${visaType} 지원 제한`,
      status: "blocked",
    };
  }

  if (!jobMentionsVisa(jobVisaSupportType, visaType)) {
    return {
      canApply: true,
      description: copy.conditionReviewDescription,
      label: copy.conditionReviewLabel,
      status: "review_required",
    };
  }

  if (rule.needs_review) {
    return {
      canApply: true,
      description: copy.eligibleNeedsReviewDescription,
      label: copy.eligibleLabel,
      status: "eligible",
    };
  }

  return {
    canApply: true,
    description: copy.eligibleDescription,
    label: copy.eligibleLabel,
    status: "eligible",
  };
}

const eligibilityCopy = {
  ko: {
    blockedDescription:
      "현재 MVP에서는 이 체류자격의 일반 지원을 제한하고 운영자 검토가 필요합니다.",
    conditionReviewDescription:
      "이 공고의 비자 조건 문구와 내 비자 유형이 명확히 일치하지 않아 지원 후 운영자 확인이 필요합니다.",
    conditionReviewLabel: "조건 확인 필요",
    eligibleDescription: "내 비자 유형 기준으로 지원 가능한 공고입니다.",
    eligibleLabel: "지원 가능",
    eligibleNeedsReviewDescription:
      "내 비자 유형 기준으로 지원은 가능하지만, 근무시간/학교/허가 조건은 확인이 필요합니다.",
    profileDescription:
      "구직자 프로필에 비자 유형을 입력하면 지원 가능성이 표시됩니다.",
    profileLabel: "프로필 필요",
    reviewDescription:
      "이 체류자격은 일반 지원 전에 운영자 검토가 필요합니다.",
    signInDescription:
      "로그인하면 내 비자 정보 기준으로 지원 가능 여부를 확인합니다.",
    signInLabel: "로그인 후 확인",
  },
  en: {
    blockedDescription:
      "This visa status is restricted for direct applications in the MVP and requires admin review.",
    conditionReviewDescription:
      "You can apply with your visa, but the job's visa wording does not clearly match your profile, so Uniwork may need to review it after submission.",
    conditionReviewLabel: "Needs condition check",
    eligibleDescription: "This job is open to applications based on your visa profile.",
    eligibleLabel: "Eligible",
    eligibleNeedsReviewDescription:
      "You can apply based on your visa profile, but work hours, school approval, or permit details may need confirmation.",
    profileDescription:
      "Add your visa type in your job seeker profile to see application eligibility.",
    profileLabel: "Profile needed",
    reviewDescription: "This visa status needs admin review before direct application.",
    signInDescription:
      "Log in to check eligibility based on your visa information.",
    signInLabel: "Log in to check",
  },
} satisfies Record<Locale, Record<string, string>>;

function localizeRuleReason(reason: string | null | undefined, locale: Locale) {
  if (!reason || locale === "ko") {
    return reason ?? "";
  }

  const normalized = reason.trim();
  const translations: Record<string, string> = {
    "D-4는 시간제 취업 허가 검토가 필요합니다.":
      "D-4 status requires review for part-time work permission.",
    "F 계열은 세부 체류자격 확인이 필요합니다.":
      "F-series status requires review of the specific visa category.",
  };

  return translations[normalized] ?? "";
}

function jobMentionsVisa(jobVisaSupportType: string | null | undefined, visaType: string) {
  const text = (jobVisaSupportType ?? "").toUpperCase();
  const normalizedVisa = visaType.toUpperCase();

  if (!text) {
    return false;
  }

  if (text.includes(normalizedVisa)) {
    return true;
  }

  return normalizedVisa.startsWith("F-") && /\bF\b|F계열|F REVIEW/.test(text);
}
