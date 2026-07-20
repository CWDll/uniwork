import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";

import { getLocalizedPath, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

const dashboardByRole = {
  admin: "/admin",
  company: "/company",
  partner: "/admin/admin-requests",
  seeker: "/me",
} as const;

const publicItems = [
  { href: "/", labels: { en: "Home", ko: "홈" }, icon: Home },
  { href: "/jobs", labels: { en: "Jobs", ko: "공고" }, icon: BriefcaseBusiness },
  { href: "/corp", labels: { en: "Corp", ko: "기업" }, icon: Building2 },
  { href: "/login", labels: { en: "Log in", ko: "로그인" }, icon: UserRound },
  { href: "/signup", labels: { en: "Sign up", ko: "가입" }, icon: UserPlus },
];

const itemsByRole = {
  admin: [
    { href: "/admin", labels: { en: "Admin", ko: "운영" }, icon: LayoutDashboard },
    { href: "/admin/companies", labels: { en: "Companies", ko: "기업" }, icon: ShieldCheck },
    { href: "/admin/jobs", labels: { en: "Jobs", ko: "공고" }, icon: BriefcaseBusiness },
    { href: "/admin/users", labels: { en: "Users", ko: "회원" }, icon: UsersRound },
    { href: "/admin/admin-requests", labels: { en: "Requests", ko: "행정" }, icon: FileText },
  ],
  company: [
    { href: "/company", labels: { en: "Company", ko: "기업홈" }, icon: LayoutDashboard },
    { href: "/company/jobs", labels: { en: "Posts", ko: "공고" }, icon: BriefcaseBusiness },
    { href: "/company/applications", labels: { en: "Applicants", ko: "지원자" }, icon: UsersRound },
    { href: "/company/settings", labels: { en: "Settings", ko: "설정" }, icon: Settings },
    { href: "/jobs", labels: { en: "Jobs", ko: "전체공고" }, icon: Home },
  ],
  partner: [
    { href: "/admin/admin-requests", labels: { en: "Requests", ko: "행정" }, icon: FileText },
    { href: "/admin", labels: { en: "Admin", ko: "운영" }, icon: LayoutDashboard },
    { href: "/jobs", labels: { en: "Jobs", ko: "공고" }, icon: BriefcaseBusiness },
    { href: "/company", labels: { en: "Company", ko: "기업" }, icon: Building2 },
    { href: "/me", labels: { en: "My", ko: "내 정보" }, icon: ShieldCheck },
  ],
  seeker: [
    { href: "/", labels: { en: "Home", ko: "홈" }, icon: Home },
    { href: "/jobs", labels: { en: "Jobs", ko: "공고" }, icon: BriefcaseBusiness },
    { href: "/me/applications", labels: { en: "Applied", ko: "지원" }, icon: ClipboardList },
    { href: "/me/admin-requests", labels: { en: "Requests", ko: "행정" }, icon: FileText },
    { href: "/me", labels: { en: "My", ko: "내 정보" }, icon: ShieldCheck },
  ],
} as const;

export async function MobileBottomNav({ locale = "ko" }: { locale?: Locale }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const dashboardHref =
    profile?.role && profile.role in dashboardByRole
      ? dashboardByRole[profile.role as keyof typeof dashboardByRole]
      : "/me";
  const roleItems =
    profile?.role && profile.role in itemsByRole
      ? itemsByRole[profile.role as keyof typeof itemsByRole]
      : itemsByRole.seeker;
  const items = (user ? roleItems : publicItems).map((item) => ({
    href: user && item.href === "/me" ? dashboardHref : item.href,
    icon: item.icon,
    label: item.labels[locale],
  }));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
              href={getLocalizedPath(item.href, locale)}
              key={item.href}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
