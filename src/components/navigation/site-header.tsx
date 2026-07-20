import Link from "next/link";
import { BriefcaseBusiness, LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";

import { logoutAction } from "@/app/auth/actions";
import { LanguageToggle } from "@/components/navigation/language-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { getLocalizedPath, publicCopy, type Locale } from "@/lib/i18n";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/jobs", labelKey: "jobs" },
  { href: "/corp", labelKey: "companyService" },
  { href: "/auth", labelKey: "auth" },
  { href: "/admin", labelKey: "admin" },
];

const dashboardByRole = {
  admin: "/admin",
  company: "/company",
  partner: "/admin/admin-requests",
  seeker: "/me",
} as const;

export async function SiteHeader({ locale = "ko" }: { locale?: Locale }) {
  const copy = publicCopy[locale];
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
  const { data: profilePhoto } = user
    ? await supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const avatarUrl = getProfilePhotoUrl(supabase, profilePhoto?.avatar_path);

  const dashboardHref =
    profile?.role && profile.role in dashboardByRole
      ? dashboardByRole[profile.role as keyof typeof dashboardByRole]
      : "/me";
  const displayName = profile?.name || user?.email || copy.myAccount;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          className="flex min-w-0 items-center gap-2 sm:gap-3"
          href={getLocalizedPath("/", locale)}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white sm:size-10">
            <BriefcaseBusiness className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-blue-700 sm:text-xl">
              Uniwork
            </p>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">
              {copy.tagline}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          {navItems.map((item) => (
            <Link
              className="transition hover:text-blue-700"
              href={getLocalizedPath(item.href, locale)}
              key={item.href}
            >
              {copy[item.labelKey as keyof typeof copy]}
            </Link>
          ))}
        </nav>

        {user ? (
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <LanguageToggle locale={locale} />
            <Link
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href={getLocalizedPath(dashboardHref, locale)}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-5 rounded-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <LayoutDashboard className="size-4" />
              )}
              <span className="max-w-36 truncate">{displayName}</span>
            </Link>
            <form action={logoutAction}>
              <Button size="sm" type="submit" variant="ghost">
                <LogOut className="size-4" />
                {copy.logout}
              </Button>
            </form>
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle locale={locale} />
            <Link
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href={getLocalizedPath("/login", locale)}
            >
              <UserRound className="size-4" />
              {copy.login}
            </Link>
            <Link
              className={cn(buttonVariants({ size: "sm" }))}
              href={getLocalizedPath("/signup", locale)}
            >
              {copy.signUp}
            </Link>
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-1 md:hidden">
            <Link
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
              href={getLocalizedPath(dashboardHref, locale)}
              aria-label={copy.dashboard}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-7 rounded-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <UserRound className="size-5" />
              )}
            </Link>
            <form action={logoutAction}>
              <Button aria-label={copy.logout} size="icon" type="submit" variant="ghost">
                <LogOut className="size-5" />
              </Button>
            </form>
          </div>
        ) : (
          <Button className="md:hidden" variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
