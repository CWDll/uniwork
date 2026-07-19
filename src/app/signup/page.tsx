import { Building2, GraduationCap } from "lucide-react";
import type { ReactElement } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { PublicShell } from "@/components/layout/public-shell";
import { getLocale, type Locale } from "@/lib/i18n";

const copy = {
  ko: {
    companyNote: "기업은 회사 정보, 담당자, 채용 계획을 작성합니다.",
    seekerNote: "구직자는 비자, 학교, 전공, 가능 근무시간을 작성합니다.",
    subtitle: "역할별 가입 정보를 분리해서 받습니다",
    title: "회원가입",
  },
  en: {
    companyNote:
      "Companies provide business information, manager details, and hiring context.",
    seekerNote:
      "Job seekers provide visa, school, major, and availability information.",
    subtitle: "Create the right account for your Uniwork workflow",
    title: "Sign up",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; role?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params.locale);
  const t = copy[locale];
  const initialRole = params.role === "company" ? "company" : "seeker";

  return (
    <PublicShell locale={locale}>
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            {t.title}
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight">
            {t.subtitle}
          </h1>
          <div className="mt-6 grid gap-3">
            <RoleNote
              icon={<GraduationCap className="size-5" />}
              text={t.seekerNote}
            />
            <RoleNote
              icon={<Building2 className="size-5" />}
              text={t.companyNote}
            />
          </div>
        </aside>

        <SignupForm initialRole={initialRole} locale={locale} />
      </section>
    </PublicShell>
  );
}

function RoleNote({ icon, text }: { icon: ReactElement; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">
      <span className="text-blue-700">{icon}</span>
      {text}
    </div>
  );
}
