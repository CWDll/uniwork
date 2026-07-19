import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { SiteHeader } from "@/components/navigation/site-header";
import type { Locale } from "@/lib/i18n";

export function PublicShell({
  children,
  locale = "ko",
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <SiteHeader locale={locale} />
      {children}
      <MobileBottomNav locale={locale} />
    </main>
  );
}
