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
        .select("id, type, status, memo, created_at, updated_at")
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
