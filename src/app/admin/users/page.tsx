import Link from "next/link";

import { UserRoleForm } from "@/components/admin/users/user-role-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const roles = ["seeker", "company", "partner", "admin"];

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, email, name, phone, locale, created_at, updated_at")
    .order("created_at", { ascending: false });

  const roleCounts = roles.map((role) => ({
    role,
    count: profiles?.filter((profile) => profile.role === role).length ?? 0,
  }));

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          User management
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          사용자 역할과 행정사 파트너 계정을 관리합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          Supabase Auth로 가입된 사용자의 프로필 역할을 운영자가 조정합니다.
          partner 역할은 행정 요청 배정 대상이 됩니다.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {roleCounts.map((item) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-4"
            key={item.role}
          >
            <p className="text-sm font-bold text-slate-500">{item.role}</p>
            <p className="mt-1 text-2xl font-black">{item.count}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black">Users {profiles?.length ?? 0}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {profiles && profiles.length > 0 ? (
            profiles.map((profile) => (
              <article
                className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_260px]"
                key={profile.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-black">
                      {profile.name || profile.email}
                    </h3>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                      {profile.role}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-500">
                    {profile.email}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Joined {new Date(profile.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>

                <UserRoleForm role={profile.role} userId={profile.id} />
              </article>
            ))
          ) : (
            <EmptyState
              actions={
                <Link
                  className={cn(buttonVariants({ size: "sm" }))}
                  href="/admin/companies"
                >
                  기업 인증 목록 보기
                </Link>
              }
              description="회원가입이 발생하면 이 화면에서 역할과 기본 계정 정보를 확인할 수 있습니다."
              title="아직 사용자가 없습니다."
            />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
