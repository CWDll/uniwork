import { cn } from "@/lib/utils";

type StatusMeta = {
  label: string;
  className: string;
};

const fallbackStatus: StatusMeta = {
  label: "확인 필요",
  className: "bg-slate-100 text-slate-600",
};

const statusByDomain = {
  application: {
    submitted: {
      label: "지원 완료",
      className: "bg-blue-50 text-blue-700",
    },
    reviewing: {
      label: "검토 중",
      className: "bg-amber-50 text-amber-700",
    },
    accepted: {
      label: "합격",
      className: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      label: "불합격",
      className: "bg-red-50 text-red-700",
    },
  },
  companyVerification: {
    pending: {
      label: "검토 대기",
      className: "bg-amber-50 text-amber-700",
    },
    verified: {
      label: "인증 완료",
      className: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      label: "인증 반려",
      className: "bg-red-50 text-red-700",
    },
  },
  job: {
    draft: {
      label: "초안",
      className: "bg-amber-50 text-amber-700",
    },
    published: {
      label: "공개 중",
      className: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      label: "반려",
      className: "bg-red-50 text-red-700",
    },
    closed: {
      label: "마감",
      className: "bg-slate-100 text-slate-600",
    },
  },
  adminRequest: {
    received: {
      label: "접수",
      className: "bg-blue-50 text-blue-700",
    },
    reviewing: {
      label: "운영자 검토",
      className: "bg-amber-50 text-amber-700",
    },
    assigned: {
      label: "행정사 배정",
      className: "bg-violet-50 text-violet-700",
    },
    completed: {
      label: "완료",
      className: "bg-emerald-50 text-emerald-700",
    },
  },
} as const;

export type StatusDomain = keyof typeof statusByDomain;

export function getStatusMeta(domain: StatusDomain, status?: string | null) {
  if (!status) {
    return fallbackStatus;
  }

  const statuses = statusByDomain[domain] as Record<string, StatusMeta>;

  return statuses[status] ?? {
    label: status,
    className: fallbackStatus.className,
  };
}

export function getStatusBadgeClassName(domain: StatusDomain, status?: string | null) {
  return cn(
    "inline-flex h-max items-center rounded-md px-2.5 py-1 text-xs font-black",
    getStatusMeta(domain, status).className,
  );
}
