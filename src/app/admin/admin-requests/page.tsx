import Link from "next/link";
import { redirect } from "next/navigation";

import { markAdminRequestSupplementsCheckedAction } from "@/app/admin/admin-requests/actions";
import { AdminRequestUpdateForm } from "@/components/admin-requests/admin-request-update-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AdminRequestsSearchParams = {
  attention?: string;
  status?: string;
};

type RequestOperation = {
  hasSupplementAfterFollowup: boolean;
  hasUncheckedSupplement: boolean;
  isHandoffReady: boolean;
  isWaitingForFollowup: boolean;
  latestActivityAt: string;
  latestSupplementAt: string | null;
  priority: number;
  readiness: ReturnType<typeof getAdminRequestReadiness>;
};

const requestFilters = [
  { value: "", label: "전체" },
  { value: "received", label: "접수" },
  { value: "reviewing", label: "운영자 검토" },
  { value: "partner_needed", label: "행정사 전달 필요" },
  { value: "assigned", label: "행정사 배정" },
  { value: "completed", label: "완료" },
  { value: "rejected", label: "반려" },
];

const attentionFilters = [
  {
    description: "보완 요청 후 아직 제출 이력이 없는 요청",
    label: "보완 답변 대기",
    value: "followup_waiting",
  },
  {
    description: "구직자가 제출했고 운영자가 아직 확인하지 않은 요청",
    label: "새 보완 확인 필요",
    value: "unchecked_supplement",
  },
  {
    description: "기본 전달 패킷이 채워진 요청",
    label: "전달 준비 완료",
    value: "handoff_ready",
  },
];

function buildAdminRequestsHref(status?: string) {
  return status ? `/admin/admin-requests?status=${status}` : "/admin/admin-requests";
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<AdminRequestsSearchParams>;
}) {
  const params = await searchParams;
  const activeStatus = params.status?.trim() ?? "";
  const activeAttention = params.attention?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/admin-requests");
  }

  const { data: allRequests } = await supabase
    .from("admin_requests")
    .select(
      "id, seeker_id, assigned_partner_id, type, status, memo, seeker_followup_note, seeker_followup_requested_at, request_details, document_checklist, contact_snapshot, created_at, updated_at",
    )
    .order("created_at", { ascending: false });
  const statusCounts = new Map<string, number>();
  allRequests?.forEach((request) => {
    statusCounts.set(request.status, (statusCounts.get(request.status) ?? 0) + 1);
  });

  const seekerIds = Array.from(
    new Set(allRequests?.map((request) => request.seeker_id) ?? []),
  );
  const { data: profiles } =
    seekerIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", seekerIds)
      : { data: [] };
  const { data: seekerProfiles } =
    seekerIds.length > 0
      ? await supabase
        .from("seeker_profiles")
        .select(
          "user_id, nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, available_times",
        )
        .in("user_id", seekerIds)
      : { data: [] };
  const { data: partners } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "partner")
    .order("created_at", { ascending: false });
  const requestIds = allRequests?.map((request) => request.id) ?? [];
  const [{ data: reviews }, { data: supplements }] =
    requestIds.length > 0
      ? await Promise.all([
          supabase
            .from("admin_request_reviews")
            .select(
              "request_id, internal_note, handoff_status, handoff_hold_reason, reviewed_at, supplement_checked_at",
            )
            .in("request_id", requestIds),
          supabase
            .from("admin_request_supplements")
            .select(
              "id, request_id, message, contact_snapshot, document_checklist, created_at",
            )
            .in("request_id", requestIds)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

  const profileById = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);
  const seekerProfileById = new Map(
    seekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
  );
  const reviewByRequestId = new Map(
    reviews?.map((review) => [review.request_id, review]) ?? [],
  );
  const supplementsByRequestId = new Map<string, NonNullable<typeof supplements>>();
  supplements?.forEach((supplement) => {
    const existing = supplementsByRequestId.get(supplement.request_id) ?? [];
    supplementsByRequestId.set(supplement.request_id, [...existing, supplement]);
  });
  const operationsByRequestId = new Map<string, RequestOperation>();
  allRequests?.forEach((request) => {
    const requestSupplements = supplementsByRequestId.get(request.id) ?? [];
    const seekerProfile = seekerProfileById.get(request.seeker_id);
    const readiness = getAdminRequestReadiness({
      contact: parseContactSnapshot(request.contact_snapshot),
      details: parseRequestDetails(request.request_details),
      documents: parseDocumentChecklist(request.document_checklist),
      seekerProfile,
    });
    const latestSupplement = getLatestSupplement(requestSupplements);
    const isWaitingForFollowup = hasUnansweredFollowup({
      request,
      supplements: requestSupplements,
    });
    const hasSupplementAfterFollowup = hasSupplementSubmittedAfterFollowup({
      request,
      supplements: requestSupplements,
    });
    const latestSupplementAt = latestSupplement?.created_at ?? null;
    const hasUncheckedSupplement = hasUncheckedSupplementAfterCheck({
      latestSupplementAt,
      supplementCheckedAt: reviewByRequestId.get(request.id)?.supplement_checked_at,
    });
    const isHandoffReady =
      readiness.missing.length === 0 &&
      request.status !== "completed" &&
      request.status !== "rejected";

    operationsByRequestId.set(request.id, {
      hasSupplementAfterFollowup,
      hasUncheckedSupplement,
      isHandoffReady,
      isWaitingForFollowup,
      latestActivityAt: getLatestActivityAt({
        latestSupplementAt,
        requestUpdatedAt: request.updated_at,
        reviewUpdatedAt: reviewByRequestId.get(request.id)?.reviewed_at,
      }),
      latestSupplementAt,
      priority: getRequestPriority({
        hasSupplementAfterFollowup,
        hasUncheckedSupplement,
        isHandoffReady,
        isWaitingForFollowup,
        status: request.status,
      }),
      readiness,
    });
  });
  const attentionCounts = {
    followup_waiting: Array.from(operationsByRequestId.values()).filter(
      (operation) => operation.isWaitingForFollowup,
    ).length,
    handoff_ready: Array.from(operationsByRequestId.values()).filter(
      (operation) => operation.isHandoffReady,
    ).length,
    unchecked_supplement: Array.from(operationsByRequestId.values()).filter(
      (operation) => operation.hasUncheckedSupplement,
    ).length,
  };
  const requests = (activeStatus
    ? allRequests?.filter((request) => request.status === activeStatus)
    : allRequests
  )
    ?.filter((request) => {
      const operation = operationsByRequestId.get(request.id);

      if (activeAttention === "followup_waiting") {
        return operation?.isWaitingForFollowup;
      }

      if (activeAttention === "unchecked_supplement") {
        return operation?.hasUncheckedSupplement;
      }

      if (activeAttention === "handoff_ready") {
        return operation?.isHandoffReady;
      }

      return true;
    })
    .sort((a, b) => {
      const operationA = operationsByRequestId.get(a.id);
      const operationB = operationsByRequestId.get(b.id);

      if ((operationA?.priority ?? 99) !== (operationB?.priority ?? 99)) {
        return (operationA?.priority ?? 99) - (operationB?.priority ?? 99);
      }

      return (
        new Date(operationB?.latestActivityAt ?? b.updated_at).getTime() -
        new Date(operationA?.latestActivityAt ?? a.updated_at).getTime()
      );
    });

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Administrative request operations
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          행정 요청을 검토하고 상태를 변경합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          MVP에서는 운영자가 요청을 검토하고 상태를 수동으로 관리합니다.
          행정사 계정/배정 UI는 다음 단계에서 확장합니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {attentionFilters.map((filter) => {
          const isActive = activeAttention === filter.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-white hover:bg-amber-50",
              )}
              href={
                isActive
                  ? "/admin/admin-requests"
                  : `/admin/admin-requests?attention=${filter.value}`
              }
              key={filter.value}
            >
              <p className="text-sm font-black text-slate-500">{filter.label}</p>
              <p className="mt-1 text-2xl font-black">
                {attentionCounts[
                  filter.value as keyof typeof attentionCounts
                ].toLocaleString("ko-KR")}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                {filter.description}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {requestFilters.slice(1).map((filter) => {
          const isActive = activeStatus === filter.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={buildAdminRequestsHref(isActive ? "" : filter.value)}
              key={filter.value}
            >
              <p className="text-sm font-black text-slate-500">{filter.label}</p>
              <p className="mt-1 text-2xl font-black">
                {(statusCounts.get(filter.value) ?? 0).toLocaleString("ko-KR")}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">
                Request queue {requests?.length ?? 0}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {activeAttention === "followup_waiting"
                  ? "보완 답변을 기다리는 행정 요청"
                  : activeAttention === "unchecked_supplement"
                  ? "구직자가 보완 내용을 제출했고 아직 확인하지 않은 요청"
                  : activeAttention === "handoff_ready"
                  ? "외부 전달 준비가 된 행정 요청"
                  : activeStatus
                  ? `${getStatusMeta("adminRequest", activeStatus).label} 요청`
                  : "접수된 모든 행정 요청"}
              </p>
            </div>
            {activeStatus || activeAttention ? (
              <Link
                className="text-sm font-black text-blue-700 hover:text-blue-900"
                href="/admin/admin-requests"
              >
                전체 보기
              </Link>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {requests && requests.length > 0 ? (
            requests.map((request) => {
              const profile = profileById.get(request.seeker_id);
              const seekerProfile = seekerProfileById.get(request.seeker_id);
              const assignedPartner = partners?.find(
                (partner) => partner.id === request.assigned_partner_id,
              );
              const details = parseRequestDetails(request.request_details);
              const documents = parseDocumentChecklist(request.document_checklist);
              const contact = parseContactSnapshot(request.contact_snapshot);
              const review = reviewByRequestId.get(request.id);
              const requestSupplements = supplementsByRequestId.get(request.id) ?? [];
              const operation = operationsByRequestId.get(request.id);
              const isWaitingForFollowup = operation?.isWaitingForFollowup ?? false;
              const readiness =
                operation?.readiness ??
                getAdminRequestReadiness({
                  contact,
                  details,
                  documents,
                  seekerProfile,
                });

              return (
                <article className="grid gap-4 px-4 py-4 sm:px-5" key={request.id}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-black">{request.type}</h3>
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                          {readiness.completed}/{readiness.total} 준비
                        </span>
                        <span
                          className={getStatusBadgeClassName(
                            "adminRequest",
                            request.status,
                          )}
                        >
                          {getStatusMeta("adminRequest", request.status).label}
                        </span>
                        {isWaitingForFollowup ? (
                          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                            답변 대기
                          </span>
                        ) : null}
                        {operation?.hasSupplementAfterFollowup ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                            보완 제출
                          </span>
                        ) : null}
                        {operation?.hasUncheckedSupplement ? (
                          <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                            미확인
                          </span>
                        ) : null}
                        {operation?.isHandoffReady ? (
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                            전달 준비
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                        {profile?.name || profile?.email || "Seeker"} ·{" "}
                        {seekerProfile?.nationality || "-"} ·{" "}
                        {seekerProfile?.visa_type || "visa unknown"} ·{" "}
                        {seekerProfile?.school || "school unknown"}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        <Info
                          label="Contact"
                          value={`${contact.email || profile?.email || "-"} · ${contact.phone || "전화 미입력"}`}
                        />
                        <Info
                          label="Visa packet"
                          value={`${details.currentVisaType || seekerProfile?.visa_type || "-"} · ${details.alienRegistrationStatus || seekerProfile?.alien_registration_status || "-"}`}
                        />
                        <Info
                          label="School"
                          value={`${details.school || seekerProfile?.school || "-"} · ${details.major || seekerProfile?.major || "전공 미입력"}`}
                        />
                        <Info
                          label="Target"
                          value={`${details.targetStartDate || "시작일 미입력"} · ${details.plannedWorkHours || "시간 미입력"}`}
                        />
                        <Info
                          label="Documents"
                          value={`${documents.ready.length}개 준비 · ${documents.missingNote ? "누락 메모 있음" : "누락 메모 없음"}`}
                        />
                        <Info
                          label="Consent"
                          value={details.handoffConsent ? "외부 전달 동의" : "동의 확인 필요"}
                        />
                        <Info
                          label="Handoff"
                          value={`${getHandoffStatusLabel(review?.handoff_status)} · ${review?.reviewed_at ? new Date(review.reviewed_at).toLocaleString("ko-KR") : "검토 이력 없음"}`}
                        />
                        <Info
                          label="Follow-up"
                          value={`${requestSupplements.length.toLocaleString("ko-KR")}건 제출 · ${
                            operation?.latestSupplementAt
                              ? new Date(operation.latestSupplementAt).toLocaleString("ko-KR")
                              : "제출 없음"
                          }`}
                        />
                        <Info
                          label="Checked"
                          value={
                            review?.supplement_checked_at
                              ? new Date(review.supplement_checked_at).toLocaleString("ko-KR")
                              : "확인 이력 없음"
                          }
                        />
                      </div>
                      {request.seeker_followup_note ? (
                        <div
                          className={cn(
                            "mt-3 rounded-xl border p-3",
                            isWaitingForFollowup
                              ? "border-amber-100 bg-amber-50"
                              : "border-emerald-100 bg-emerald-50",
                          )}
                        >
                          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                            Seeker follow-up
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-900">
                            {request.seeker_followup_note}
                          </p>
                          <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                            {isWaitingForFollowup
                              ? "보완 요청 후 아직 구직자 제출 이력이 없습니다."
                              : "보완 요청 이후 구직자 제출 이력이 있습니다."}
                          </p>
                        </div>
                      ) : null}
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Handoff checklist
                        </p>
                        {readiness.missing.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {readiness.missing.map((item) => (
                              <span
                                className="rounded-md bg-white px-2 py-1 text-xs font-black text-amber-700"
                                key={item}
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm font-semibold text-emerald-700">
                            외부 행정사에게 전달할 기본 정보가 준비되어 있습니다.
                          </p>
                        )}
                        {documents.ready.length > 0 ? (
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                            준비 서류: {documents.ready.map(getDocumentLabel).join(", ")}
                          </p>
                        ) : null}
                        {documents.missingNote ? (
                          <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
                            부족 서류/확인사항: {documents.missingNote}
                          </p>
                        ) : null}
                        {review?.handoff_hold_reason ? (
                          <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
                            전달 보류/확인 사유: {review.handoff_hold_reason}
                          </p>
                        ) : null}
                      </div>
                      {review?.internal_note ? (
                        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">
                          내부 메모: {review.internal_note}
                        </p>
                      ) : null}
                      {requestSupplements.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                                Seeker supplements
                              </p>
                              {operation?.hasUncheckedSupplement ? (
                                <p className="mt-1 text-xs font-bold text-red-700">
                                  새 보완 제출이 아직 확인 처리되지 않았습니다.
                                </p>
                              ) : null}
                            </div>
                            <form action={markAdminRequestSupplementsCheckedAction}>
                              <input
                                name="request_id"
                                type="hidden"
                                value={request.id}
                              />
                              <button
                                className={cn(
                                  buttonVariants({
                                    size: "sm",
                                    variant: operation?.hasUncheckedSupplement
                                      ? "default"
                                      : "outline",
                                  }),
                                )}
                                type="submit"
                              >
                                보완 제출 확인
                              </button>
                            </form>
                          </div>
                          <div className="mt-2 grid gap-2">
                            {requestSupplements.slice(0, 3).map((supplement) => {
                              const supplementContact = parseContactSnapshot(
                                supplement.contact_snapshot,
                              );
                              const supplementDocuments = parseDocumentChecklist(
                                supplement.document_checklist,
                              );

                              return (
                                <div
                                  className="rounded-lg bg-white p-3"
                                  key={supplement.id}
                                >
                                  <p className="text-xs font-bold text-emerald-700">
                                    {new Date(supplement.created_at).toLocaleString(
                                      "ko-KR",
                                    )}
                                  </p>
                                  {supplement.message ? (
                                    <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                                      {supplement.message}
                                    </p>
                                  ) : null}
                                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                                    연락처: {supplementContact.email || "-"} ·{" "}
                                    {supplementContact.phone || "전화 미입력"} / 서류{" "}
                                    {supplementDocuments.ready.length}개
                                  </p>
                                  {supplementDocuments.missingNote ? (
                                    <p className="mt-1 text-xs font-bold leading-5 text-amber-700">
                                      추가 확인: {supplementDocuments.missingNote}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm font-semibold text-blue-700">
                        Assigned partner:{" "}
                        {assignedPartner?.name || assignedPartner?.email || "unassigned"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                          href={`/admin/admin-requests/${request.id}/handoff`}
                        >
                          전달 초안 보기
                        </Link>
                      </div>
                      {request.memo ? (
                        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-medium leading-6 text-slate-700">
                          {request.memo}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs font-bold text-slate-400">
                        Created{" "}
                        {new Date(request.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>

                    <AdminRequestUpdateForm
                      assignedPartnerId={request.assigned_partner_id}
                      handoffHoldReason={review?.handoff_hold_reason ?? ""}
                      handoffStatus={review?.handoff_status ?? "not_ready"}
                      internalNote={review?.internal_note ?? ""}
                      memo={request.memo}
                      partners={partners ?? []}
                      requestId={request.id}
                      seekerFollowupNote={request.seeker_followup_note ?? ""}
                      status={request.status}
                    />
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-700">{value}</p>
    </div>
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
    major: typeof data.major === "string" ? data.major : "",
    plannedWorkHours:
      typeof data.planned_work_hours === "string" ? data.planned_work_hours : "",
    school: typeof data.school === "string" ? data.school : "",
    targetStartDate:
      typeof data.target_start_date === "string" ? data.target_start_date : "",
  };
}

function parseDocumentChecklist(value: unknown) {
  const data = parseRecord(value);

  return {
    missingNote: typeof data.missing_note === "string" ? data.missing_note : "",
    ready: Array.isArray(data.ready) ? data.ready.filter((item) => typeof item === "string") : [],
  };
}

function parseContactSnapshot(value: unknown) {
  const data = parseRecord(value);

  return {
    email: typeof data.email === "string" ? data.email : "",
    phone: typeof data.phone === "string" ? data.phone : "",
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

function getDocumentLabel(value: string) {
  const labels: Record<string, string> = {
    alien_registration_card: "외국인등록증",
    attendance_or_transcript: "성적/출석 관련 서류",
    certificate_of_enrollment: "재학증명서",
    company_business_registration: "사업자등록증 사본",
    employment_contract: "근로계약서/채용 예정 확인",
    other: "기타 참고 서류",
    passport: "여권",
    school_approval: "학교 담당자 확인",
  };

  return labels[value] ?? value;
}

function getHandoffStatusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    handed_off: "전달 완료",
    not_ready: "준비 중",
    paused: "보류",
    ready: "전달 준비 완료",
  };

  return labels[value ?? "not_ready"] ?? "준비 중";
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

function hasSupplementSubmittedAfterFollowup({
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

  return supplements.some(
    (supplement) => new Date(supplement.created_at).getTime() >= requestedAt,
  );
}

function getLatestSupplement<T extends { created_at: string }>(supplements: T[]) {
  return supplements.reduce<T | null>((latest, supplement) => {
    if (!latest) {
      return supplement;
    }

    return new Date(supplement.created_at).getTime() >
      new Date(latest.created_at).getTime()
      ? supplement
      : latest;
  }, null);
}

function getLatestActivityAt({
  latestSupplementAt,
  requestUpdatedAt,
  reviewUpdatedAt,
}: {
  latestSupplementAt?: string | null;
  requestUpdatedAt: string;
  reviewUpdatedAt?: string | null;
}) {
  return [latestSupplementAt, requestUpdatedAt, reviewUpdatedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function getRequestPriority({
  hasSupplementAfterFollowup,
  hasUncheckedSupplement,
  isHandoffReady,
  isWaitingForFollowup,
  status,
}: {
  hasSupplementAfterFollowup: boolean;
  hasUncheckedSupplement: boolean;
  isHandoffReady: boolean;
  isWaitingForFollowup: boolean;
  status: string;
}) {
  if (isWaitingForFollowup) {
    return 0;
  }

  if (hasUncheckedSupplement) {
    return 1;
  }

  if (hasSupplementAfterFollowup) {
    return 2;
  }

  if (isHandoffReady) {
    return 3;
  }

  if (status === "completed" || status === "rejected") {
    return 5;
  }

  return 4;
}

function hasUncheckedSupplementAfterCheck({
  latestSupplementAt,
  supplementCheckedAt,
}: {
  latestSupplementAt?: string | null;
  supplementCheckedAt?: string | null;
}) {
  if (!latestSupplementAt) {
    return false;
  }

  if (!supplementCheckedAt) {
    return true;
  }

  return (
    new Date(latestSupplementAt).getTime() >
    new Date(supplementCheckedAt).getTime()
  );
}
