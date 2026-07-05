import { FileText, Send, ShieldCheck } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";

const cards = [
  { label: "Profile", value: "72%", note: "D-2/D-4 eligibility checklist", icon: ShieldCheck },
  { label: "Applications", value: "3", note: "Submitted job applications", icon: Send },
  { label: "Admin requests", value: "1", note: "Waiting for operator review", icon: FileText },
];

export default function MePage() {
  return (
    <DashboardShell area="me">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Seeker dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          지원 준비 상태와 행정 요청을 관리합니다
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          다음 단계에서는 Supabase Auth 사용자와 seeker profile 데이터를 연결합니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={card.label}
            >
              <Icon className="size-5 text-blue-700" />
              <p className="mt-4 text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-black">{card.value}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {card.note}
              </p>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
