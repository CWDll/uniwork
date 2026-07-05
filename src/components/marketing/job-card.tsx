import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";

type Job = {
  company: string;
  logo: string;
  title: string;
  location: string;
  type: string;
  visa: string;
  wage: string;
  featured: boolean;
};

export function JobCard({ job }: { job: Job }) {
  return (
    <article className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4 sm:py-5">
      <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-base font-black text-blue-700 sm:size-16 sm:text-lg">
        {job.logo}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-base font-black leading-snug text-slate-950">
            {job.title}
          </h3>
          {job.featured ? (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
              Pick
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {job.company}
        </p>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs font-bold text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1">
            {job.location}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1">{job.type}</span>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
            {job.visa}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1">{job.wage}</span>
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-end">
        <Button variant="outline" size="icon">
          <Heart className="size-4" />
        </Button>
        <Button size="sm">Apply</Button>
      </div>
    </article>
  );
}
