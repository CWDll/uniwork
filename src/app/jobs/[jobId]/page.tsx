import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  type LucideIcon,
  LockKeyhole,
  MapPin,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JobApplicationForm } from "@/components/jobs/job-application-form";
import { PublicShell } from "@/components/layout/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationCompletion } from "@/lib/applications/completeness";
import { getJobEligibility, type JobEligibility } from "@/lib/jobs/eligibility";
import { getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, description, location, employment_type, category, wage_type, wage_amount, visa_support_type, korean_requirement, status, published_at",
    )
    .eq("id", jobId)
    .eq("status", "published")
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry, address, verification_status")
    .eq("id", job.company_id)
    .maybeSingle();

  const { data: existingApplication } = user
    ? await supabase
        .from("job_applications")
        .select("id, status, resume_id")
        .eq("job_id", job.id)
        .eq("seeker_id", user.id)
        .maybeSingle()
    : { data: null };
  const { data: seekerProfile } = user
    ? await supabase
        .from("seeker_profiles")
        .select(
          "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const { data: resume } = user
    ? await supabase
        .from("resumes")
        .select("id, title, intro, education, experience, languages, updated_at")
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const { data: visaRule } = seekerProfile?.visa_type
    ? await supabase
        .from("visa_eligibility_rules")
        .select("visa_type, can_apply, needs_review, blocked_reason")
        .eq("visa_type", seekerProfile.visa_type)
        .maybeSingle()
    : { data: null };
  const eligibility = getJobEligibility({
    isSignedIn: Boolean(user),
    jobVisaSupportType: job.visa_support_type,
    rule: visaRule,
    visaType: seekerProfile?.visa_type,
  });

  const wage =
    job.wage_amount && job.wage_type
      ? `${Number(job.wage_amount).toLocaleString("ko-KR")} KRW / ${job.wage_type}`
      : "협의";
  const existingApplicationStatus = getStatusMeta(
    "application",
    existingApplication?.status,
  );
  const completion = getApplicationCompletion({
    profile: seekerProfile,
    resume,
  });

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="min-w-0">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-blue-700"
            href="/jobs"
          >
            <ArrowLeft className="size-4" />
            Jobs
          </Link>

          <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {job.category || "Part-time"}
              </span>
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {job.visa_support_type || "Visa review"}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {job.title}
            </h1>
            <p className="mt-3 text-base font-semibold text-slate-600">
              {company?.name ?? "Company"}
              {company?.verification_status === "verified" ? (
                <span className="ml-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                  인증 기업
                </span>
              ) : null}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Info label="Location" value={job.location || "-"} />
              <Info label="Type" value={job.employment_type || "-"} />
              <Info label="Wage" value={wage} />
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="text-xl font-black">공고 설명</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700">
                {job.description}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Info
                label="Korean requirement"
                value={job.korean_requirement || "별도 협의"}
              />
              <Info
                label="Company address"
                value={company?.address || job.location || "-"}
              />
            </div>
          </article>
        </div>

        <aside className="h-max rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
              {(company?.name ?? "UW").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-black">{company?.name ?? "Company"}</p>
              <p className="text-sm font-semibold text-slate-500">
                {company?.industry || "Industry"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-600">
            {company?.verification_status === "verified" ? (
              <span className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-4" />
                운영자 인증 기업
              </span>
            ) : null}
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-slate-400" />
              {job.location || "-"}
            </span>
            <span className="flex items-center gap-2">
              <BriefcaseBusiness className="size-4 text-slate-400" />
              {job.employment_type || "-"}
            </span>
            {job.published_at ? (
              <span className="flex items-center gap-2 text-slate-500">
                <FileText className="size-4 text-slate-400" />
                공개일 {new Date(job.published_at).toLocaleDateString("ko-KR")}
              </span>
            ) : null}
          </div>

          {existingApplication ? (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              이미 지원한 공고입니다. 상태: {existingApplicationStatus.label}
            </div>
          ) : user && eligibility.canApply && completion.isComplete ? (
            <>
              <EligibilityPanel eligibility={eligibility} />
              <ApplicationSnapshotPanel
                completionLabel={`${completion.completedCount}/${completion.totalCount}`}
                profile={seekerProfile}
                resume={resume}
                resumeTitle={resume?.title || "Uniwork Resume"}
              />
              <JobApplicationForm jobId={job.id} />
            </>
          ) : user ? (
            <>
              <EligibilityPanel eligibility={eligibility} />
              {eligibility.canApply ? (
                <ApplicationReadinessPanel completion={completion} />
              ) : (
                <Link
                  className={cn(buttonVariants({ className: "mt-4 w-full" }))}
                  href={
                    eligibility.status === "profile_required"
                      ? "/me/profile"
                      : "/me/admin-requests"
                  }
                >
                  {eligibility.status === "profile_required"
                    ? "프로필 입력하기"
                    : "행정 검토 요청하기"}
                </Link>
              )}
            </>
          ) : (
            <>
              <EligibilityPanel eligibility={eligibility} />
              <Link
                className={cn(buttonVariants({ className: "mt-5 w-full" }))}
                href={`/login?next=/jobs/${job.id}`}
              >
                로그인 후 지원하기
              </Link>
            </>
          )}
        </aside>
      </section>
    </PublicShell>
  );
}

function ApplicationSnapshotPanel({
  completionLabel,
  profile,
  resume,
  resumeTitle,
}: {
  completionLabel: string;
  profile: ApplicationPanelProfile;
  resume: ApplicationPanelResume;
  resumeTitle: string;
}) {
  const resumeIntro = resume?.intro?.trim() || "자기소개가 없습니다.";
  const educationCount = countRows(resume?.education);
  const experienceCount = countRows(resume?.experience);
  const languageLabels = getLanguageLabels(resume?.languages);

  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 size-5 shrink-0 text-blue-700" />
        <div className="min-w-0">
          <p className="text-sm font-black text-blue-950">제출 전 확인</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
            지원하면 아래 정보가 기업에 전달되고 제출 시점 그대로 저장됩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <SnapshotRow
          icon={UserRound}
          label="프로필"
          value={`${profile?.nationality || "국적 미입력"} · ${profile?.visa_type || "비자 미입력"}`}
        />
        <SnapshotRow
          icon={GraduationCap}
          label="학교"
          value={`${profile?.school || "학교 미입력"} · ${profile?.major || "전공 미입력"}`}
        />
        <SnapshotRow
          icon={Languages}
          label="언어"
          value={[
            profile?.korean_level ? `한국어 ${profile.korean_level}` : "",
            profile?.english_level ? `영어 ${profile.english_level}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <SnapshotRow icon={FileText} label="이력서" value={resumeTitle} />
      </div>

      <div className="mt-3 rounded-lg bg-white/70 p-3">
        <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-700">
          {resumeIntro}
        </p>
        <p className="mt-2 text-xs font-black text-slate-500">
          학력 {educationCount}개 · 경력 {experienceCount}개 · 언어{" "}
          {languageLabels.length > 0 ? languageLabels.join(", ") : "미입력"}
        </p>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-3 text-xs font-semibold leading-5 text-slate-600">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-blue-700" />
        <p>
          외국인등록번호, 여권번호 원본은 제출하지 않습니다. 기업은 지원자
          검토에 필요한 프로필, 이력서, 지원 메시지만 확인합니다.
        </p>
      </div>

      <p className="mt-3 text-xs font-black text-blue-700">
        지원 정보 완성도 {completionLabel}
      </p>
    </div>
  );
}

type ApplicationPanelProfile = {
  english_level?: string | null;
  korean_level?: string | null;
  major?: string | null;
  nationality?: string | null;
  school?: string | null;
  visa_type?: string | null;
} | null;

type ApplicationPanelResume = {
  education?: unknown;
  experience?: unknown;
  intro?: string | null;
  languages?: unknown;
} | null;

function SnapshotRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[18px_64px_minmax(0,1fr)] items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs">
      <Icon className="mt-0.5 size-4 text-blue-700" />
      <span className="font-black text-slate-500">{label}</span>
      <span className="break-words font-bold text-slate-800">{value || "미입력"}</span>
    </div>
  );
}

function countRows(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getLanguageLabels(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const language = item as { level?: unknown; name?: unknown };
    const name = typeof language.name === "string" ? language.name : "";
    const level = typeof language.level === "string" ? language.level : "";
    const label = [name, level].filter(Boolean).join(" ");

    return label ? [label] : [];
  });
}

function ApplicationReadinessPanel({
  completion,
}: {
  completion: ReturnType<typeof getApplicationCompletion>;
}) {
  const profileMissing = completion.profile.missing;
  const resumeMissing = completion.resume.missing;

  return (
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
      <p className="text-sm font-black text-amber-950">지원 전 보완이 필요합니다</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
        기업에게 전달할 프로필/이력 정보가 아직 부족합니다.
      </p>
      <div className="mt-3 grid gap-2 text-xs font-bold text-amber-900">
        {profileMissing.length > 0 ? (
          <p>프로필: {profileMissing.slice(0, 5).join(", ")}</p>
        ) : null}
        {resumeMissing.length > 0 ? (
          <p>이력서: {resumeMissing.slice(0, 5).join(", ")}</p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {profileMissing.length > 0 ? (
          <Link
            className={cn(buttonVariants({ className: "w-full" }))}
            href="/me/profile"
          >
            프로필 보완
          </Link>
        ) : null}
        {resumeMissing.length > 0 ? (
          <Link
            className={cn(buttonVariants({ className: "w-full", variant: "outline" }))}
            href="/me/resume"
          >
            이력서 보완
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function EligibilityPanel({ eligibility }: { eligibility: JobEligibility }) {
  const Icon = eligibility.canApply ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        "mt-5 rounded-xl border p-4",
        eligibility.status === "eligible" &&
          "border-emerald-100 bg-emerald-50 text-emerald-900",
        eligibility.status === "review_required" &&
          "border-amber-100 bg-amber-50 text-amber-900",
        eligibility.status === "blocked" && "border-red-100 bg-red-50 text-red-900",
        eligibility.status === "profile_required" &&
          "border-slate-200 bg-slate-50 text-slate-800",
        eligibility.status === "sign_in_required" &&
          "border-blue-100 bg-blue-50 text-blue-900",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0" />
        <p className="font-black">{eligibility.label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6">
        {eligibility.description}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
