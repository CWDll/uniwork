import Link from "next/link";

import { AdminRequestUpdateForm } from "@/components/admin-requests/admin-request-update-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function AdminRequestsPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("admin_requests")
    .select(
      "id, seeker_id, assigned_partner_id, type, status, memo, request_details, document_checklist, contact_snapshot, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const seekerIds = Array.from(new Set(requests?.map((request) => request.seeker_id) ?? []));
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

  const profileById = new Map(profiles?.map((profile) => [profile.id, profile]) ?? []);
  const seekerProfileById = new Map(
    seekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
  );

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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">
            Request queue {requests?.length ?? 0}
          </h2>
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
              const readiness = getAdminRequestReadiness({
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
                      </div>
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
                      </div>
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
                      memo={request.memo}
                      partners={partners ?? []}
                      requestId={request.id}
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
