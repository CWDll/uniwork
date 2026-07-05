import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { SiteHeader } from "@/components/navigation/site-header";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <SiteHeader />
      {children}
      <MobileBottomNav />
    </main>
  );
}
