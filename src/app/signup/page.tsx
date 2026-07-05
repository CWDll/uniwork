import { Building2, GraduationCap } from "lucide-react";
import type { ReactElement } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            Sign up
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight">
            역할별 가입 정보를 분리해서 받습니다
          </h1>
          <div className="mt-6 grid gap-3">
            <RoleNote
              icon={<GraduationCap className="size-5" />}
              text="구직자는 비자, 학교, 전공, 가능 근무시간을 작성합니다."
            />
            <RoleNote
              icon={<Building2 className="size-5" />}
              text="기업은 회사 정보, 담당자, 채용 계획을 작성합니다."
            />
          </div>
        </aside>

        <form className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Role
              <select className="h-11 rounded-md border border-slate-200 px-3">
                <option>Seeker</option>
                <option>Company</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Name
              <input className="h-11 rounded-md border border-slate-200 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              Email
              <input className="h-11 rounded-md border border-slate-200 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
              Password
              <input
                className="h-11 rounded-md border border-slate-200 px-3"
                type="password"
              />
            </label>
          </div>
          <Button className="mt-6 h-11 w-full" type="button">
            Create account
          </Button>
        </form>
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
