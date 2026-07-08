import { ChevronDown, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function JobCategoryFilters({
  activeFilters,
  defaultOpen = true,
  getHref,
  showAdvanced = false,
  showProfileFit = false,
}: {
  activeFilters: JobFilterValues;
  defaultOpen?: boolean;
  getHref: (updates: JobFilterValues) => string;
  showAdvanced?: boolean;
  showProfileFit?: boolean;
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
        <div className="grid min-w-0 gap-4">
          <FilterGroup
            activeValue={activeFilters.category}
            allLabel="All Jobs"
            getHref={(value) =>
              getHref({ category: value === "All Jobs" ? "" : value })
            }
            label="Category"
            options={categories}
          />

          {showAdvanced ? (
            <>
              {showProfileFit ? (
                <FilterGroup
                  activeValue={activeFilters.profile_fit}
                  allLabel="All fit"
                  getHref={(value) =>
                    getHref({ profile_fit: value === "All fit" ? "" : value })
                  }
                  label="My fit"
                  options={profileFitFilters}
                />
              ) : null}
              <FilterGroup
                activeValue={activeFilters.visa_support_type}
                allLabel="All visas"
                getHref={(value) =>
                  getHref({ visa_support_type: value === "All visas" ? "" : value })
                }
                label="Visa"
                options={visaFilters}
              />
              <FilterGroup
                activeValue={activeFilters.location}
                allLabel="All regions"
                getHref={(value) =>
                  getHref({ location: value === "All regions" ? "" : value })
                }
                label="Region"
                options={regionFilters}
              />
              <FilterGroup
                activeValue={activeFilters.employment_type}
                allLabel="All types"
                getHref={(value) =>
                  getHref({ employment_type: value === "All types" ? "" : value })
                }
                label="Employment"
                options={employmentFilters}
              />
              <FilterGroup
                activeValue={activeFilters.wage_type}
                allLabel="All wages"
                getHref={(value) =>
                  getHref({ wage_type: value === "All wages" ? "" : value })
                }
                label="Wage"
                options={wageFilters}
              />
              <FilterGroup
                activeValue={activeFilters.korean_requirement}
                allLabel="Any Korean"
                getHref={(value) =>
                  getHref({
                    korean_requirement: value === "Any Korean" ? "" : value,
                  })
                }
                label="Korean"
                options={koreanFilters}
              />
            </>
          ) : null}
        </div>
      </div>
    </details>
  );
}

type JobFilterValues = {
  category?: string;
  employment_type?: string;
  korean_requirement?: string;
  location?: string;
  profile_fit?: string;
  visa_support_type?: string;
  wage_type?: string;
};

function FilterGroup({
  activeValue,
  allLabel,
  getHref,
  label,
  options,
}: {
  activeValue?: string;
  allLabel: string;
  getHref: (value: string) => string;
  label: string;
  options: string[];
}) {
  return (
    <section className="min-w-0">
      <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="flex w-full max-w-full gap-2 overflow-x-auto pb-1">
        {options.map((option) => {
          const selected =
            (!activeValue && option === allLabel) || activeValue === option;

          return (
            <Link
              className={cn(
                "shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "hover:border-blue-200 hover:text-blue-700",
              )}
              href={getHref(option)}
              key={option}
            >
              {getOptionLabel(option)}
            </Link>
          );
        })}
      </div>
    </section>
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

const visaFilters = ["All visas", "D-2", "D-4", "F"];

const profileFitFilters = [
  "All fit",
  "eligible",
  "review_required",
  "blocked",
  "profile_required",
];

const regionFilters = ["All regions", "Seoul", "Busan", "Remote"];

const employmentFilters = [
  "All types",
  "Part-time",
  "Contract",
  "Internship",
  "Full-time",
];

const wageFilters = ["All wages", "hourly", "monthly", "project"];

const koreanFilters = ["Any Korean", "TOPIK", "Conversational", "Basic"];

function getOptionLabel(option: string) {
  const labels: Record<string, string> = {
    blocked: "지원 제한",
    eligible: "지원 가능",
    profile_required: "프로필 필요",
    review_required: "검토 필요",
  };

  return labels[option] ?? option;
}
