import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function SeekerProfilePage() {
  return (
    <DashboardShell area="me">
      <PlaceholderPage
        description="비자, 학교, 전공, 언어 수준, 근무 가능 시간, 희망 지역을 입력하는 구직자 프로필 화면입니다."
        title="Seeker profile"
      />
    </DashboardShell>
  );
}
