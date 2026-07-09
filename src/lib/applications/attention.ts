const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ApplicationAttentionInput = {
  appliedAt: string;
  hasCompanyNote: boolean;
  hasCompleteSnapshot: boolean;
  isComplete: boolean;
  now?: number;
  status: string;
  statusUpdatedAt?: string | null;
};

export type ApplicationAttention = {
  level: "high" | "medium" | "low";
  labels: string[];
  score: number;
  summary: string;
};

function getAgeInDays(value?: string | null, now = Date.now()) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - time) / DAY_IN_MS));
}

export function getApplicationAttention({
  appliedAt,
  hasCompanyNote,
  hasCompleteSnapshot,
  isComplete,
  now = Date.now(),
  status,
  statusUpdatedAt,
}: ApplicationAttentionInput): ApplicationAttention {
  const appliedAge = getAgeInDays(appliedAt, now);
  const statusAge = getAgeInDays(statusUpdatedAt ?? appliedAt, now);
  const labels: string[] = [];
  let score = 0;

  if (status === "submitted") {
    score += 80;
    labels.push("미검토");

    if (appliedAge >= 2) {
      score += 35;
      labels.push(`${appliedAge}일 대기`);
    } else if (appliedAge >= 1) {
      score += 20;
      labels.push("24시간 경과");
    }
  }

  if (status === "reviewing") {
    score += 35;

    if (statusAge >= 3) {
      score += 35;
      labels.push(`${statusAge}일째 검토 중`);
    } else {
      labels.push("검토 중");
    }
  }

  if ((status === "reviewing" || status === "accepted") && !hasCompanyNote) {
    score += 20;
    labels.push("안내 메모 없음");
  }

  if (!isComplete) {
    score += 12;
    labels.push("정보 미완성");
  }

  if (!hasCompleteSnapshot) {
    score += 8;
    labels.push("제출본 없음");
  }

  const dedupedLabels = Array.from(new Set(labels));
  const level = score >= 90 ? "high" : score >= 40 ? "medium" : "low";
  const summary =
    dedupedLabels.length > 0
      ? dedupedLabels.slice(0, 3).join(" · ")
      : "추가 조치 없음";

  return {
    labels: dedupedLabels,
    level,
    score,
    summary,
  };
}
