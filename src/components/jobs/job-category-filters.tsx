"use client";

import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function JobCategoryFilters({
  activeFilters,
  defaultOpen = true,
  hasFilters = false,
  minWage,
  q,
  showAdvanced = false,
}: {
  activeFilters: JobFilterValues;
  defaultOpen?: boolean;
  hasFilters?: boolean;
  minWage?: string;
  q?: string;
  showAdvanced?: boolean;
}) {
  const [draftFilters, setDraftFilters] = useState<JobFilterValues>(activeFilters);
  const [draftQuery, setDraftQuery] = useState(q ?? "");
  const [draftMinWage, setDraftMinWage] = useState(minWage ?? "");
  const activeRegion = getActiveRegion(draftFilters.location);
  const activeCities = activeRegion
    ? (locationGroups.find((group) => group.label === activeRegion)?.cities ?? [])
    : [];

  function updateFilter(name: keyof JobFilterValues, value: string) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value || undefined,
      ...(name === "location" &&
      locationGroups.some((group) => group.label === value)
        ? { location: value }
        : {}),
    }));
  }

  const hiddenEntries = Object.entries(draftFilters).filter(([, value]) => value);

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
        <span className="ml-auto flex items-center gap-3">
          {hasFilters ? (
            <Link
              className="text-xs font-black text-blue-700 hover:text-blue-900"
              href="/jobs"
            >
              필터 초기화
            </Link>
          ) : null}
          <ChevronDown className="size-4 text-slate-400 transition group-open:rotate-180" />
        </span>
      </summary>

      <form action="/jobs" className="mt-3 border-t border-slate-100 pt-3">
        {hiddenEntries.map(([field, value]) => (
          <input key={field} name={field} type="hidden" value={value} />
        ))}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
          <label className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              name="q"
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="검색어 입력"
              value={draftQuery}
            />
          </label>
          <label className="min-w-0">
            <input
              className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3 text-sm font-bold text-slate-600 outline-none"
              inputMode="numeric"
              name="min_wage"
              onChange={(event) => setDraftMinWage(event.target.value)}
              placeholder="최소 시급"
              value={draftMinWage}
            />
          </label>
          <Button className="h-11 rounded-xl">필터 적용</Button>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4">
            <FilterGroup
              activeValue={draftFilters.category}
              allLabel="All Jobs"
              label="직종"
              onSelect={(value) =>
                updateFilter("category", value === "All Jobs" ? "" : value)
              }
              options={categories}
            />

            {showAdvanced ? (
              <>
                <FilterGroup
                  activeValue={draftFilters.location}
                  allLabel="All regions"
                  label="지역"
                  onSelect={(value) =>
                    updateFilter("location", value === "All regions" ? "" : value)
                  }
                  options={[
                    "All regions",
                    ...locationGroups.map((group) => group.label),
                  ]}
                />
                {activeRegion && activeCities.length > 0 ? (
                  <FilterGroup
                    activeValue={draftFilters.location}
                    allLabel="All cities"
                    label={`${activeRegion} 세부 지역`}
                    onSelect={(value) =>
                      updateFilter(
                        "location",
                        value === "All cities" ? activeRegion : value,
                      )
                    }
                    options={["All cities", ...activeCities]}
                  />
                ) : null}
                <FilterGroup
                  activeValue={draftFilters.employment_type}
                  allLabel="All types"
                  label="고용 형태"
                  onSelect={(value) =>
                    updateFilter(
                      "employment_type",
                      value === "All types" ? "" : value,
                    )
                  }
                  options={employmentFilters}
                />
                <FilterGroup
                  activeValue={draftFilters.visa_support_type}
                  allLabel="All visas"
                  label="비자"
                  onSelect={(value) =>
                    updateFilter(
                      "visa_support_type",
                      value === "All visas" ? "" : value,
                    )
                  }
                  options={visaFilters}
                />
                <FilterGroup
                  activeValue={draftFilters.wage_type}
                  allLabel="All wages"
                  label="급여"
                  onSelect={(value) =>
                    updateFilter("wage_type", value === "All wages" ? "" : value)
                  }
                  options={wageFilters}
                />
                <FilterGroup
                  activeValue={draftFilters.korean_requirement}
                  allLabel="Any Korean"
                  label="한국어"
                  onSelect={(value) =>
                    updateFilter(
                      "korean_requirement",
                      value === "Any Korean" ? "" : value,
                    )
                  }
                  options={koreanFilters}
                />
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm font-semibold leading-6 text-amber-900">
                  <span className="font-black">조건 확인 필요</span>는 내 비자로
                  지원 자체는 가능하지만, 공고의 비자 문구가 정확히 일치하지
                  않거나 근무시간/학교 확인처럼 운영자 검토가 필요한 경우입니다.
                </div>
              </>
            ) : null}
          </div>
        </div>
      </form>
    </details>
  );
}

type JobFilterValues = {
  category?: string;
  employment_type?: string;
  korean_requirement?: string;
  location?: string;
  profile_fit?: string;
  saved?: string;
  visa_support_type?: string;
  wage_type?: string;
};

function FilterGroup({
  activeValue,
  allLabel,
  label,
  onSelect,
  options,
}: {
  activeValue?: string;
  allLabel: string;
  label: string;
  onSelect: (value: string) => void;
  options: string[];
}) {
  return (
    <section className="min-w-0">
      <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected =
            (!activeValue && option === allLabel) || activeValue === option;

          return (
            <button
              className={cn(
                "rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "hover:border-blue-200 hover:text-blue-700",
              )}
              key={option}
              onClick={() => onSelect(option)}
              type="button"
            >
              {getOptionLabel(option)}
            </button>
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
    "All regions": "전체 지역",
    "All types": "전체 형태",
    "All visas": "전체 비자",
    "All wages": "전체 급여",
    "Any Korean": "전체 한국어",
    hourly: "시급",
    monthly: "월급",
    project: "건별",
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
