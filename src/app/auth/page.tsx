import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import type { ReactElement } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-2 lg:px-8">
        <RoleCard
          description="D-2/D-4 유학생 프로필, 이력서, 지원 내역, 행정 상담 요청을 관리합니다."
          href="/signup?role=seeker"
          icon={<UserRound className="size-7" />}
          title="구직자 시작하기"
        />
        <RoleCard
          description="기업 정보, 채용공고, 지원자 검토, 행정 지원 요청을 관리합니다."
          href="/signup?role=company"
          icon={<Building2 className="size-7" />}
          title="기업 회원 시작하기"
        />
      </section>
    </PublicShell>
  );
}

function RoleCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactElement;
  title: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h1 className="mt-6 text-2xl font-black">{title}</h1>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
        {description}
      </p>
      <Link className={cn(buttonVariants({ className: "mt-6 w-full" }))} href={href}>
        Continue
      </Link>
    </article>
  );
}
