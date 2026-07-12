import type React from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  actions,
  className,
  description,
  title,
}: {
  actions?: React.ReactNode;
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <div className={cn("px-5 py-8", className)}>
      <p className="text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
