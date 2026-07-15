import Link from "next/link";

import { AdminRequestForm } from "@/components/admin-requests/admin-request-form";
import { AdminRequestSupplementForm } from "@/components/admin-requests/admin-request-supplement-form";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function SeekerAdminRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: requests } = user
    ? await supabase
        .from("admin_requests")
        .select(
          "id, type, status, memo, seeker_followup_note, seeker_followup_requested_at, request_details, document_checklist, contact_snapshot, created_at, updated_at",
        )
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const requestIds = requests?.map((request) => request.id) ?? [];
  const { data: supplements } =
    requestIds.length > 0
      ? await supabase
          .from("admin_request_supplements")
          .select(
            "id, request_id, message, contact_snapshot, document_checklist, created_at",
          )
          .in("request_id", requestIds)
          .order("created_at", { ascending: false })
      : { data: [] };
  const supplementsByRequestId = new Map<string, NonNullable<typeof supplements>>();
  supplements?.forEach((supplement) => {
    const existing = supplementsByRequestId.get(supplement.request_id) ?? [];
    supplementsByRequestId.set(supplement.request_id, [...existing, supplement]);
  });

  return (
    <DashboardShell area="me">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Administrative requests
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          행정 요청을 접수하고 진행 상태를 확인합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          요청 시 개인정보 제공 동의 이력을 남기고, 운영자가 검토 후 필요한
          경우 행정사 파트너에게 수동 배정합니다.
        </p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(420px,0.95fr)_minmax(0,1.05fr)]">
        <AdminRequestForm />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black">
              Requests {requests?.length ?? 0}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {requests && requests.length > 0 ? (
              requests.map((request) => {
                const status = getStatusMeta("adminRequest", request.status);
                const details = parseRequestDetails(request.request_details);
                const documents = parseDocumentChecklist(request.document_checklist);
                const contact = parseContactSnapshot(request.contact_snapshot);

                return (
                  <article className="px-5 py-4" id={`request-${request.id}`} key={request.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{request.type}</h3>
                      <span
                        className={getStatusBadgeClassName(
                          "adminRequest",
                          request.status,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    {request.memo ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
                        {request.memo}
                      </p>
                    ) : null}
                    {request.seeker_followup_note ? (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                          보완 요청
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-900">
                          {request.seeker_followup_note}
                        </p>
                        {request.seeker_followup_requested_at ? (
                          <p className="mt-2 text-xs font-bold text-amber-700">
                            요청일{" "}
                            {new Date(
                              request.seeker_followup_requested_at,
                            ).toLocaleString("ko-KR")}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            className={cn(buttonVariants({ size: "sm" }))}
                            href={`#supplement-${request.id}`}
                          >
                            보완 내용 입력
                          </a>
                          <Link
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                            )}
                            href="/me/profile"
                          >
                            프로필 수정
                          </Link>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Info
                        label="체류자격/학교"
                        value={`${details.currentVisaType || "-"} · ${details.school || "-"}`}
                      />
                      <Info
                        label="연락처"
                        value={`${contact.email || "-"} · ${contact.phone || "전화 미입력"}`}
                      />
                      <Info
                        label="준비 서류"
                        value={`${documents.ready.length}개 선택`}
                      />
                      <Info
                        label="희망 시작일"
                        value={details.targetStartDate || "미입력"}
                      />
                    </div>
                    <details className="mt-3 rounded-xl border border-slate-100 bg-white">
                      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-slate-800 [&::-webkit-details-marker]:hidden">
                        접수 내용 전체 보기
                      </summary>
                      <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
                        <Info
                          label="요청 유형"
                          value={getAdminRequestTypeLabel(request.type)}
                        />
                        <Info
                          label="상태"
                          value={status.label}
                        />
                        <Info
                          label="현재 체류자격"
                          value={details.currentVisaType || "미입력"}
                        />
                        <Info
                          label="외국인등록 상태"
                          value={details.alienRegistrationStatus || "미입력"}
                        />
                        <Info
                          label="학교/기관"
                          value={details.school || "미입력"}
                        />
                        <Info
                          label="전공/과정"
                          value={details.major || "미입력"}
                        />
                        <Info
                          label="희망 근무 시작일"
                          value={details.targetStartDate || "미입력"}
                        />
                        <Info
                          label="예정 근무 시간"
                          value={details.plannedWorkHours || "미입력"}
                        />
                        <Info
                          label="연락 이메일"
                          value={contact.email || "미입력"}
                        />
                        <Info
                          label="연락 전화번호"
                          value={contact.phone || "전화 미입력"}
                        />
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            준비된 서류
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {documents.ready.length > 0 ? (
                              documents.ready.map((document) => (
                                <span
                                  className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700"
                                  key={document}
                                >
                                  {getDocumentLabel(document)}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm font-bold text-slate-500">
                                선택한 서류 없음
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            부족하거나 확인이 필요한 서류
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold text-slate-700">
                            {documents.missingNote || "입력 없음"}
                          </p>
                        </div>
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            요청 메모
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold text-slate-700">
                            {request.memo || "입력 없음"}
                          </p>
                        </div>
                      </div>
                    </details>
                    {documents.missingNote ? (
                      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                        부족한 서류: {documents.missingNote}
                      </p>
                    ) : null}
                    {(() => {
                      const requestSupplements =
                        supplementsByRequestId.get(request.id) ?? [];

                      return requestSupplements.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            제출한 보완 이력
                          </p>
                          <div className="mt-2 grid gap-2">
                            {requestSupplements.map((supplement) => {
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
                                  <p className="text-xs font-bold text-slate-400">
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
                      ) : null;
                    })()}
                    {request.seeker_followup_note &&
                    request.status !== "completed" &&
                    request.status !== "rejected" ? (
                      <div id={`supplement-${request.id}`}>
                        <AdminRequestSupplementForm
                          contactEmail={contact.email}
                          contactPhone={contact.phone}
                          requestId={request.id}
                        />
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      Created {new Date(request.created_at).toLocaleString("ko-KR")}
                    </p>
                  </article>
                );
              })
            ) : (
              <EmptyState
                actions={
                  <>
                    <a
                      className={cn(buttonVariants({ size: "sm" }))}
                      href="#new-admin-request"
                    >
                      새 요청 작성
                    </a>
                    <Link
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                      )}
                      href="/me/profile"
                    >
                      프로필 확인
                    </Link>
                  </>
                }
                description="시간제 취업 허가, 비자 가능성, 서류 검토가 필요하면 왼쪽 양식으로 요청을 접수하세요."
                title="아직 접수한 행정 요청이 없습니다."
              />
            )}
          </div>
        </section>
      </div>
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

function getAdminRequestTypeLabel(value: string) {
  const labels: Record<string, string> = {
    document_review: "서류 사전 검토",
    other: "기타 상담",
    part_time_work_permission: "시간제 취업 허가 검토",
    visa_eligibility_review: "비자 지원 가능성 검토",
  };

  return labels[value] ?? value;
}
