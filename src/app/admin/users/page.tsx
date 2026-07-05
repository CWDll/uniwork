import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AdminUsersPage() {
  return (
    <DashboardShell area="admin">
      <PlaceholderPage
        description="운영자가 구직자, 기업, 행정사 계정을 조회하고 권한을 관리하는 화면입니다."
        title="User management"
      />
    </DashboardShell>
  );
}
