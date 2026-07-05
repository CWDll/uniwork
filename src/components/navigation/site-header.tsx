import Link from "next/link";
import { BriefcaseBusiness, Menu, UserRound } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/jobs", label: "Jobs" },
  { href: "/corp", label: "For Companies" },
  { href: "/auth", label: "Auth" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
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

        <Button className="md:hidden" variant="ghost" size="icon">
          <Menu className="size-5" />
        </Button>
      </div>
    </header>
  );
}
