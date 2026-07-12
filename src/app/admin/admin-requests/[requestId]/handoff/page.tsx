import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationPrintActions } from "@/components/company/application-print-actions";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRequestHandoffDraftPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/admin/admin-requests/${requestId}/handoff`);
  }

  const { data: request } = await supabase
    .from("admin_requests")
    .select(
      "id, seeker_id, assigned_partner_id, type, status, memo, seeker_followup_note, seeker_followup_requested_at, request_details, document_checklist, contact_snapshot, created_at, updated_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    notFound();
  }

  const [
    { data: profile },
    { data: seekerProfile },
    { data: partner },
    { data: review },
    { data: supplements },
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, phone")
        .eq("id", request.seeker_id)
        .maybeSingle(),
      supabase
        .from("seeker_profiles")
        .select(
          "user_id, nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, available_times",
        )
        .eq("user_id", request.seeker_id)
        .maybeSingle(),
      request.assigned_partner_id
        ? supabase
            .from("profiles")
            .select("id, name, email")
            .eq("id", request.assigned_partner_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("admin_request_reviews")
        .select(
          "request_id, internal_note, handoff_status, handoff_hold_reason, reviewed_at",
        )
        .eq("request_id", request.id)
        .maybeSingle(),
      supabase
        .from("admin_request_supplements")
        .select("id, message, contact_snapshot, document_checklist, created_at")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false }),
    ]);

  const details = parseRequestDetails(request.request_details);
  const documents = parseDocumentChecklist(request.document_checklist);
  const contact = parseContactSnapshot(request.contact_snapshot);
  const readiness = getAdminRequestReadiness({
    contact,
    details,
    documents,
    seekerProfile,
  });
  const draftText = buildDraftText({
    contact,
    details,
    documents,
    partnerName: partner?.name || partner?.email || "미정",
    profile,
    readiness,
    review,
    request,
    seekerProfile,
    supplements: supplements ?? [],
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          .print-sheet { box-shadow: none !important; border: 0 !important; width: 100% !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-blue-700"
          href="/admin/admin-requests"
        >
          <ArrowLeft className="size-4" />
          행정 요청 목록으로 돌아가기
        </Link>
        <ApplicationPrintActions />
      </div>

      <section className="print-sheet mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-black">전달 준비 초안</p>
          <p className="mt-1 text-sm font-semibold leading-6">
            이 화면은 정식 행정사 전달 양식이 아닙니다. 운영자가 내용을 확인하고,
            외부 행정사와 합의한 포맷에 맞게 수정한 뒤 사용해야 합니다.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              Admin Request Handoff Draft
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {request.type}
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              요청 ID {request.id} · 접수 {new Date(request.created_at).toLocaleString("ko-KR")}
            </p>
          </div>
          <span className={getStatusBadgeClassName("adminRequest", request.status)}>
            {getStatusMeta("adminRequest", request.status).label}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Signal
            label="전달 준비도"
            tone={readiness.missing.length === 0 ? "green" : "amber"}
            value={`${readiness.completed}/${readiness.total}`}
          />
          <Signal
            label="동의 상태"
            tone={details.handoffConsent ? "green" : "red"}
            value={details.handoffConsent ? "외부 전달 동의" : "확인 필요"}
          />
          <Signal
            label="담당 파트너"
            tone={partner ? "green" : "slate"}
            value={partner?.name || partner?.email || "미정"}
          />
          <Signal
            label="전달 상태"
            tone={review?.handoff_status === "ready" || review?.handoff_status === "handed_off" ? "green" : review?.handoff_status === "paused" ? "amber" : "slate"}
            value={getHandoffStatusLabel(review?.handoff_status)}
          />
        </div>

        {readiness.missing.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-950">전달 전 확인 필요</p>
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
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="구직자" value={`${profile?.name || "이름 미입력"} · ${profile?.email || "-"}`} />
          <Info label="연락처" value={`${contact.email || profile?.email || "-"} · ${contact.phone || profile?.phone || "전화 미입력"}`} />
          <Info label="체류자격" value={`${details.currentVisaType || seekerProfile?.visa_type || "-"} · ${details.alienRegistrationStatus || seekerProfile?.alien_registration_status || "-"}`} />
          <Info label="학교/과정" value={`${details.school || seekerProfile?.school || "-"} · ${details.major || seekerProfile?.major || "전공 미입력"}`} />
          <Info label="희망 일정" value={`${details.targetStartDate || "시작일 미입력"} · ${details.plannedWorkHours || "근무 시간 미입력"}`} />
          <Info label="언어" value={`한국어 ${seekerProfile?.korean_level || "-"} · 영어 ${seekerProfile?.english_level || "-"}`} />
        </div>

        <section className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-black">준비 서류</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            {documents.ready.length > 0
              ? documents.ready.map(getDocumentLabel).join(", ")
              : "선택된 준비 서류가 없습니다."}
          </p>
          {documents.missingNote ? (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
              부족 서류/확인사항: {documents.missingNote}
            </p>
          ) : null}
        </section>

        <section className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-black">요청 메모</h2>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
            {request.memo || "요청 메모가 없습니다."}
          </p>
        </section>

        {request.seeker_followup_note || review?.handoff_hold_reason || review?.internal_note ? (
          <section className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-lg font-black">운영 확인 사항</h2>
            {request.seeker_followup_note ? (
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
                구직자 보완 요청: {request.seeker_followup_note}
              </p>
            ) : null}
            {review?.handoff_hold_reason ? (
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900">
                전달 보류/확인 사유: {review.handoff_hold_reason}
              </p>
            ) : null}
            {review?.internal_note ? (
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-blue-50 p-4 text-sm font-semibold leading-7 text-blue-900">
                내부 메모: {review.internal_note}
              </p>
            ) : null}
          </section>
        ) : null}

        {supplements && supplements.length > 0 ? (
          <section className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-lg font-black">구직자 보완 제출 이력</h2>
            <div className="mt-3 grid gap-3">
              {supplements.map((supplement) => {
                const supplementContact = parseContactSnapshot(
                  supplement.contact_snapshot,
                );
                const supplementDocuments = parseDocumentChecklist(
                  supplement.document_checklist,
                );

                return (
                  <div
                    className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"
                    key={supplement.id}
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      {new Date(supplement.created_at).toLocaleString("ko-KR")}
                    </p>
                    {supplement.message ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-emerald-950">
                        {supplement.message}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                      연락처: {supplementContact.email || "-"} ·{" "}
                      {supplementContact.phone || "전화 미입력"}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                      추가 준비 서류:{" "}
                      {supplementDocuments.ready.length > 0
                        ? supplementDocuments.ready.map(getDocumentLabel).join(", ")
                        : "선택 없음"}
                    </p>
                    {supplementDocuments.missingNote ? (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm font-semibold leading-6 text-amber-900">
                        추가 확인: {supplementDocuments.missingNote}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="text-lg font-black">복사용 초안</h2>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
            {draftText}
          </pre>
        </section>
      </section>
    </main>
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

function Signal({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "green" | "red" | "slate";
  value: string;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-3",
        tone === "green" ? "border-emerald-100 bg-emerald-50 text-emerald-950" : "",
        tone === "amber" ? "border-amber-100 bg-amber-50 text-amber-950" : "",
        tone === "red" ? "border-red-100 bg-red-50 text-red-950" : "",
        tone === "slate" ? "border-slate-100 bg-slate-50 text-slate-800" : "",
      ].join(" ")}
    >
      <p className="text-[11px] font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
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
    | null;
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

function buildDraftText({
  contact,
  details,
  documents,
  partnerName,
  profile,
  readiness,
  review,
  request,
  seekerProfile,
  supplements,
}: {
  contact: ReturnType<typeof parseContactSnapshot>;
  details: ReturnType<typeof parseRequestDetails>;
  documents: ReturnType<typeof parseDocumentChecklist>;
  partnerName: string;
  profile: { email: string | null; name: string | null; phone: string | null } | null;
  readiness: ReturnType<typeof getAdminRequestReadiness>;
  review: {
    handoff_hold_reason: string;
    handoff_status: string;
    internal_note: string;
    reviewed_at: string | null;
  } | null;
  request: {
    created_at: string;
    id: string;
    memo: string | null;
    seeker_followup_note: string;
    status: string;
    type: string;
  };
  seekerProfile: {
    alien_registration_status: string | null;
    english_level: string | null;
    korean_level: string | null;
    major: string | null;
    nationality: string | null;
    school: string | null;
    visa_type: string | null;
  } | null;
  supplements: {
    contact_snapshot: unknown;
    created_at: string;
    document_checklist: unknown;
    id: string;
    message: string;
  }[];
}) {
  return [
    "[Uniwork 행정 요청 전달 준비 초안]",
    "주의: 정식 행정사 전달 양식이 아니며, 운영자 검토 후 수정해서 사용합니다.",
    "",
    `요청 ID: ${request.id}`,
    `요청 유형: ${request.type}`,
    `현재 상태: ${getStatusMeta("adminRequest", request.status).label}`,
    `접수일: ${new Date(request.created_at).toLocaleString("ko-KR")}`,
    `담당 파트너: ${partnerName}`,
    `전달 상태: ${getHandoffStatusLabel(review?.handoff_status)}`,
    `전달 준비도: ${readiness.completed}/${readiness.total}`,
    readiness.missing.length > 0 ? `전달 전 확인 필요: ${readiness.missing.join(", ")}` : "전달 전 확인 필요: 없음",
    "",
    "[구직자/연락처]",
    `이름: ${profile?.name || "미입력"}`,
    `이메일: ${contact.email || profile?.email || "미입력"}`,
    `전화: ${contact.phone || profile?.phone || "미입력"}`,
    `국적: ${seekerProfile?.nationality || "미입력"}`,
    "",
    "[체류/학교 정보]",
    `현재 체류자격: ${details.currentVisaType || seekerProfile?.visa_type || "미입력"}`,
    `외국인등록 상태: ${details.alienRegistrationStatus || seekerProfile?.alien_registration_status || "미입력"}`,
    `학교/기관: ${details.school || seekerProfile?.school || "미입력"}`,
    `전공/과정: ${details.major || seekerProfile?.major || "미입력"}`,
    `한국어: ${seekerProfile?.korean_level || "미입력"}`,
    `영어: ${seekerProfile?.english_level || "미입력"}`,
    "",
    "[근무/일정]",
    `희망 시작일: ${details.targetStartDate || "미입력"}`,
    `예정 근무 시간: ${details.plannedWorkHours || "미입력"}`,
    "",
    "[준비 서류]",
    documents.ready.length > 0
      ? documents.ready.map(getDocumentLabel).join(", ")
      : "선택된 준비 서류 없음",
    documents.missingNote ? `부족 서류/확인사항: ${documents.missingNote}` : "부족 서류/확인사항: 없음",
    "",
    "[요청 메모]",
    request.memo || "요청 메모 없음",
    "",
    "[운영 확인 사항]",
    request.seeker_followup_note
      ? `구직자 보완 요청: ${request.seeker_followup_note}`
      : "구직자 보완 요청: 없음",
    review?.handoff_hold_reason
      ? `전달 보류/확인 사유: ${review.handoff_hold_reason}`
      : "전달 보류/확인 사유: 없음",
    "",
    "[구직자 보완 제출 이력]",
    supplements.length > 0
      ? supplements
          .map((supplement, index) => {
            const supplementContact = parseContactSnapshot(
              supplement.contact_snapshot,
            );
            const supplementDocuments = parseDocumentChecklist(
              supplement.document_checklist,
            );

            return [
              `${index + 1}. ${new Date(supplement.created_at).toLocaleString("ko-KR")}`,
              `메시지: ${supplement.message || "없음"}`,
              `연락처: ${supplementContact.email || "미입력"} / ${supplementContact.phone || "전화 미입력"}`,
              `추가 준비 서류: ${
                supplementDocuments.ready.length > 0
                  ? supplementDocuments.ready.map(getDocumentLabel).join(", ")
                  : "선택 없음"
              }`,
              supplementDocuments.missingNote
                ? `추가 확인: ${supplementDocuments.missingNote}`
                : "추가 확인: 없음",
            ].join("\n");
          })
          .join("\n\n")
      : "제출된 보완 이력 없음",
  ].join("\n");
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
