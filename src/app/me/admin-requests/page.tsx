import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminRequestForm } from "@/components/admin-requests/admin-request-form";
import { AdminRequestSupplementForm } from "@/components/admin-requests/admin-request-supplement-form";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function SeekerAdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = adminRequestsPageCopy[locale];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(getLocalizedPath("/login?next=/me/admin-requests", locale));
  }

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
  const { data: files } =
    requestIds.length > 0
      ? await supabase
          .from("admin_request_files")
          .select(
            "id, request_id, supplement_id, original_name, mime_type, size_bytes, source, uploaded_at",
          )
          .in("request_id", requestIds)
          .order("uploaded_at", { ascending: false })
      : { data: [] };
  const supplementsByRequestId = new Map<string, NonNullable<typeof supplements>>();
  supplements?.forEach((supplement) => {
    const existing = supplementsByRequestId.get(supplement.request_id) ?? [];
    supplementsByRequestId.set(supplement.request_id, [...existing, supplement]);
  });
  const filesByRequestId = new Map<string, NonNullable<typeof files>>();
  const filesBySupplementId = new Map<string, NonNullable<typeof files>>();
  files?.forEach((file) => {
    const existingByRequest = filesByRequestId.get(file.request_id) ?? [];
    filesByRequestId.set(file.request_id, [...existingByRequest, file]);

    if (file.supplement_id) {
      const existingBySupplement = filesBySupplementId.get(file.supplement_id) ?? [];
      filesBySupplementId.set(file.supplement_id, [
        ...existingBySupplement,
        file,
      ]);
    }
  });

  return (
    <DashboardShell area="me" locale={locale}>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          {t.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {t.title}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {t.description}
        </p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <AdminRequestForm locale={locale} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black">
              Requests {requests?.length ?? 0}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {requests && requests.length > 0 ? (
              requests.map((request) => {
                const status = getStatusMeta("adminRequest", request.status, locale);
                const details = parseRequestDetails(request.request_details);
                const documents = parseDocumentChecklist(request.document_checklist);
                const contact = parseContactSnapshot(request.contact_snapshot);
                const requestFiles = (filesByRequestId.get(request.id) ?? []).filter(
                  (file) => file.source === "request",
                );
                const requestSupplements =
                  supplementsByRequestId.get(request.id) ?? [];

                return (
                  <details
                    className="group px-5 py-4 open:bg-slate-50/60"
                    id={`request-${request.id}`}
                    key={request.id}
                  >
                    <summary className="grid cursor-pointer list-none gap-3 rounded-xl p-1 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-black">
                            {getAdminRequestTypeLabel(request.type, locale)}
                          </h3>
                          <span
                            className={getStatusBadgeClassName(
                              "adminRequest",
                              request.status,
                            )}
                          >
                            {status.label}
                          </span>
                          {request.seeker_followup_note ? (
                            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                              {t.followupRequested}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                          {details.currentVisaType || t.noVisa} ·{" "}
                          {details.school || t.noSchool} · {t.files}{" "}
                          {requestFiles.length.toLocaleString(locale === "en" ? "en-US" : "ko-KR")} · {t.supplements}{" "}
                          {requestSupplements.length.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
                        </p>
                      </div>
                      <span className="text-sm font-black text-blue-700 group-open:text-slate-500">
                        {t.details}
                      </span>
                    </summary>

                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">
                          {getAdminRequestTypeLabel(request.type, locale)}
                        </h3>
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
                          {t.followupRequested}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-900">
                          {request.seeker_followup_note}
                        </p>
                        {request.seeker_followup_requested_at ? (
                          <p className="mt-2 text-xs font-bold text-amber-700">
                            {t.requestedAt}{" "}
                            {new Date(
                              request.seeker_followup_requested_at,
                            ).toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            className={cn(buttonVariants({ size: "sm" }))}
                            href={`#supplement-${request.id}`}
                          >
                            {t.enterSupplement}
                          </a>
                          <Link
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                            )}
                            href={getLocalizedPath("/me/profile", locale)}
                          >
                            {t.editProfile}
                          </Link>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Info
                        label={t.info.visaSchool}
                        value={`${details.currentVisaType || "-"} · ${details.school || "-"}`}
                      />
                      <Info
                        label={t.info.contact}
                        value={`${contact.email || "-"} · ${contact.phone || t.noPhone}`}
                      />
                      <Info
                        label={t.info.readyDocuments}
                        value={`${documents.ready.length.toLocaleString(locale === "en" ? "en-US" : "ko-KR")} ${t.selected}`}
                      />
                      <Info
                        label={t.info.files}
                        value={`${requestFiles.length.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}`}
                      />
                      <Info
                        label={t.info.targetStartDate}
                        value={details.targetStartDate || t.notEntered}
                      />
                    </div>
                    <details className="mt-3 rounded-xl border border-slate-100 bg-white">
                      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-black text-slate-800 [&::-webkit-details-marker]:hidden">
                        {t.fullDetails}
                      </summary>
                      <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
                        <Info
                          label={t.info.requestType}
                          value={getAdminRequestTypeLabel(request.type, locale)}
                        />
                        <Info
                          label={t.info.status}
                          value={status.label}
                        />
                        <Info
                          label={t.info.currentVisa}
                          value={details.currentVisaType || t.notEntered}
                        />
                        <Info
                          label={t.info.alienRegistration}
                          value={details.alienRegistrationStatus || t.notEntered}
                        />
                        <Info
                          label={t.info.school}
                          value={details.school || t.notEntered}
                        />
                        <Info
                          label={t.info.major}
                          value={details.major || t.notEntered}
                        />
                        <Info
                          label={t.info.targetStartDate}
                          value={details.targetStartDate || t.notEntered}
                        />
                        <Info
                          label={t.info.plannedWorkHours}
                          value={details.plannedWorkHours || t.notEntered}
                        />
                        <Info
                          label={t.info.contactEmail}
                          value={contact.email || t.notEntered}
                        />
                        <Info
                          label={t.info.contactPhone}
                          value={contact.phone || t.noPhone}
                        />
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {t.readyDocuments}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {documents.ready.length > 0 ? (
                              documents.ready.map((document) => (
                                <span
                                  className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700"
                                  key={document}
                                >
                                  {getDocumentLabel(document, locale)}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm font-bold text-slate-500">
                                {t.noSelectedDocuments}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {t.missingDocuments}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold text-slate-700">
                            {documents.missingNote || t.notEntered}
                          </p>
                        </div>
                        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {t.memo}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold text-slate-700">
                            {request.memo || t.notEntered}
                          </p>
                        </div>
                        {requestFiles.length > 0 ? (
                          <div className="sm:col-span-2">
                            <FileList
                              files={requestFiles}
                              title={t.attachedFiles}
                            />
                          </div>
                        ) : null}
                      </div>
                    </details>
                    {documents.missingNote ? (
                      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                        {t.missingDocuments}: {documents.missingNote}
                      </p>
                    ) : null}
                    {requestSupplements.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            {t.submittedSupplements}
                          </p>
                          <div className="mt-2 grid gap-2">
                            {requestSupplements.map((supplement) => {
                              const supplementContact = parseContactSnapshot(
                                supplement.contact_snapshot,
                              );
                              const supplementDocuments = parseDocumentChecklist(
                                supplement.document_checklist,
                              );
                              const supplementFiles =
                                filesBySupplementId.get(supplement.id) ?? [];

                              return (
                                <div
                                  className="rounded-lg bg-white p-3"
                                  key={supplement.id}
                                >
                                  <p className="text-xs font-bold text-slate-400">
                                    {new Date(supplement.created_at).toLocaleString(
                                      locale === "en" ? "en-US" : "ko-KR",
                                    )}
                                  </p>
                                  {supplement.message ? (
                                    <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                                      {supplement.message}
                                    </p>
                                  ) : null}
                                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                                    {t.info.contact}: {supplementContact.email || "-"} ·{" "}
                                    {supplementContact.phone || t.noPhone} / {t.info.readyDocuments}{" "}
                                    {supplementDocuments.ready.length.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
                                  </p>
                                  {supplementDocuments.missingNote ? (
                                    <p className="mt-1 text-xs font-bold leading-5 text-amber-700">
                                      {t.additionalCheck}: {supplementDocuments.missingNote}
                                    </p>
                                  ) : null}
                                  {supplementFiles.length > 0 ? (
                                    <FileList
                                      files={supplementFiles}
                                      title={t.supplementFiles}
                                    />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    {request.seeker_followup_note &&
                    request.status !== "completed" &&
                    request.status !== "rejected" ? (
                      <div id={`supplement-${request.id}`}>
                        <AdminRequestSupplementForm
                          contactEmail={contact.email}
                          contactPhone={contact.phone}
                          locale={locale}
                          requestId={request.id}
                        />
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      {t.created} {new Date(request.created_at).toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
                    </p>
                    </div>
                  </details>
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
                      {t.newRequest}
                    </a>
                    <Link
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                      )}
                      href={getLocalizedPath("/me/profile", locale)}
                    >
                      {t.checkProfile}
                    </Link>
                  </>
                }
                description={t.emptyDescription}
                title={t.emptyTitle}
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

function FileList({
  files,
  title,
}: {
  files: {
    id: string;
    original_name: string;
    size_bytes: number;
  }[];
  title: string;
}) {
  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
        {title}
      </p>
      <div className="mt-2 grid gap-2">
        {files.map((file) => (
          <a
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:text-blue-700"
            href={`/api/me/admin-request-files/${file.id}/download`}
            key={file.id}
          >
            <span className="min-w-0 truncate">{file.original_name}</span>
            <span className="shrink-0 text-xs text-slate-400">
              {formatFileSize(file.size_bytes)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ko-KR")}KB`;
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

function getDocumentLabel(value: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    alien_registration_card: { en: "Alien registration card", ko: "외국인등록증" },
    attendance_or_transcript: { en: "Grades/attendance documents", ko: "성적/출석 관련 서류" },
    certificate_of_enrollment: { en: "Certificate of enrollment", ko: "재학증명서" },
    company_business_registration: { en: "Company business registration copy", ko: "사업자등록증 사본" },
    employment_contract: { en: "Employment contract or hiring confirmation", ko: "근로계약서/채용 예정 확인" },
    other: { en: "Other supporting document", ko: "기타 참고 서류" },
    passport: { en: "Passport", ko: "여권" },
    school_approval: { en: "School approval/contact confirmation", ko: "학교 담당자 확인" },
  };

  return labels[value]?.[locale] ?? value;
}

function getAdminRequestTypeLabel(value: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    document_review: { en: "Document pre-check", ko: "서류 사전 검토" },
    other: { en: "Other consultation", ko: "기타 상담" },
    part_time_work_permission: {
      en: "Part-time work permission review",
      ko: "시간제 취업 허가 검토",
    },
    visa_eligibility_review: { en: "Visa eligibility review", ko: "비자 지원 가능성 검토" },
  };

  return labels[value]?.[locale] ?? value;
}

const adminRequestsPageCopy = {
  en: {
    additionalCheck: "Additional check",
    attachedFiles: "Attached files",
    checkProfile: "Check profile",
    created: "Created",
    description:
      "When you submit a request, Uniwork stores your consent history. An operator reviews it and manually forwards it to an external administrative partner only when needed.",
    details: "Details",
    editProfile: "Edit profile",
    emptyDescription:
      "If you need a part-time work permission check, visa eligibility review, or document pre-check, submit a request from the form on the left.",
    emptyTitle: "No administrative requests yet.",
    enterSupplement: "Add supplement",
    eyebrow: "Administrative requests",
    files: "Files",
    followupRequested: "Supplement requested",
    fullDetails: "View full submission",
    info: {
      alienRegistration: "Alien registration status",
      contact: "Contact",
      contactEmail: "Contact email",
      contactPhone: "Contact phone",
      currentVisa: "Current visa status",
      files: "Attached files",
      major: "Major/program",
      plannedWorkHours: "Planned work hours",
      readyDocuments: "Ready documents",
      requestType: "Request type",
      school: "School/institution",
      status: "Status",
      targetStartDate: "Preferred start date",
      visaSchool: "Visa/school",
    },
    memo: "Request memo",
    missingDocuments: "Missing or uncertain documents",
    newRequest: "New request",
    noPhone: "No phone entered",
    noSchool: "School not entered",
    noSelectedDocuments: "No documents selected",
    noVisa: "Visa not entered",
    notEntered: "Not entered",
    readyDocuments: "Prepared documents",
    requestedAt: "Requested",
    selected: "selected",
    submittedSupplements: "Submitted supplement history",
    supplementFiles: "Supplement files",
    supplements: "Supplements",
    title: "Submit administrative requests and track progress",
  },
  ko: {
    additionalCheck: "추가 확인",
    attachedFiles: "첨부 파일",
    checkProfile: "프로필 확인",
    created: "Created",
    description:
      "요청 시 개인정보 제공 동의 이력을 남기고, 운영자가 검토 후 필요한 경우 행정사 파트너에게 수동 배정합니다.",
    details: "상세 보기",
    editProfile: "프로필 수정",
    emptyDescription:
      "시간제 취업 허가, 비자 가능성, 서류 검토가 필요하면 왼쪽 양식으로 요청을 접수하세요.",
    emptyTitle: "아직 접수한 행정 요청이 없습니다.",
    enterSupplement: "보완 내용 입력",
    eyebrow: "Administrative requests",
    files: "파일",
    followupRequested: "보완 요청",
    fullDetails: "접수 내용 전체 보기",
    info: {
      alienRegistration: "외국인등록 상태",
      contact: "연락처",
      contactEmail: "연락 이메일",
      contactPhone: "연락 전화번호",
      currentVisa: "현재 체류자격",
      files: "첨부 파일",
      major: "전공/과정",
      plannedWorkHours: "예정 근무 시간",
      readyDocuments: "준비 서류",
      requestType: "요청 유형",
      school: "학교/기관",
      status: "상태",
      targetStartDate: "희망 시작일",
      visaSchool: "체류자격/학교",
    },
    memo: "요청 메모",
    missingDocuments: "부족하거나 확인이 필요한 서류",
    newRequest: "새 요청 작성",
    noPhone: "전화 미입력",
    noSchool: "학교 미입력",
    noSelectedDocuments: "선택한 서류 없음",
    noVisa: "비자 미입력",
    notEntered: "미입력",
    readyDocuments: "준비된 서류",
    requestedAt: "요청일",
    selected: "개 선택",
    submittedSupplements: "제출한 보완 이력",
    supplementFiles: "보완 파일",
    supplements: "보완",
    title: "행정 요청을 접수하고 진행 상태를 확인합니다",
  },
} satisfies Record<Locale, Record<string, unknown>>;
