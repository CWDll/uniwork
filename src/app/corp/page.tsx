import { ArrowRight, Building2, FileCheck2, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const services = [
  {
    title: "무료 공고 등록",
    description: "MVP 단계에서는 기업 공고 등록을 무료로 열어 초기 수요를 확보합니다.",
    icon: FileCheck2,
  },
  {
    title: "지원자 확인",
    description: "지원자의 비자 상태, 학교, 가능 근무시간을 한 화면에서 확인합니다.",
    icon: UsersRound,
  },
  {
    title: "행정 지원 연결",
    description: "필요한 요청은 운영자가 검토한 뒤 행정사 파트너에게 수동 배정합니다.",
    icon: Building2,
  },
];

export const metadata: Metadata = {
  alternates: {
    canonical: "/corp",
  },
  description:
    "외국인 유학생 채용 공고 등록, 지원자 확인, 행정 요청 관리를 Uniwork 기업 대시보드에서 시작하세요.",
  openGraph: {
    description:
      "외국인 유학생 채용을 위한 공고 등록, 지원자 검토, 행정 지원 연결",
    title: "For Companies | Uniwork",
    url: "/corp",
  },
  title: "For Companies | Uniwork",
};

export default function CorpPage() {
  return (
    <PublicShell>
      <section className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            For companies
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
            외국인 유학생 채용을 더 쉽게 시작하세요
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
            Uniwork는 채용공고, 지원자 확인, 행정 지원 요청을 기업 대시보드에서
            한 번에 관리하는 구조로 설계됩니다.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Link className={cn(buttonVariants({ size: "lg" }))} href="/company">
              기업 대시보드 보기
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              href="/signup"
            >
              기업 계정 만들기
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
        {services.map((service) => {
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
