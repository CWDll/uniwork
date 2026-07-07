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
  rule,
  visaType,
}: {
  isSignedIn: boolean;
  jobVisaSupportType?: string | null;
  rule?: VisaEligibilityRule | null;
  visaType?: string | null;
}): JobEligibility {
  if (!isSignedIn) {
    return {
      canApply: false,
      description: "로그인하면 내 비자 정보 기준으로 지원 가능 여부를 확인합니다.",
      label: "로그인 후 확인",
      status: "sign_in_required",
    };
  }

  if (!visaType) {
    return {
      canApply: false,
      description: "구직자 프로필에 비자 유형을 입력하면 지원 가능성이 표시됩니다.",
      label: "프로필 필요",
      status: "profile_required",
    };
  }

  if (rule && !rule.can_apply && rule.needs_review) {
    return {
      canApply: false,
      description:
        rule.blocked_reason ||
        "이 체류자격은 일반 지원 전에 운영자 검토가 필요합니다.",
      label: `${visaType} 검토 필요`,
      status: "review_required",
    };
  }

  if (!rule || !rule.can_apply) {
    return {
      canApply: false,
      description:
        rule?.blocked_reason ||
        "현재 MVP에서는 이 체류자격의 일반 지원을 제한하고 운영자 검토가 필요합니다.",
      label: `${visaType} 지원 제한`,
      status: "blocked",
    };
  }

  if (!jobMentionsVisa(jobVisaSupportType, visaType)) {
    return {
      canApply: true,
      description:
        "이 공고의 비자 조건 문구와 내 비자 유형이 명확히 일치하지 않아 지원 후 운영자 확인이 필요합니다.",
      label: "조건 확인 필요",
      status: "review_required",
    };
  }

  if (rule.needs_review) {
    return {
      canApply: true,
      description:
        "내 비자 유형 기준으로 지원은 가능하지만, 근무시간/학교/허가 조건은 확인이 필요합니다.",
      label: "지원 가능",
      status: "eligible",
    };
  }

  return {
    canApply: true,
    description: "내 비자 유형 기준으로 지원 가능한 공고입니다.",
    label: "지원 가능",
    status: "eligible",
  };
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
