import Link from "next/link";
import { BriefcaseBusiness, Building2, Home, ShieldCheck, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

const dashboardByRole = {
  admin: "/admin",
  company: "/company",
  partner: "/admin/admin-requests",
  seeker: "/me",
} as const;

const publicItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/corp", label: "Corp", icon: Building2 },
];

export async function MobileBottomNav() {
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
  const items = [
    ...publicItems,
    {
      href: user ? "/me/applications" : "/auth",
      label: user ? "Applied" : "Auth",
      icon: UserRound,
    },
    {
      href: user ? dashboardHref : "/login",
      label: user ? "My" : "Login",
      icon: ShieldCheck,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
              href={item.href}
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
