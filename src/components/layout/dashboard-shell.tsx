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
    { href: "/me", label: "Dashboard", icon: LayoutDashboard },
    { href: "/me/profile", label: "Profile", icon: ShieldCheck },
    { href: "/me/resume", label: "Resume", icon: FileText },
    { href: "/me/applications", label: "Applications", icon: ClipboardList },
    { href: "/me/admin-requests", label: "Admin Requests", icon: FileText },
  ],
  company: [
    { href: "/company", label: "Dashboard", icon: LayoutDashboard },
    { href: "/company/jobs", label: "Job Posts", icon: BriefcaseBusiness },
    { href: "/company/applications", label: "Applicants", icon: UsersRound },
    { href: "/company/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/companies", label: "Companies", icon: ShieldCheck },
    { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
    { href: "/admin/users", label: "Users", icon: UsersRound },
    { href: "/admin/admin-requests", label: "Admin Requests", icon: FileText },
  ],
};

const titleByArea = {
  me: "Seeker workspace",
  company: "Company workspace",
  admin: "Operations console",
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
