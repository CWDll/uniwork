import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminJobsPage() {
  return (
    <DashboardShell area="admin">
      <PlaceholderPage
        description="운영자가 기업 공고를 검토하고 승인, 반려, 마감 처리하는 화면입니다."
        title="Admin job review"
      />
    </DashboardShell>
  );
}
