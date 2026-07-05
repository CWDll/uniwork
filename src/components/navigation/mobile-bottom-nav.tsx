import Link from "next/link";
import { BriefcaseBusiness, Building2, Home, ShieldCheck, UserRound } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/corp", label: "Corp", icon: Building2 },
  { href: "/auth", label: "Auth", icon: UserRound },
  { href: "/me", label: "My", icon: ShieldCheck },
];

export function MobileBottomNav() {
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
