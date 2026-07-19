import { BriefcaseBusiness, FileText, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

const requestStatusLabels = [
  { key: "received", label: "접수" },
  { key: "reviewing", label: "운영자 검토" },
  { key: "partner_needed", label: "행정사 전달 필요" },
  { key: "assigned", label: "행정사 배정" },
  { key: "completed", label: "완료" },
  { key: "rejected", label: "반려" },
];

export default async function AdminPage() {
  const { supabase } = await requireAdmin("/admin");

  const [
    { count: userCount },
    { count: pendingCompanyCount },
    { count: publishedJobCount },
    { count: adminRequestCount },
    { data: adminRequests },
    { data: recentRequests },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("admin_requests")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("admin_requests")
      .select(
        "id, status, seeker_followup_note, seeker_followup_requested_at, request_details, document_checklist, contact_snapshot",
      ),
    supabase
      .from("admin_requests")
      .select(
        "id, seeker_id, type, status, memo, seeker_followup_note, seeker_followup_requested_at, request_details, document_checklist, contact_snapshot, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const adminRequestIds = adminRequests?.map((request) => request.id) ?? [];
  const { data: adminRequestSupplements } =
    adminRequestIds.length > 0
      ? await supabase
          .from("admin_request_supplements")
          .select("request_id, created_at")
          .in("request_id", adminRequestIds)
      : { data: [] };
  const supplementsByRequestId = new Map<string, { created_at: string }[]>();
  adminRequestSupplements?.forEach((supplement) => {
    const existing = supplementsByRequestId.get(supplement.request_id) ?? [];
    supplementsByRequestId.set(supplement.request_id, [...existing, supplement]);
  });
  const recentSeekerIds = Array.from(
    new Set(recentRequests?.map((request) => request.seeker_id) ?? []),
  );
  const { data: recentProfiles } =
    recentSeekerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", recentSeekerIds)
      : { data: [] };
  const { data: recentSeekerProfiles } =
    recentSeekerIds.length > 0
      ? await supabase
          .from("seeker_profiles")
          .select("user_id, visa_type, alien_registration_status, school")
          .in("user_id", recentSeekerIds)
      : { data: [] };
  const profileById = new Map(
    recentProfiles?.map((profile) => [profile.id, profile]) ?? [],
  );
  const seekerProfileById = new Map(
    recentSeekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
  );

  const metrics = [
    { label: "전체 회원", value: userCount ?? 0, icon: UsersRound },
    {
      label: "검토 대기 기업",
      value: pendingCompanyCount ?? 0,
      icon: ShieldAlert,
      href: "/admin/companies?status=pending",
    },
    {
      label: "공개 공고",
      value: publishedJobCount ?? 0,
      icon: BriefcaseBusiness,
      href: "/admin/jobs?status=published",
    },
    {
      label: "행정 요청",
      value: adminRequestCount ?? 0,
      icon: FileText,
      href: "/admin/admin-requests",
    },
  ];
  const statusCounts = new Map<string, number>();
  let handoffReadyCount = 0;
  let handoffIncompleteCount = 0;
  let unansweredFollowupCount = 0;

  adminRequests?.forEach((request) => {
    statusCounts.set(request.status, (statusCounts.get(request.status) ?? 0) + 1);
    const readiness = getAdminRequestReadiness({
      contact: parseContactSnapshot(request.contact_snapshot),
      details: parseRequestDetails(request.request_details),
      documents: parseDocumentChecklist(request.document_checklist),
      seekerProfile: undefined,
    });

    if (readiness.missing.length === 0) {
      handoffReadyCount += 1;
    } else if (request.status !== "completed" && request.status !== "rejected") {
      handoffIncompleteCount += 1;
    }

    if (
      hasUnansweredFollowup({
        request,
        supplements: supplementsByRequestId.get(request.id) ?? [],
      })
    ) {
      unansweredFollowupCount += 1;
    }
  });
  const workItems = [
    {
      href: "/admin/companies?status=pending",
      label: "기업 인증 검토",
      description: "가입한 기업/지점 중 운영자 확인이 필요한 건",
      tone: pendingCompanyCount ? "amber" : "slate",
      value: `${pendingCompanyCount ?? 0}건`,
    },
    {
      href: "/admin/admin-requests?status=partner_needed",
      label: "행정사 전달 가능",
      description: "기본 정보가 채워져 외부 전달을 검토할 수 있는 요청",
      tone: handoffReadyCount ? "blue" : "slate",
      value: `${handoffReadyCount}건`,
    },
    {
      href: "/admin/admin-requests",
      label: "요청 정보 보완 필요",
      description: "구직자 요청 중 연락처/학교/서류 체크가 부족한 건",
      tone: handoffIncompleteCount ? "amber" : "slate",
      value: `${handoffIncompleteCount}건`,
    },
    {
      href: "/admin/admin-requests?attention=followup_waiting",
      label: "구직자 답변 대기",
      description: "운영자가 보완을 요청했고 아직 새 제출이 없는 건",
      tone: unansweredFollowupCount ? "amber" : "slate",
      value: `${unansweredFollowupCount}건`,
    },
  ] as const;

  return (
    <DashboardShell area="admin">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          운영자 검토와 행정사 배정을 관리합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          기업 인증, 공고 관리, 행정 요청 배정, 개인정보 제공 동의 이력을
          운영자가 확인하는 콘솔입니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const content = (
            <>
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 text-3xl font-black">
                {metric.value.toLocaleString("ko-KR")}
              </p>
            </>
          );

          return metric.href ? (
            <Link
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50"
              href={metric.href}
              key={metric.label}
            >
              {content}
            </Link>
          ) : (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={metric.label}
            >
              {content}
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">확인하고 처리할 항목</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workItems.map((item) => (
            <Link
              className={cn(
                "rounded-xl border p-4 transition hover:bg-slate-50",
                item.tone === "amber" && "border-amber-100 bg-amber-50",
                item.tone === "blue" && "border-blue-100 bg-blue-50",
                item.tone === "slate" && "border-slate-200 bg-white",
              )}
              href={item.href}
              key={item.label}
            >
              <p className="text-sm font-black text-slate-900">{item.label}</p>
              <p className="mt-2 text-2xl font-black">{item.value}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">행정 요청 상태별 현황</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          위 항목은 운영자가 바로 확인할 작업이고, 이 영역은 전체 행정 요청의
          현재 진행 상태를 보여줍니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {requestStatusLabels.map((status) => (
            <Link
              className="rounded-xl bg-slate-50 p-4 transition hover:bg-blue-50"
              href={`/admin/admin-requests?status=${status.key}`}
              key={status.label}
            >
              <p className="text-sm font-bold text-slate-500">{status.label}</p>
              <p className="mt-2 text-2xl font-black">
                {(statusCounts.get(status.key) ?? 0).toLocaleString("ko-KR")}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-black">최근 행정 요청</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              전달 준비 초안과 누락 항목을 빠르게 확인합니다.
            </p>
          </div>
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            href="/admin/admin-requests"
          >
            전체 보기
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentRequests && recentRequests.length > 0 ? (
            recentRequests.map((request) => {
              const profile = profileById.get(request.seeker_id);
              const seekerProfile = seekerProfileById.get(request.seeker_id);
              const isWaitingForFollowup = hasUnansweredFollowup({
                request,
                supplements: supplementsByRequestId.get(request.id) ?? [],
              });
              const readiness = getAdminRequestReadiness({
                contact: parseContactSnapshot(request.contact_snapshot),
                details: parseRequestDetails(request.request_details),
                documents: parseDocumentChecklist(request.document_checklist),
                seekerProfile,
              });

              return (
                <article className="px-5 py-4" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-black text-slate-950">
                          {request.type}
                        </p>
                        <span
                          className={getStatusBadgeClassName(
                            "adminRequest",
                            request.status,
                          )}
                        >
                          {getStatusMeta("adminRequest", request.status).label}
                        </span>
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-black",
                            readiness.missing.length === 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          )}
                        >
                          {readiness.completed}/{readiness.total} 준비
                        </span>
                        {isWaitingForFollowup ? (
                          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                            답변 대기
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {profile?.name || profile?.email || "Seeker"} ·{" "}
                        {seekerProfile?.visa_type || "visa unknown"} ·{" "}
                        {seekerProfile?.school || "school unknown"}
                      </p>
                      {readiness.missing.length > 0 ? (
                        <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                          확인 필요: {readiness.missing.slice(0, 4).join(", ")}
                        </p>
                      ) : null}
                      {isWaitingForFollowup ? (
                        <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                          보완 요청 후 아직 구직자 답변이 없습니다.
                        </p>
                      ) : null}
                    </div>
                    <Link
                      className={cn(buttonVariants({ size: "sm" }))}
                      href={`/admin/admin-requests/${request.id}/handoff`}
                    >
                      전달 초안
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              아직 접수된 행정 요청이 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function hasUnansweredFollowup({
  request,
  supplements,
}: {
  request: {
    seeker_followup_note?: string | null;
    seeker_followup_requested_at?: string | null;
    status: string;
  };
  supplements: { created_at: string }[];
}) {
  if (
    !request.seeker_followup_note ||
    !request.seeker_followup_requested_at ||
    request.status === "completed" ||
    request.status === "rejected"
  ) {
    return false;
  }

  const requestedAt = new Date(request.seeker_followup_requested_at).getTime();

  return !supplements.some(
    (supplement) => new Date(supplement.created_at).getTime() >= requestedAt,
  );
}

function parseRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseRequestDetails(value: unknown) {
  const data = parseRecord(value);

  return {
    alienRegistrationStatus:
      typeof data.alien_registration_status === "string"
        ? data.alien_registration_status
        : "",
    currentVisaType: typeof data.current_visa_type === "string" ? data.current_visa_type : "",
    handoffConsent: data.handoff_consent === true,
    plannedWorkHours:
      typeof data.planned_work_hours === "string" ? data.planned_work_hours : "",
    school: typeof data.school === "string" ? data.school : "",
  };
}

function parseDocumentChecklist(value: unknown) {
  const data = parseRecord(value);

  return {
    ready: Array.isArray(data.ready) ? data.ready.filter((item) => typeof item === "string") : [],
  };
}

function parseContactSnapshot(value: unknown) {
  const data = parseRecord(value);

  return {
    email: typeof data.email === "string" ? data.email : "",
  };
}

function getAdminRequestReadiness({
  contact,
  details,
  documents,
  seekerProfile,
}: {
  contact: ReturnType<typeof parseContactSnapshot>;
  details: ReturnType<typeof parseRequestDetails>;
  documents: ReturnType<typeof parseDocumentChecklist>;
  seekerProfile:
    | {
        alien_registration_status: string | null;
        school: string | null;
        visa_type: string | null;
      }
    | undefined;
}) {
  const checks = [
    { done: Boolean(contact.email), label: "연락 이메일" },
    { done: Boolean(details.currentVisaType || seekerProfile?.visa_type), label: "체류자격" },
    {
      done: Boolean(
        details.alienRegistrationStatus || seekerProfile?.alien_registration_status,
      ),
      label: "외국인등록 상태",
    },
    { done: Boolean(details.school || seekerProfile?.school), label: "학교/기관" },
    { done: Boolean(details.plannedWorkHours), label: "예정 근무 시간" },
    { done: documents.ready.length > 0, label: "준비 서류 체크" },
    { done: details.handoffConsent, label: "외부 전달 동의" },
  ];
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    completed: checks.length - missing.length,
    missing,
    total: checks.length,
  };
}
