import Link from "next/link";
import { redirect } from "next/navigation";

import { updateCompanyVerificationAction } from "@/app/admin/companies/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AdminCompaniesSearchParams = {
  status?: string;
};

const verificationFilters = [
  { value: "", label: "전체" },
  { value: "pending", label: "검토 대기" },
  { value: "verified", label: "인증 완료" },
  { value: "rejected", label: "인증 반려" },
];

function buildCompaniesHref(status?: string) {
  return status ? `/admin/companies?status=${status}` : "/admin/companies";
}

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<AdminCompaniesSearchParams>;
}) {
  const params = await searchParams;
  const activeStatus = params.status?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/companies");
  }

  const { data: companies } = await (() => {
    let query = supabase
      .from("companies")
      .select(
        "id, owner_id, name, business_number, industry, address, manager_name, manager_phone, notification_email, email_notifications_enabled, verification_status, verification_note, verified_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (activeStatus) {
      query = query.eq("verification_status", activeStatus);
    }

    return query;
  })();
  const ownerIds = Array.from(new Set(companies?.map((company) => company.owner_id) ?? []));
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", ownerIds)
      : { data: [] };
  const ownerById = new Map(owners?.map((owner) => [owner.id, owner]) ?? []);
  const statusCounts = new Map<string, number>();
  companies?.forEach((company) => {
    statusCounts.set(
      company.verification_status,
      (statusCounts.get(company.verification_status) ?? 0) + 1,
    );
  });

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company verification
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          기업/지점 인증을 검토합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          기업 담당자가 등록한 회사와 지점 정보를 확인하고, 공개 공고 운영에
          필요한 보완 메모를 남깁니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {verificationFilters.slice(1).map((filter) => {
          const isActive = activeStatus === filter.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={buildCompaniesHref(isActive ? "" : filter.value)}
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
              <h2 className="text-lg font-black">Companies {companies?.length ?? 0}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {activeStatus
                  ? `${getStatusMeta("companyVerification", activeStatus).label} 기업`
                  : "등록된 모든 기업/지점"}
              </p>
            </div>
            {activeStatus ? (
              <Link
                className="text-sm font-black text-blue-700 hover:text-blue-900"
                href="/admin/companies"
              >
                전체 보기
              </Link>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {companies && companies.length > 0 ? (
            companies.map((company) => {
              const owner = ownerById.get(company.owner_id);
              const status = getStatusMeta(
                "companyVerification",
                company.verification_status,
              );

              return (
                <article
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_340px]"
                  key={company.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-black">{company.name}</h3>
                      <span
                        className={getStatusBadgeClassName(
                          "companyVerification",
                          company.verification_status,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-500">
                      {company.industry || "-"} · {company.address || "-"} ·{" "}
                      {company.business_number || "사업자번호 미입력"}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                      <Info
                        label="Owner"
                        value={`${owner?.name || "담당자"} · ${owner?.email || "-"}`}
                      />
                      <Info
                        label="Manager"
                        value={`${company.manager_name || "-"} · ${company.manager_phone || "-"}`}
                      />
                      <Info
                        label="Email alerts"
                        value={`${company.notification_email || owner?.email || "-"} · ${company.email_notifications_enabled ? "ON" : "OFF"}`}
                      />
                      <Info
                        label="Created"
                        value={new Date(company.created_at).toLocaleString("ko-KR")}
                      />
                      <Info
                        label="Reviewed"
                        value={
                          company.verified_at
                            ? new Date(company.verified_at).toLocaleString("ko-KR")
                            : "-"
                        }
                      />
                    </div>
                    {company.verification_note ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
                        운영자 메모: {company.verification_note}
                      </p>
                    ) : null}
                  </div>
                  <form
                    action={updateCompanyVerificationAction}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    <input name="company_id" type="hidden" value={company.id} />
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                      Verification note
                      <textarea
                        className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
                        defaultValue={company.verification_note ?? ""}
                        maxLength={700}
                        name="verification_note"
                        placeholder="인증/반려 사유 또는 보완 요청"
                      />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <StatusButton
                        currentStatus={company.verification_status}
                        status="verified"
                      >
                        인증
                      </StatusButton>
                      <StatusButton
                        currentStatus={company.verification_status}
                        status="rejected"
                      >
                        반려
                      </StatusButton>
                      <StatusButton
                        currentStatus={company.verification_status}
                        status="pending"
                      >
                        대기
                      </StatusButton>
                    </div>
                  </form>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              검토할 기업/지점이 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function StatusButton({
  children,
  currentStatus,
  status,
}: {
  children: React.ReactNode;
  currentStatus: string;
  status: string;
}) {
  const isCurrent = currentStatus === status;

  return (
    <Button
      disabled={isCurrent}
      name="verification_status"
      type="submit"
      value={status}
      variant={status === "verified" ? "default" : "outline"}
    >
      {isCurrent ? "현재 상태" : children}
    </Button>
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
