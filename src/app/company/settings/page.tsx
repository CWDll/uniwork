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
      "id, name, business_number, industry, address, notification_email, email_notifications_enabled, verification_status",
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

              return (
                <article
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  key={company.id}
                >
                  <div>
                    <h3 className="font-black">{company.name}</h3>
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
                  </div>
                  <span
                    className={getStatusBadgeClassName(
                      "companyVerification",
                      company.verification_status,
                    )}
                  >
                    {status.label}
                  </span>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-8 text-sm font-semibold text-slate-500">
              아직 등록된 회사/지점이 없습니다.
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
