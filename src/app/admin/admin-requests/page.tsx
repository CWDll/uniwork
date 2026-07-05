import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminRequestsPage() {
  return (
    <DashboardShell area="admin">
      <PlaceholderPage
        description="운영자가 행정 상담 요청을 1차 검토한 뒤 행정사 파트너에게 수동 배정하는 화면입니다."
        title="Administrative request operations"
      />
    </DashboardShell>
  );
}
