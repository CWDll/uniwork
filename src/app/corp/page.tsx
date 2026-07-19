import { ArrowRight, BadgeCheck, FileCheck2, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { getLocalizedPath, getLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const services = {
  ko: [
    {
      title: "무료 공고 등록",
      description:
        "MVP 단계에서는 기업 공고 등록을 무료로 열어 초기 수요를 확보합니다.",
      icon: FileCheck2,
    },
    {
      title: "지원자 확인",
      description: "지원자의 비자 상태, 학교, 가능 근무시간을 한 화면에서 확인합니다.",
      icon: UsersRound,
    },
    {
      title: "인증 기업 운영",
      description:
        "운영자 인증을 받은 기업은 공고를 등록하고 지원자 상태를 안정적으로 관리합니다.",
      icon: BadgeCheck,
    },
  ],
  en: [
    {
      title: "Free job posting",
      description:
        "During the MVP phase, verified companies can post jobs for free to validate early demand.",
      icon: FileCheck2,
    },
    {
      title: "Applicant review",
      description:
        "Review visa status, school details, availability, and resume information in one workspace.",
      icon: UsersRound,
    },
    {
      title: "Verified company operations",
      description:
        "Approved companies can publish jobs and manage applicant status with a stable dashboard.",
      icon: BadgeCheck,
    },
  ],
} satisfies Record<
  Locale,
  { description: string; icon: typeof FileCheck2; title: string }[]
>;

const copy = {
  ko: {
    body: "Uniwork는 채용공고 등록, 지원자 확인, 인증 기업 운영을 기업 대시보드에서 관리하는 구조로 설계됩니다. 비자 등 행정 절차 지원은 구직자가 Uniwork 운영팀에 별도로 요청하는 흐름입니다.",
    dashboard: "기업 대시보드 보기",
    description:
      "외국인 유학생 채용 공고 등록, 지원자 확인, 인증 기업 운영을 Uniwork 기업 대시보드에서 시작하세요.",
    eyebrow: "For companies",
    signUp: "기업 계정 만들기",
    title: "외국인 유학생 채용을 더 쉽게 시작하세요",
  },
  en: {
    body: "Uniwork is designed so companies can manage job posts, applicant review, and verified company operations from one dashboard. Visa and administrative support requests are initiated by job seekers through the Uniwork operations team.",
    dashboard: "Open company dashboard",
    description:
      "Start foreign student hiring with job posting, applicant review, and verified company operations in Uniwork.",
    eyebrow: "For companies",
    signUp: "Create company account",
    title: "Hire foreign students in Korea with less friction",
  },
} satisfies Record<Locale, Record<string, string>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];
  const canonical = getLocalizedPath("/corp", locale);

  return {
    alternates: {
      canonical,
    },
    description: t.description,
    openGraph: {
      description: t.description,
      title: "For Companies | Uniwork",
      url: canonical,
    },
    title: "For Companies | Uniwork",
  };
}

export default async function CorpPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];

  return (
    <PublicShell locale={locale}>
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            {t.eyebrow}
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
            {t.body}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              className={cn(buttonVariants({ size: "lg" }))}
              href={getLocalizedPath("/company", locale)}
            >
              {t.dashboard}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              href={getLocalizedPath("/signup?role=company", locale)}
            >
              {t.signUp}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
        {services[locale].map((service) => {
          const Icon = service.icon;

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={service.title}
            >
              <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Icon className="size-6" />
              </div>
              <h2 className="mt-5 text-xl font-black">{service.title}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                {service.description}
              </p>
            </article>
          );
        })}
      </section>
    </PublicShell>
  );
}
