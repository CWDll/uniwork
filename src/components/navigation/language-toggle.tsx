"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  getLocaleFromPathname,
  getLocalizedPath,
  stripLocaleFromPathname,
  type Locale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  className,
  locale,
}: {
  className?: string;
  locale?: Locale;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = locale ?? getLocaleFromPathname(pathname);
  const query = searchParams.toString();
  const basePath = stripLocaleFromPathname(pathname);

  function hrefFor(nextLocale: Locale) {
    const localizedPath = getLocalizedPath(basePath, nextLocale);

    return query ? `${localizedPath}?${query}` : localizedPath;
  }

  return (
    <div
      aria-label="Language"
      className={cn(
        "inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5 text-xs font-black",
        className,
      )}
    >
      {(["ko", "en"] as const).map((item) => (
        <Link
          aria-current={currentLocale === item ? "true" : undefined}
          className={cn(
            "rounded-full px-2.5 py-1 transition",
            currentLocale === item
              ? "bg-slate-950 text-white"
              : "text-slate-500 hover:text-slate-950",
          )}
          href={hrefFor(item)}
          key={item}
        >
          {item.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
