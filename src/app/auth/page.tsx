import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import type { ReactElement } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const copy = {
  ko: {
    companyDescription:
      "기업 정보, 채용공고, 지원자 검토를 관리합니다. 행정 지원 요청은 구직자가 Uniwork 운영팀에 접수합니다.",
    companyTitle: "기업 회원 시작하기",
    seekerDescription:
      "D-2/D-4 유학생 프로필, 이력서, 지원 내역, 행정 상담 요청을 관리합니다.",
    seekerTitle: "구직자 시작하기",
    submit: "계속",
  },
  en: {
    companyDescription:
      "Manage company information, job posts, and applicant review. Administrative support requests are submitted by job seekers to Uniwork operations.",
    companyTitle: "Start as a company",
    seekerDescription:
      "Manage your D-2/D-4 student profile, resume, applications, and administrative support requests.",
    seekerTitle: "Start as a job seeker",
    submit: "Continue",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];

  return (
    <PublicShell locale={locale}>
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-2 lg:px-8">
        <RoleCard
          description={t.seekerDescription}
          href={getLocalizedPath("/signup?role=seeker", locale)}
          icon={<UserRound className="size-7" />}
          submitLabel={t.submit}
          title={t.seekerTitle}
        />
        <RoleCard
          description={t.companyDescription}
          href={getLocalizedPath("/signup?role=company", locale)}
          icon={<Building2 className="size-7" />}
          submitLabel={t.submit}
          title={t.companyTitle}
        />
      </section>
    </PublicShell>
  );
}

function RoleCard({
  description,
  href,
  icon,
  submitLabel,
  title,
}: {
  description: string;
  href: string;
  icon: ReactElement;
  submitLabel: string;
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
        {submitLabel}
      </Link>
    </article>
  );
}
