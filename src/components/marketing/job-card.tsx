import { Heart } from "lucide-react";
import Link from "next/link";

import { toggleSavedJobAction } from "@/app/jobs/saved-actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import type { JobEligibility } from "@/lib/jobs/eligibility";
import { cn } from "@/lib/utils";

type Job = {
  companyVerified?: boolean;
  descriptionQuality?: "complete" | "needs_detail";
  id?: string;
  company: string;
  koreanRequirement?: string;
  logo: string;
  publishedAt?: string | null;
  title: string;
  location: string;
  type: string;
  visa: string;
  wage: string;
  featured: boolean;
  eligibility?: JobEligibility;
  saved?: boolean;
};

export function JobCard({
  job,
  returnTo = "/jobs",
  viewerSignedIn = false,
}: {
  job: Job;
  returnTo?: string;
  viewerSignedIn?: boolean;
}) {
  const href = job.id ? `/jobs/${job.id}` : "/jobs";

  return (
    <article className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4 sm:py-5">
      <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-base font-black text-blue-700 sm:size-16 sm:text-lg">
        {job.logo}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {job.id ? (
            <Link
              className="min-w-0 text-base font-black leading-snug text-slate-950 hover:text-blue-700"
              href={href}
            >
              {job.title}
            </Link>
          ) : (
            <h3 className="min-w-0 text-base font-black leading-snug text-slate-950">
              {job.title}
            </h3>
          )}
          {job.featured ? (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
              Pick
            </span>
          ) : null}
          {job.eligibility ? (
            <EligibilityBadge eligibility={job.eligibility} />
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {job.company}
          {job.companyVerified ? (
            <span className="ml-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
              인증 기업
            </span>
          ) : null}
        </p>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs font-bold text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1">
            {job.location}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1">{job.type}</span>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
            {job.visa}
          </span>
          {job.koreanRequirement ? (
            <span className="rounded-md bg-slate-100 px-2 py-1">
              {job.koreanRequirement}
            </span>
          ) : null}
          <span className="rounded-md bg-slate-100 px-2 py-1">{job.wage}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
          <span
            className={cn(
              "rounded-md px-2 py-1",
              job.descriptionQuality === "complete"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {job.descriptionQuality === "complete" ? "정보 충분" : "상세 확인"}
          </span>
          {job.publishedAt ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500">
              공개 {new Date(job.publishedAt).toLocaleDateString("ko-KR")}
            </span>
          ) : null}
        </div>
        {job.eligibility ? (
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {job.eligibility.description}
          </p>
        ) : null}
      </div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-end">
        {job.id ? (
          viewerSignedIn ? (
            <form action={toggleSavedJobAction}>
              <input name="job_id" type="hidden" value={job.id} />
              <input name="return_to" type="hidden" value={returnTo} />
              <Button
                aria-label={job.saved ? "즐겨찾기 해제" : "즐겨찾기 저장"}
                size="icon"
                title={job.saved ? "즐겨찾기 해제" : "즐겨찾기 저장"}
                type="submit"
                variant="outline"
              >
                <Heart
                  className={cn(
                    "size-4",
                    job.saved && "fill-blue-600 text-blue-600",
                  )}
                />
              </Button>
            </form>
          ) : (
            <Link
              aria-label="로그인하고 즐겨찾기 저장"
              className={cn(
                buttonVariants({ size: "icon", variant: "outline" }),
                "shrink-0",
              )}
              href={`/login?next=${encodeURIComponent(returnTo)}`}
              title="로그인하고 즐겨찾기 저장"
            >
              <Heart className="size-4" />
            </Link>
          )
        ) : null}
        <Link className={cn(buttonVariants({ size: "sm" }), "min-w-20")} href={href}>
          {job.eligibility?.status === "blocked" ? "Details" : "Apply"}
        </Link>
      </div>
    </article>
  );
}

function EligibilityBadge({ eligibility }: { eligibility: JobEligibility }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-xs font-black",
        eligibility.status === "eligible" && "bg-emerald-50 text-emerald-700",
        eligibility.status === "review_required" && "bg-amber-50 text-amber-700",
        eligibility.status === "blocked" && "bg-red-50 text-red-700",
        eligibility.status === "profile_required" && "bg-slate-100 text-slate-600",
        eligibility.status === "sign_in_required" && "bg-blue-50 text-blue-700",
      )}
    >
      {eligibility.label}
    </span>
  );
}
