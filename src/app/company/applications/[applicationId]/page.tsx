import { ArrowLeft, BriefcaseBusiness, CalendarDays, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type TextArray = string[] | null;

export default async function CompanyApplicationDetailPage({
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
    <DashboardShell area="company">
      <Link
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-blue-700"
        href="/company/applications"
      >
        <ArrowLeft className="size-4" />
        Applicants
      </Link>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-2xl font-black text-blue-700">
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-3xl font-black tracking-tight">
                    {profile.name || profile.email}
                  </h1>
                  <span className={getStatusBadgeClassName("application", application.status)}>
                    {status.label}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-2 break-words text-sm font-semibold text-slate-500">
                  <Mail className="size-4 shrink-0" />
                  {profile.email}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <CalendarDays className="size-4 shrink-0" />
                  지원일 {new Date(application.applied_at).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

            <Section title="근무 가능 시간">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Weekday" value={availableTimes.weekday || "미입력"} />
                <Info label="Weekend" value={availableTimes.weekend || "미입력"} />
              </div>
            </Section>

            <Section title="희망 조건">
              <div className="grid gap-3 sm:grid-cols-2">
                <TagList
                  label="Preferred locations"
                  values={(seekerProfile?.preferred_locations as TextArray) ?? []}
                />
                <TagList
                  label="Preferred jobs"
                  values={(seekerProfile?.preferred_job_types as TextArray) ?? []}
                />
              </div>
            </Section>

            <Section title="지원 메시지">
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                {application.message || "지원 메시지가 없습니다."}
              </p>
            </Section>
          </article>
        </div>

        <aside className="h-max rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">
            Application
          </p>
          <h2 className="mt-2 text-xl font-black">{job.title}</h2>
          <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
            <span className="flex gap-2">
              <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-slate-400" />
              {company.name} · {job.employment_type || "-"}
            </span>
            <span className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
              {job.location || company.address || "-"}
            </span>
          </div>
          <div className="mt-5 grid gap-2">
            <Info label="Category" value={job.category || "-"} />
            <Info label="Wage" value={wage} />
            <Info label="Visa condition" value={job.visa_support_type || "-"} />
            <Info label="Korean requirement" value={job.korean_requirement || "-"} />
          </div>
          <div className="mt-5">
            <ApplicationStatusForm
              applicationId={application.id}
              currentStatus={application.status}
            />
          </div>
          <Link
            className={cn(buttonVariants({ className: "mt-4 w-full", variant: "outline" }))}
            href={`/jobs/${job.id}`}
          >
            공고 페이지 보기
          </Link>
          <Link
            className={cn(buttonVariants({ className: "mt-2 w-full", variant: "outline" }))}
            href={`/company/applications/${application.id}/print`}
          >
            지원자 PDF 저장
          </Link>
        </aside>
      </section>
    </DashboardShell>
  );
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-8 border-t border-slate-100 pt-6">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}

function TagList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-600"
              key={value}
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm font-bold text-slate-500">미입력</span>
        )}
      </div>
    </div>
  );
}
