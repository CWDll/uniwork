import { updateAdminRequestAction } from "@/app/admin/admin-requests/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRequestsPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("admin_requests")
    .select("id, seeker_id, assigned_partner_id, type, status, memo, created_at, updated_at")
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
          .select("user_id, nationality, visa_type, school, korean_level")
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
        <h1 className="mt-3 text-3xl font-black tracking-tight">
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

              return (
                <article className="grid gap-4 px-5 py-4" key={request.id}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">{request.type}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {profile?.name || profile?.email || "Seeker"} ·{" "}
                        {seekerProfile?.nationality || "-"} ·{" "}
                        {seekerProfile?.visa_type || "visa unknown"} ·{" "}
                        {seekerProfile?.school || "school unknown"}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-blue-700">
                        Assigned partner:{" "}
                        {assignedPartner?.name || assignedPartner?.email || "unassigned"}
                      </p>
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

                    <form action={updateAdminRequestAction} className="grid gap-3">
                      <input name="request_id" type="hidden" value={request.id} />
                      <label className="grid gap-2 text-sm font-bold text-slate-700">
                        Status
                        <select
                          className="h-10 rounded-md border border-slate-200 px-3"
                          defaultValue={request.status}
                          name="status"
                        >
                          <option value="received">received</option>
                          <option value="reviewing">reviewing</option>
                          <option value="partner_needed">partner_needed</option>
                          <option value="assigned">assigned</option>
                          <option value="completed">completed</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-slate-700">
                        Operator memo
                        <textarea
                          className="min-h-24 rounded-md border border-slate-200 px-3 py-2"
                          defaultValue={request.memo ?? ""}
                          name="memo"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-slate-700">
                        Partner
                        <select
                          className="h-10 rounded-md border border-slate-200 px-3"
                          defaultValue={request.assigned_partner_id ?? ""}
                          name="assigned_partner_id"
                        >
                          <option value="">Unassigned</option>
                          {partners?.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name || partner.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button size="sm" type="submit">
                        Update
                      </Button>
                    </form>
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
