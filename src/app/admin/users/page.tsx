import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type AdminUsersSearchParams = {
  page?: string;
  q?: string;
  role?: string;
};

const pageSize = 25;
const userRoleFilters = [
  { value: "", label: "전체" },
  { value: "seeker", label: "구직자" },
  { value: "company", label: "기업 담당자" },
];

function buildUsersHref(params: AdminUsersSearchParams, updates: AdminUsersSearchParams) {
  const nextParams = new URLSearchParams();
  const merged = { ...params, ...updates };

  Object.entries(merged).forEach(([key, value]) => {
    const trimmed = value?.trim();

    if (trimmed) {
      nextParams.set(key, trimmed);
    }
  });

  const query = nextParams.toString();

  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const params = await searchParams;
  const activeRole = params.role === "company" || params.role === "seeker" ? params.role : "";
  const query = params.q?.trim().toLowerCase() ?? "";
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/users");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, email, name, phone, locale, created_at, updated_at")
    .in("role", ["seeker", "company"])
    .order("created_at", { ascending: false });

  const visibleProfiles = (profiles ?? []).filter((profile) => {
    if (activeRole && profile.role !== activeRole) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [profile.name, profile.email, profile.phone]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });
  const totalPages = Math.max(1, Math.ceil(visibleProfiles.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProfiles = visibleProfiles.slice((safePage - 1) * pageSize, safePage * pageSize);
  const seekerIds = pagedProfiles
    .filter((profile) => profile.role === "seeker")
    .map((profile) => profile.id);
  const companyOwnerIds = pagedProfiles
    .filter((profile) => profile.role === "company")
    .map((profile) => profile.id);
  const [
    { data: seekerProfiles },
    { data: companies },
    { data: seekerApplications },
  ] = await Promise.all([
    seekerIds.length > 0
      ? supabase
          .from("seeker_profiles")
          .select("user_id, nationality, visa_type, school, major, korean_level, english_level, preferred_locations, preferred_job_types")
          .in("user_id", seekerIds)
      : Promise.resolve({ data: [] }),
    companyOwnerIds.length > 0
      ? supabase
          .from("companies")
          .select("id, owner_id, name, verification_status, business_number, manager_name, manager_phone, notification_email")
          .in("owner_id", companyOwnerIds)
      : Promise.resolve({ data: [] }),
    seekerIds.length > 0
      ? supabase
          .from("job_applications")
          .select("id, seeker_id, applied_at")
          .in("seeker_id", seekerIds)
          .order("applied_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const seekerProfileById = new Map(
    seekerProfiles?.map((profile) => [profile.user_id, profile]) ?? [],
  );
  const companiesByOwnerId = new Map<string, NonNullable<typeof companies>>();
  companies?.forEach((company) => {
    const existing = companiesByOwnerId.get(company.owner_id) ?? [];
    companiesByOwnerId.set(company.owner_id, [...existing, company]);
  });
  const latestApplicationBySeekerId = new Map<string, { id: string }>();
  seekerApplications?.forEach((application) => {
    if (!latestApplicationBySeekerId.has(application.seeker_id)) {
      latestApplicationBySeekerId.set(application.seeker_id, application);
    }
  });
  const roleCounts = userRoleFilters.slice(1).map((role) => ({
    ...role,
    count: profiles?.filter((profile) => profile.role === role.value).length ?? 0,
  }));

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          User management
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          구직자와 기업 담당자 계정을 확인합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          가입 시 선택한 역할을 기준으로 계정을 확인합니다. 역할 변경은 운영 흐름에서
          제외하고, 프로필/회사 정보 완성도를 확인하는 용도로 사용합니다.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {userRoleFilters.map((filter) => {
          const isActive = activeRole === filter.value;
          const count = filter.value
            ? roleCounts.find((role) => role.value === filter.value)?.count ?? 0
            : profiles?.length ?? 0;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive || (!activeRole && !filter.value)
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={buildUsersHref(params, { page: "", role: isActive ? "" : filter.value })}
              key={filter.value || "all"}
            >
              <p className="text-sm font-bold text-slate-500">{filter.label}</p>
              <p className="mt-1 text-2xl font-black">{count.toLocaleString("ko-KR")}</p>
            </Link>
          );
        })}
      </div>

      <form
        action="/admin/users"
        className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        {activeRole ? <input name="role" type="hidden" value={activeRole} /> : null}
        <label className="grid gap-2 text-xs font-black tracking-wide text-slate-400">
          검색
          <input
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
            defaultValue={params.q ?? ""}
            name="q"
            placeholder="이름, 이메일, 전화번호"
          />
        </label>
        <Link className={cn(buttonVariants({ variant: "outline" }), "self-end")} href="/admin/users">
          초기화
        </Link>
        <button className={cn(buttonVariants(), "self-end")} type="submit">
          검색
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">Users {visibleProfiles.length}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {pageSize}명씩 표시 · {safePage}/{totalPages} 페이지
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {pagedProfiles.length > 0 ? (
            pagedProfiles.map((profile) => {
              const seekerProfile = seekerProfileById.get(profile.id);
              const ownedCompanies = companiesByOwnerId.get(profile.id) ?? [];
              const latestApplication = latestApplicationBySeekerId.get(profile.id);

              return (
                <details className="group px-5 py-4 open:bg-slate-50/60" key={profile.id}>
                  <summary className="grid cursor-pointer list-none gap-3 rounded-xl p-1 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_160px_160px_120px] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black">{profile.name || profile.email}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                          {profile.role === "seeker" ? "구직자" : "기업 담당자"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {profile.email}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-600">
                      {profile.role === "seeker"
                        ? seekerProfile
                          ? "프로필 있음"
                          : "프로필 없음"
                        : `${ownedCompanies.length}개 회사`}
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                      {new Date(profile.created_at).toLocaleDateString("ko-KR")}
                    </p>
                    <span className="text-sm font-black text-blue-700 group-open:text-slate-500">
                      상세 보기
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700 md:grid-cols-2 xl:grid-cols-3">
                    <Info label="연락처" value={profile.phone || "전화번호 미입력"} />
                    <Info label="언어" value={profile.locale || "미입력"} />
                    <Info label="최근 수정" value={new Date(profile.updated_at).toLocaleString("ko-KR")} />
                    {profile.role === "seeker" ? (
                      <>
                        <Info label="비자/국적" value={`${seekerProfile?.visa_type || "비자 미입력"} · ${seekerProfile?.nationality || "국적 미입력"}`} />
                        <Info label="학교/전공" value={`${seekerProfile?.school || "학교 미입력"} · ${seekerProfile?.major || "전공 미입력"}`} />
                        <Info label="언어 수준" value={`한국어 ${seekerProfile?.korean_level || "-"} · 영어 ${seekerProfile?.english_level || "-"}`} />
                        <Info label="희망 조건" value={`${formatArray(seekerProfile?.preferred_locations)} · ${formatArray(seekerProfile?.preferred_job_types)}`} />
                        {latestApplication ? (
                          <div className="rounded-xl bg-blue-50 px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
                              이력서/지원서
                            </p>
                            <Link
                              className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-black text-white hover:bg-blue-700"
                              href={`/company/applications/${latestApplication.id}/print`}
                            >
                              최신 지원서 출력 보기
                            </Link>
                          </div>
                        ) : (
                          <Info label="이력서/지원서" value="아직 지원 이력이 없습니다." />
                        )}
                      </>
                    ) : (
                      ownedCompanies.map((company) => (
                        <Info
                          key={company.id}
                          label={company.name}
                          value={`${company.verification_status} · ${company.business_number || "사업자번호 미입력"}\n${company.manager_name || "담당자 미입력"} · ${company.manager_phone || "전화 미입력"}\n${company.notification_email || "알림 이메일 미입력"}`}
                        />
                      ))
                    )}
                  </div>
                </details>
              );
            })
          ) : (
            <EmptyState
              actions={
                <Link className={cn(buttonVariants({ size: "sm" }))} href="/admin/users">
                  전체 보기
                </Link>
              }
              description="검색어를 바꾸거나 전체 사용자 목록을 다시 확인해보세요."
              title="조건에 맞는 사용자가 없습니다."
            />
          )}
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                safePage <= 1 && "pointer-events-none opacity-40",
              )}
              href={buildUsersHref(params, { page: String(safePage - 1) })}
            >
              이전
            </Link>
            <p className="text-sm font-bold text-slate-500">
              {safePage} / {totalPages}
            </p>
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                safePage >= totalPages && "pointer-events-none opacity-40",
              )}
              href={buildUsersHref(params, { page: String(safePage + 1) })}
            >
              다음
            </Link>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}

function formatArray(value: unknown) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "미입력";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line break-words text-sm font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}
