import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function JobCategoryFilters({
  activeFilters,
  defaultOpen = true,
  getHref,
  hasFilters = false,
  minWage,
  q,
  showAdvanced = false,
  showProfileFit = false,
}: {
  activeFilters: JobFilterValues;
  defaultOpen?: boolean;
  getHref: (updates: JobFilterValues) => string;
  hasFilters?: boolean;
  minWage?: string;
  q?: string;
  showAdvanced?: boolean;
  showProfileFit?: boolean;
}) {
  const activeRegion = getActiveRegion(activeFilters.location);
  const activeCities = activeRegion
    ? (locationGroups.find((group) => group.label === activeRegion)?.cities ?? [])
    : [];

  return (
    <details
      className="group rounded-2xl border border-slate-200 bg-white p-3"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-1 py-1 text-sm font-black text-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-blue-700" />
          검색 및 필터
        </span>
        <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <form action="/jobs" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
          {hiddenFilterFields.map((field) => {
            const value = activeFilters[field];

            return value ? (
              <input key={field} name={field} type="hidden" value={value} />
            ) : null;
          })}
          <label className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              defaultValue={q}
              name="q"
              placeholder="검색어 입력"
            />
          </label>
          <label className="min-w-0">
            <input
              className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3 text-sm font-bold text-slate-600 outline-none"
              defaultValue={minWage}
              inputMode="numeric"
              name="min_wage"
              placeholder="최소 시급"
            />
          </label>
          <Button className="h-11 rounded-xl">검색 적용</Button>
        </form>

        <div className="grid min-w-0 gap-4">
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4">
            <FilterGroup
              activeValue={activeFilters.category}
              allLabel="All Jobs"
              getHref={(value) =>
                getHref({ category: value === "All Jobs" ? "" : value })
              }
              label="직종"
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
                    label="내 조건"
                    options={profileFitFilters}
                  />
                ) : null}
                <FilterGroup
                  activeValue={activeFilters.location}
                  allLabel="All regions"
                  getHref={(value) =>
                    getHref({ location: value === "All regions" ? "" : value })
                  }
                  label="지역"
                  options={["All regions", ...locationGroups.map((group) => group.label)]}
                />
                {activeRegion && activeCities.length > 0 ? (
                  <FilterGroup
                    activeValue={activeFilters.location}
                    allLabel="All cities"
                    getHref={(value) =>
                      getHref({ location: value === "All cities" ? activeRegion : value })
                    }
                    label={`${activeRegion} 세부 지역`}
                    options={["All cities", ...activeCities]}
                  />
                ) : null}
                <FilterGroup
                  activeValue={activeFilters.employment_type}
                  allLabel="All types"
                  getHref={(value) =>
                    getHref({ employment_type: value === "All types" ? "" : value })
                  }
                  label="고용 형태"
                  options={employmentFilters}
                />
                <FilterGroup
                  activeValue={activeFilters.visa_support_type}
                  allLabel="All visas"
                  getHref={(value) =>
                    getHref({ visa_support_type: value === "All visas" ? "" : value })
                  }
                  label="비자"
                  options={visaFilters}
                />
                <FilterGroup
                  activeValue={activeFilters.wage_type}
                  allLabel="All wages"
                  getHref={(value) =>
                    getHref({ wage_type: value === "All wages" ? "" : value })
                  }
                  label="급여"
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
                  label="한국어"
                  options={koreanFilters}
                />
              </>
            ) : null}
          </div>

          {hasFilters ? (
            <div className="border-t border-slate-100 pt-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:bg-slate-50"
                href="/jobs"
              >
                전체 필터 초기화
              </Link>
            </div>
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

const hiddenFilterFields: Array<keyof JobFilterValues> = [
  "category",
  "employment_type",
  "korean_requirement",
  "location",
  "profile_fit",
  "visa_support_type",
  "wage_type",
];

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

const locationGroups = [
  {
    label: "서울특별시",
    cities: ["강남구", "마포구", "서대문구", "종로구", "영등포구"],
  },
  {
    label: "경기도",
    cities: ["고양시", "성남시", "수원시", "안산시", "의정부시"],
  },
  {
    label: "인천광역시",
    cities: ["연수구", "남동구", "부평구"],
  },
  {
    label: "부산광역시",
    cities: ["해운대구", "부산진구", "수영구"],
  },
  {
    label: "대구광역시",
    cities: ["중구", "수성구", "달서구"],
  },
  {
    label: "대전광역시",
    cities: ["유성구", "서구", "중구"],
  },
  {
    label: "광주광역시",
    cities: ["동구", "서구", "북구"],
  },
  {
    label: "Remote",
    cities: [],
  },
];

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
    "All Jobs": "전체 직종",
    "All cities": "전체 세부 지역",
    "All fit": "전체 조건",
    "All regions": "전체 지역",
    "All types": "전체 형태",
    "All visas": "전체 비자",
    "All wages": "전체 급여",
    "Any Korean": "전체 한국어",
    blocked: "지원 제한",
    eligible: "지원 가능",
    hourly: "시급",
    monthly: "월급",
    profile_required: "프로필 필요",
    project: "건별",
    review_required: "검토 필요",
  };

  return labels[option] ?? option;
}

function getActiveRegion(location?: string) {
  if (!location) {
    return "";
  }

  const region = locationGroups.find((group) => group.label === location);

  if (region) {
    return region.label;
  }

  return (
    locationGroups.find((group) => group.cities.includes(location))?.label ?? ""
  );
}
