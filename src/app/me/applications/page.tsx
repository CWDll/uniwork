import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function SeekerApplicationsPage() {
  return (
    <DashboardShell area="me">
      <PlaceholderPage
        description="구직자가 지원한 공고, 지원 상태, 기업 피드백을 확인하는 화면입니다."
        title="My applications"
      />
    </DashboardShell>
  );
}
