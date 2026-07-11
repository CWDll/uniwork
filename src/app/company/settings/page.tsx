import { redirect } from "next/navigation";

import { CompanySettingsForm } from "@/components/company/company-settings-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/company/settings");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select(
      "id, name, business_number, industry, address, manager_name, manager_phone, notification_email, email_notifications_enabled, verification_status, verification_note, verified_at",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell area="company">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company settings
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          회사와 지점을 등록합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          한 구인자 계정은 여러 회사 또는 지점을 소유할 수 있습니다. 공고는
          등록된 회사/지점 중 하나에 연결됩니다.
        </p>
      </div>

      <CompanySettingsForm />

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">Registered companies</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            대표가 여러 지점을 운영하는 경우 모두 등록할 수 있습니다.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {companies && companies.length > 0 ? (
            companies.map((company) => {
              const status = getStatusMeta(
                "companyVerification",
                company.verification_status,
              );
              const readiness = getCompanyReadiness({
                address: company.address,
                businessNumber: company.business_number,
                managerName: company.manager_name,
                managerPhone: company.manager_phone,
                notificationEmail: company.notification_email,
              });
              const guidance = getVerificationGuidance(company.verification_status);

              return (
                <article
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_280px]"
                  key={company.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black">{company.name}</h3>
                      <span
                        className={getStatusBadgeClassName(
                          "companyVerification",
                          company.verification_status,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {company.industry || "-"} · {company.address || "-"} ·{" "}
                      {company.business_number || "사업자번호 미입력"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      알림 이메일 {company.notification_email || "계정 이메일 사용"} ·{" "}
                      {company.email_notifications_enabled
                        ? "이메일 알림 ON"
                        : "이메일 알림 OFF"}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      <Info
                        label="Manager"
                        value={`${company.manager_name || "담당자명 미입력"} · ${company.manager_phone || "연락처 미입력"}`}
                      />
                      <Info
                        label="Readiness"
                        value={`${readiness.completed}/${readiness.total} 항목`}
                      />
                      <Info label="Next step" value={guidance.title} />
                    </div>
                    {readiness.missing.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {readiness.missing.map((item) => (
                          <span
                            className="rounded-md bg-amber-50 px-2 py-1 text-xs font-black text-amber-700"
                            key={item}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {company.verification_note ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
                        운영자 메모: {company.verification_note}
                      </p>
                    ) : null}
                    {company.verified_at ? (
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        검토일 {new Date(company.verified_at).toLocaleString("ko-KR")}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className={`h-max rounded-xl border p-3 ${guidance.className}`}
                  >
                    <p className="text-sm font-black">{guidance.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6">
                      {guidance.detail}
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8">
              <p className="text-sm font-black text-slate-700">
                아직 등록된 회사/지점이 없습니다.
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                위 양식에서 회사 정보를 저장하면 운영자가 인증 상태를 확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function getCompanyReadiness({
  address,
  businessNumber,
  managerName,
  managerPhone,
  notificationEmail,
}: {
  address?: string | null;
  businessNumber?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  notificationEmail?: string | null;
}) {
  const checks = [
    { done: Boolean(businessNumber?.trim()), label: "사업자번호" },
    { done: Boolean(address?.trim()), label: "주소" },
    { done: Boolean(managerName?.trim()), label: "담당자명" },
    { done: Boolean(managerPhone?.trim()), label: "담당자 연락처" },
    { done: Boolean(notificationEmail?.trim()), label: "알림 이메일" },
  ];
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    completed: checks.length - missing.length,
    missing,
    total: checks.length,
  };
}

function getVerificationGuidance(status?: string | null) {
  if (status === "verified") {
    return {
      className: "border-emerald-100 bg-emerald-50 text-emerald-950",
      detail: "이 회사/지점으로 공고를 등록하면 구직자에게 바로 공개됩니다.",
      title: "공고 등록 가능",
    };
  }

  if (status === "rejected") {
    return {
      className: "border-red-100 bg-red-50 text-red-950",
      detail: "운영자 메모를 확인하고 부족한 정보를 보완한 뒤 다시 요청해주세요.",
      title: "보완 필요",
    };
  }

  return {
    className: "border-amber-100 bg-amber-50 text-amber-950",
    detail: "운영자 인증 전까지 이 회사/지점으로는 공개 공고를 등록할 수 없습니다.",
    title: "인증 대기",
  };
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
