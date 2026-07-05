import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function SeekerAdminRequestsPage() {
  return (
    <DashboardShell area="me">
      <PlaceholderPage
        description="구직자가 행정 상담을 요청하고, 운영자 검토 및 행정사 배정 상태를 확인하는 화면입니다."
        title="Administrative requests"
      />
    </DashboardShell>
  );
}
