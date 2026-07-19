import Link from "next/link";
import type React from "react";
import {
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { SiteHeader } from "@/components/navigation/site-header";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navByArea: Record<"me" | "company" | "admin", NavItem[]> = {
  me: [
    { href: "/me", label: "내 대시보드", icon: LayoutDashboard },
    { href: "/me/profile", label: "프로필", icon: ShieldCheck },
    { href: "/me/resume", label: "이력서", icon: FileText },
    { href: "/me/applications", label: "지원 내역", icon: ClipboardList },
    { href: "/me/admin-requests", label: "행정 요청", icon: FileText },
  ],
  company: [
    { href: "/company", label: "기업 대시보드", icon: LayoutDashboard },
    { href: "/company/jobs", label: "공고 관리", icon: BriefcaseBusiness },
    { href: "/company/applications", label: "지원자 관리", icon: UsersRound },
    { href: "/company/settings", label: "회사 설정", icon: Settings },
  ],
  admin: [
    { href: "/admin", label: "운영 현황", icon: LayoutDashboard },
    { href: "/admin/companies", label: "기업 인증", icon: ShieldCheck },
    { href: "/admin/jobs", label: "공고 운영", icon: BriefcaseBusiness },
    { href: "/admin/users", label: "회원 관리", icon: UsersRound },
    { href: "/admin/admin-requests", label: "행정 요청", icon: FileText },
  ],
};

const titleByArea = {
  me: "구직자 공간",
  company: "기업 공간",
  admin: "운영자 콘솔",
};

export function DashboardShell({
  area,
  children,
}: {
  area: "me" | "company" | "admin";
  children: React.ReactNode;
}) {
  const navItems = navByArea[area];

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 md:pb-0">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 lg:block">
          <p className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
            {titleByArea[area]}
          </p>
          <nav className="mt-2 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
