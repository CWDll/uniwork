import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CompanySettingsPage() {
  return (
    <DashboardShell area="company">
      <PlaceholderPage
        description="기업 정보, 담당자 연락처, 사업자 정보, 운영자 검증 상태를 관리하는 화면입니다."
        title="Company settings"
      />
    </DashboardShell>
  );
}
