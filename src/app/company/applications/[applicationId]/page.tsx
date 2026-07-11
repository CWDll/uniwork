import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  DatabaseZap,
  Mail,
  MapPin,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationStatusForm } from "@/components/company/application-status-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationAttention } from "@/lib/applications/attention";
import { getApplicationCompletion } from "@/lib/applications/completeness";
import {
  formatSnapshotTime,
  getApplicationSnapshotMeta,
  getProfileForApplication,
  getResumeForApplication,
} from "@/lib/applications/snapshot";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type TextArray = string[] | null;
type EducationItem = {
  major?: string;
  period?: string;
  school?: string;
};
type ExperienceItem = {
  company?: string;
  description?: string;
  period?: string;
  role?: string;
};
type LanguageItem = {
  level?: string;
  name?: string;
};

export default async function CompanyApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("job_applications")
    .select(
      "id, job_id, seeker_id, resume_id, profile_snapshot, resume_snapshot, status, message, company_note, applied_at, status_updated_at",
    )
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

  const [
    { data: company },
    { data: profile },
    { data: seekerProfile },
    { data: resume },
    { data: statusEvents },
  ] =
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
      application.resume_id
        ? supabase
            .from("resumes")
            .select("id, title, intro, education, experience, languages")
            .eq("id", application.resume_id)
            .maybeSingle()
        : supabase
            .from("resumes")
            .select("id, title, intro, education, experience, languages")
            .eq("seeker_id", application.seeker_id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
      supabase
        .from("application_status_events")
        .select("id, actor_id, from_status, to_status, note, created_at")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!company || !profile) {
    notFound();
  }

  const avatarUrl = getProfilePhotoUrl(supabase, profile.avatar_path);
  const submittedProfile = getProfileForApplication({
    liveProfile: seekerProfile,
    snapshot: application.profile_snapshot,
  });
  const submittedResume = getResumeForApplication({
    liveResume: resume,
    snapshot: application.resume_snapshot,
  });
  const snapshotMeta = getApplicationSnapshotMeta({
    appliedAt: application.applied_at,
    profileSnapshot: application.profile_snapshot,
    resumeSnapshot: application.resume_snapshot,
  });
  const completion = getApplicationCompletion({
    profile: submittedProfile ?? null,
    resume: submittedResume ?? null,
  });
  const attention = getApplicationAttention({
    appliedAt: application.applied_at,
    hasCompanyNote: Boolean(application.company_note?.trim()),
    hasCompleteSnapshot: snapshotMeta.hasCompleteSnapshot,
    isComplete: completion.isComplete,
    status: application.status,
    statusUpdatedAt: application.status_updated_at,
  });
  const status = getStatusMeta("application", application.status);
  const actorIds = Array.from(
    new Set(statusEvents?.map((event) => event.actor_id).filter(Boolean) ?? []),
  );
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", actorIds)
      : { data: [] };
  const actorById = new Map(actors?.map((actor) => [actor.id, actor]) ?? []);
  const wage =
    job.wage_amount && job.wage_type
      ? `${Number(job.wage_amount).toLocaleString("ko-KR")} KRW / ${job.wage_type}`
      : "협의";
  const availableTimes =
    submittedProfile?.available_times &&
    typeof submittedProfile.available_times === "object" &&
    !Array.isArray(submittedProfile.available_times)
      ? (submittedProfile.available_times as { weekday?: string; weekend?: string })
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
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-2xl font-black text-blue-700 sm:size-24">
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
                  <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ReviewSignal
                label="처리 우선순위"
                tone={attention.score >= 40 ? "red" : "slate"}
                value={attention.score >= 40 ? attention.summary : "추가 조치 없음"}
              />
              <ReviewSignal
                label="지원 정보"
                tone={completion.isComplete ? "green" : "amber"}
                value={`${completion.completedCount}/${completion.totalCount}`}
              />
              <ReviewSignal
                label="제출 데이터"
                tone={snapshotMeta.hasCompleteSnapshot ? "green" : "amber"}
                value={snapshotMeta.label}
              />
            </div>

            <div className="mt-4 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 lg:hidden">
              <p className="text-sm font-black text-slate-900">빠른 처리</p>
              <ApplicationStatusForm
                applicationId={application.id}
                currentNote={application.company_note}
                currentStatus={application.status}
                showNoteField
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  className={cn(
                    buttonVariants({ className: "min-h-11 w-full", variant: "outline" }),
                  )}
                  href={`/jobs/${job.id}`}
                >
                  공고 보기
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ className: "min-h-11 w-full", variant: "outline" }),
                  )}
                  href={`/company/applications/${application.id}/print`}
                >
                  <Printer className="size-4" />
                  PDF 저장
                </Link>
              </div>
            </div>

            <SnapshotNotice
              capturedAt={snapshotMeta.capturedAt}
              hasCompleteSnapshot={snapshotMeta.hasCompleteSnapshot}
              label={snapshotMeta.label}
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Info label="Nationality" value={submittedProfile?.nationality || "미입력"} />
              <Info label="Visa" value={submittedProfile?.visa_type || "미입력"} />
              <Info
                label="Alien registration"
                value={submittedProfile?.alien_registration_status || "미입력"}
              />
              <Info
                label="School"
                value={`${submittedProfile?.school || "미입력"} · ${submittedProfile?.major || "전공 미입력"}`}
              />
              <Info label="Korean" value={submittedProfile?.korean_level || "미입력"} />
              <Info label="English" value={submittedProfile?.english_level || "미입력"} />
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
                  values={(submittedProfile?.preferred_locations as TextArray) ?? []}
                />
                <TagList
                  label="Preferred jobs"
                  values={(submittedProfile?.preferred_job_types as TextArray) ?? []}
                />
              </div>
            </Section>

            <Section title="지원 메시지">
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                {application.message || "지원 메시지가 없습니다."}
              </p>
            </Section>

            <Section title="기업 안내 메모">
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                {application.company_note ||
                  "아직 구직자에게 전달한 상태 안내 메모가 없습니다."}
              </p>
            </Section>

            <Section title="상태 변경 이력">
              <StatusTimeline
                actorById={actorById}
                emptyText="아직 상태 변경 이력이 없습니다."
                events={statusEvents ?? []}
              />
            </Section>

            <Section title="이력과 자기소개">
              {submittedResume ? (
                <div className="grid gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-500">
                        {submittedResume.title || "Uniwork Resume"}
                      </p>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                        {snapshotMeta.label}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-blue-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                      {submittedResume.intro || "자기소개가 없습니다."}
                    </p>
                  </div>
                  <ResumeList
                    emptyText="학력 정보가 없습니다."
                    items={normalizeEducation(submittedResume.education)}
                    render={(item) => ({
                      body: [item.school, item.major].filter(Boolean).join(" · "),
                      meta: item.period,
                      title: item.school || item.major || "Education",
                    })}
                    title="Education"
                  />
                  <ResumeList
                    emptyText="경력 정보가 없습니다."
                    items={normalizeExperience(submittedResume.experience)}
                    render={(item) => ({
                      body: item.description,
                      meta: [item.company, item.period].filter(Boolean).join(" · "),
                      title: item.role || item.company || "Experience",
                    })}
                    title="Experience"
                  />
                  <TagList
                    label="Languages"
                    values={normalizeLanguages(submittedResume.languages).map((item) =>
                      [item.name, item.level].filter(Boolean).join(" · "),
                    )}
                  />
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  구직자가 아직 이력/소개 정보를 입력하지 않았습니다.
                </p>
              )}
            </Section>
          </article>
        </div>

        <aside className="hidden h-max rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20 lg:block">
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
            {attention.flags.isOverdueReview ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-sm font-black text-red-900">
                  24시간 이상 미검토 알림 대상
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-red-800">
                  상태를 검토 중으로 바꾸거나 구직자에게 안내 메모를 남겨주세요.
                </p>
              </div>
            ) : null}
            <Info
              label="Submission data"
              value={`${snapshotMeta.label} · ${formatSnapshotTime(snapshotMeta.capturedAt)}`}
            />
            <Info
              label="Status updated"
              value={
                application.status_updated_at
                  ? new Date(application.status_updated_at).toLocaleString("ko-KR")
                  : "-"
              }
            />
            <Info label="Category" value={job.category || "-"} />
            <Info label="Wage" value={wage} />
            <Info label="Visa condition" value={job.visa_support_type || "-"} />
            <Info label="Korean requirement" value={job.korean_requirement || "-"} />
          </div>
          <div className="mt-5">
            <ApplicationStatusForm
              applicationId={application.id}
              currentNote={application.company_note}
              currentStatus={application.status}
              showNoteField
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

function ReviewSignal({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "green" | "red" | "slate";
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        tone === "red" && "border-red-100 bg-red-50 text-red-950",
        tone === "amber" && "border-amber-100 bg-amber-50 text-amber-950",
        tone === "green" && "border-emerald-100 bg-emerald-50 text-emerald-950",
        tone === "slate" && "border-slate-100 bg-slate-50 text-slate-800",
      )}
    >
      <p className="text-[11px] font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

function StatusTimeline({
  actorById,
  emptyText,
  events,
}: {
  actorById: Map<string, { email: string | null; id: string; name: string | null }>;
  emptyText: string;
  events: {
    actor_id: string | null;
    created_at: string;
    from_status: string | null;
    id: string;
    note: string | null;
    to_status: string;
  }[];
}) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => {
        const actor = event.actor_id ? actorById.get(event.actor_id) : null;
        const fromStatus = event.from_status
          ? getStatusMeta("application", event.from_status).label
          : "이전 상태 없음";
        const toStatus = getStatusMeta("application", event.to_status).label;

        return (
          <article className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={event.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-slate-900">
                {fromStatus} → {toStatus}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {new Date(event.created_at).toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">
              처리자 {actor?.name || actor?.email || "담당자"}
            </p>
            {event.note ? (
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                {event.note}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function SnapshotNotice({
  capturedAt,
  hasCompleteSnapshot,
  label,
}: {
  capturedAt: string | null;
  hasCompleteSnapshot: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "mt-6 rounded-2xl border p-4",
        hasCompleteSnapshot
          ? "border-emerald-100 bg-emerald-50 text-emerald-950"
          : "border-amber-100 bg-amber-50 text-amber-950",
      )}
    >
      <div className="flex items-start gap-3">
        <DatabaseZap className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6">
            {hasCompleteSnapshot
              ? "아래 프로필과 이력서는 지원자가 제출 버튼을 누른 시점의 고정본입니다."
              : "제출본 저장 기능 이전 지원입니다. 현재 접근 가능한 프로필/이력 정보로 표시합니다."}
          </p>
          <p className="mt-2 text-xs font-black">
            기준 시각 {formatSnapshotTime(capturedAt)}
          </p>
        </div>
      </div>
    </div>
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
    <section className="mt-7 border-t border-slate-100 pt-5 sm:mt-8 sm:pt-6">
      <h2 className="text-lg font-black text-slate-950 sm:text-xl">{title}</h2>
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

function normalizeEducation(value: unknown): EducationItem[] {
  return Array.isArray(value) ? (value as EducationItem[]) : [];
}

function normalizeExperience(value: unknown): ExperienceItem[] {
  return Array.isArray(value) ? (value as ExperienceItem[]) : [];
}

function normalizeLanguages(value: unknown): LanguageItem[] {
  return Array.isArray(value) ? (value as LanguageItem[]) : [];
}

function ResumeList<T>({
  emptyText,
  items,
  render,
  title,
}: {
  emptyText: string;
  items: T[];
  render: (item: T) => { body?: string; meta?: string; title: string };
  title: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <div className="mt-2 grid gap-2">
        {items.length > 0 ? (
          items.map((item, index) => {
            const rendered = render(item);

            return (
              <div
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                key={`${title}-${index}`}
              >
                <p className="text-sm font-black text-slate-800">{rendered.title}</p>
                {rendered.meta ? (
                  <p className="mt-1 text-xs font-bold text-slate-500">{rendered.meta}</p>
                ) : null}
                {rendered.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                    {rendered.body}
                  </p>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}
