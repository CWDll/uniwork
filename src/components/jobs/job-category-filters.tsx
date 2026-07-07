import { ChevronDown, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function JobCategoryFilters({
  activeCategory,
  defaultOpen = true,
  getHref,
}: {
  activeCategory: string;
  defaultOpen?: boolean;
  getHref: (category: string) => string;
}) {
  return (
    <details
      className="group rounded-2xl border border-slate-200 bg-white p-3"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 py-1 text-sm font-black text-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-blue-700" />
          Job filters
        </span>
        <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-400">
          Category
        </p>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const selected =
              (!activeCategory && category === "All Jobs") ||
              activeCategory === category;

            return (
              <Link
                className={cn(
                  "shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700",
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "hover:border-blue-200 hover:text-blue-700",
                )}
                href={getHref(category)}
                key={category}
              >
                {category}
              </Link>
            );
          })}
        </div>
      </div>
    </details>
  );
}

const categories = [
  "All Jobs",
  "Cafe & Service",
  "Office",
  "Translation",
  "Marketing",
  "Education",
];
