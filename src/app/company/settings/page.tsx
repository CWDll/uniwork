import { redirect } from "next/navigation";

import { CompanySettingsForm } from "@/components/company/company-settings-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function CompanySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/company/settings");
  }

  const { data: company } = await supabase
    .from("companies")
    .select(
      "name, business_number, industry, address, manager_name, manager_phone",
    )
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <DashboardShell area="company">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company settings
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          기업 정보를 저장합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          기업명과 담당자 정보를 저장해야 채용공고를 작성할 수 있습니다.
          사업자번호는 MVP 단계에서는 검증 상태 표시용으로만 보관합니다.
        </p>
      </div>

      <CompanySettingsForm company={company} />
    </DashboardShell>
  );
}
