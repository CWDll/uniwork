import Link from "next/link";
import { BriefcaseBusiness, LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/jobs", label: "Jobs" },
  { href: "/corp", label: "For Companies" },
  { href: "/auth", label: "Auth" },
  { href: "/admin", label: "Admin" },
];

const dashboardByRole = {
  admin: "/admin",
  company: "/company",
  partner: "/admin/admin-requests",
  seeker: "/me",
} as const;

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, name, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const dashboardHref =
    profile?.role && profile.role in dashboardByRole
      ? dashboardByRole[profile.role as keyof typeof dashboardByRole]
      : "/me";
  const displayName = profile?.name || user?.email || "My account";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-2 sm:gap-3" href="/">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white sm:size-10">
            <BriefcaseBusiness className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-blue-700 sm:text-xl">
              Uniwork
            </p>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">
              Jobs for foreign students in Korea
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          {navItems.map((item) => (
            <Link className="transition hover:text-blue-700" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <Link
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href={dashboardHref}
            >
              <LayoutDashboard className="size-4" />
              <span className="max-w-36 truncate">{displayName}</span>
            </Link>
            <form action={logoutAction}>
              <Button size="sm" type="submit" variant="ghost">
                <LogOut className="size-4" />
                Log out
              </Button>
            </form>
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <Link
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href="/login"
            >
              <UserRound className="size-4" />
              Log in
            </Link>
            <Link className={cn(buttonVariants({ size: "sm" }))} href="/signup">
              Sign up
            </Link>
          </div>
        )}

        {user ? (
          <Link
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            href={dashboardHref}
            aria-label="My dashboard"
          >
            <UserRound className="size-5" />
          </Link>
        ) : (
          <Button className="md:hidden" variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
