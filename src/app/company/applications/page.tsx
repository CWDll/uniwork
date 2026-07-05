import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CompanyApplicationsPage() {
  return (
    <DashboardShell area="company">
      <PlaceholderPage
        description="기업이 지원자 목록과 구직자 프로필 요약, 지원 상태를 확인하는 화면입니다."
        title="Applicants"
      />
    </DashboardShell>
  );
}
