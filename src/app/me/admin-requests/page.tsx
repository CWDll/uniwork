import { AdminRequestForm } from "@/components/admin-requests/admin-request-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";

export default async function SeekerAdminRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: requests } = user
    ? await supabase
        .from("admin_requests")
        .select(
          "id, type, status, memo, request_details, document_checklist, contact_snapshot, created_at, updated_at",
        )
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

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

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
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
                  <article className="px-5 py-4" key={request.id}>
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
                    {documents.missingNote ? (
                      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                        부족한 서류: {documents.missingNote}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      Created {new Date(request.created_at).toLocaleString("ko-KR")}
                    </p>
                  </article>
                );
              })
            ) : (
              <div className="px-5 py-8 text-sm font-semibold text-slate-500">
                아직 접수한 행정 요청이 없습니다.
              </div>
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
    currentVisaType: typeof data.current_visa_type === "string" ? data.current_visa_type : "",
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
