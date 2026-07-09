import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationPrintActions } from "@/components/company/application-print-actions";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";

type TextArray = string[] | null;

export default async function CompanyApplicationPrintPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("job_applications")
    .select("id, job_id, seeker_id, status, message, applied_at")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    notFound();
  }

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, location, employment_type, category, wage_type, wage_amount, visa_support_type, korean_requirement",
    )
    .eq("id", application.job_id)
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const [{ data: company }, { data: profile }, { data: seekerProfile }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, name, industry, address")
        .eq("id", job.company_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, name, email, phone, avatar_path")
        .eq("id", application.seeker_id)
        .maybeSingle(),
      supabase
        .from("seeker_profiles")
        .select(
          "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
        )
        .eq("user_id", application.seeker_id)
        .maybeSingle(),
    ]);

  if (!company || !profile) {
    notFound();
  }

  const avatarUrl = getProfilePhotoUrl(supabase, profile.avatar_path);
  const status = getStatusMeta("application", application.status);
  const wage =
    job.wage_amount && job.wage_type
      ? `${Number(job.wage_amount).toLocaleString("ko-KR")} KRW / ${job.wage_type}`
      : "협의";
  const availableTimes =
    seekerProfile?.available_times &&
    typeof seekerProfile.available_times === "object" &&
    !Array.isArray(seekerProfile.available_times)
      ? (seekerProfile.available_times as { weekday?: string; weekend?: string })
      : {};

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          .print-sheet { box-shadow: none !important; border: 0 !important; width: 100% !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="no-print mx-auto mb-4 flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-blue-700"
          href={`/company/applications/${application.id}`}
        >
          <ArrowLeft className="size-4" />
          상세 화면으로 돌아가기
        </Link>
        <ApplicationPrintActions />
      </div>

      <article className="print-sheet mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Uniwork Applicant Profile
            </p>
            <h1 className="mt-2 break-words text-3xl font-black">
              {profile.name || profile.email}
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">{profile.email}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              지원일 {new Date(application.applied_at).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-2xl font-black text-blue-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Applicant profile photo"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              (profile.name || profile.email || "A").slice(0, 1)
            )}
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-lg font-black">지원 공고</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Job" value={job.title} />
            <Info label="Company" value={company.name} />
            <Info label="Status" value={status.label} />
            <Info label="Location" value={job.location || company.address || "-"} />
            <Info label="Employment" value={job.employment_type || "-"} />
            <Info label="Wage" value={wage} />
            <Info label="Visa condition" value={job.visa_support_type || "-"} />
            <Info label="Korean requirement" value={job.korean_requirement || "-"} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-black">기본 프로필</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Nationality" value={seekerProfile?.nationality || "미입력"} />
            <Info label="Visa" value={seekerProfile?.visa_type || "미입력"} />
            <Info
              label="Alien registration"
              value={seekerProfile?.alien_registration_status || "미입력"}
            />
            <Info
              label="School"
              value={`${seekerProfile?.school || "미입력"} · ${seekerProfile?.major || "전공 미입력"}`}
            />
            <Info label="Korean" value={seekerProfile?.korean_level || "미입력"} />
            <Info label="English" value={seekerProfile?.english_level || "미입력"} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-black">근무 가능 시간과 희망 조건</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Weekday" value={availableTimes.weekday || "미입력"} />
            <Info label="Weekend" value={availableTimes.weekend || "미입력"} />
            <Info
              label="Preferred locations"
              value={formatList((seekerProfile?.preferred_locations as TextArray) ?? [])}
            />
            <Info
              label="Preferred jobs"
              value={formatList((seekerProfile?.preferred_job_types as TextArray) ?? [])}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-black">지원 메시지</h2>
          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
            {application.message || "지원 메시지가 없습니다."}
          </p>
        </section>
      </article>
    </main>
  );
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "미입력";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
