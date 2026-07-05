import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CompanyJobsPage() {
  return (
    <DashboardShell area="company">
      <PlaceholderPage
        description="기업이 채용공고를 작성, 임시저장, 승인 요청, 마감 처리하는 화면입니다."
        title="Company job posts"
      />
    </DashboardShell>
  );
}
