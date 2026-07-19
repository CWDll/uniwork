import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buttonVariants } from "@/components/ui/button";
import { getApplicationCompletion } from "@/lib/applications/completeness";
import { getProfilePhotoUrl } from "@/lib/profile-photo";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SeekerProfile = {
  alien_registration_status: string | null;
  available_times: {
    weekday?: string;
    weekend?: string;
  } | null;
  english_level: string | null;
  korean_level: string | null;
  major: string | null;
  nationality: string | null;
  preferred_job_types: string[] | null;
  preferred_locations: string[] | null;
  school: string | null;
  visa_type: string | null;
};

function getProfileCompletion(profile: SeekerProfile | null) {
  if (!profile) {
    return 0;
  }

  const checks = [
    profile.nationality,
    profile.visa_type,
    profile.alien_registration_status,
    profile.school,
    profile.major,
    profile.korean_level,
    profile.english_level,
    profile.preferred_locations?.length,
    profile.preferred_job_types?.length,
    profile.available_times?.weekday || profile.available_times?.weekend,
  ];
  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
}

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const [
    { data: profile },
    { data: applications, count: applicationCount },
    { data: adminRequests, count: adminRequestCount },
    { data: resume },
  ] = await Promise.all([
      supabase
        .from("seeker_profiles")
        .select(
          "nationality, visa_type, alien_registration_status, school, major, korean_level, english_level, preferred_locations, preferred_job_types, available_times",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("job_applications")
        .select("id, job_id, status, applied_at, status_updated_at, company_note", {
          count: "exact",
        })
        .eq("seeker_id", user.id)
        .order("applied_at", { ascending: false }),
      supabase
        .from("admin_requests")
        .select(
          "id, type, status, seeker_followup_note, seeker_followup_requested_at, updated_at",
          { count: "exact" },
        )
        .eq("seeker_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("resumes")
        .select("id, title, intro, education, experience, languages")
        .eq("seeker_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
  const { data: accountProfile } = await supabase
    .from("profiles")
    .select("name, email, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const avatarUrl = getProfilePhotoUrl(supabase, accountProfile?.avatar_path);
  const recentApplications = applications?.slice(0, 3) ?? [];
  const recentJobIds = recentApplications.map((application) => application.job_id);
  const { data: recentJobs } =
    recentJobIds.length > 0
      ? await supabase
          .from("jobs")
          .select("id, company_id, title, location, employment_type")
          .in("id", recentJobIds)
      : { data: [] };
  const recentCompanyIds = Array.from(
    new Set(recentJobs?.map((job) => job.company_id) ?? []),
  );
  const { data: recentCompanies } =
    recentCompanyIds.length > 0
      ? await supabase.from("companies").select("id, name").in("id", recentCompanyIds)
      : { data: [] };
  const jobById = new Map(recentJobs?.map((job) => [job.id, job]) ?? []);
  const companyById = new Map(
    recentCompanies?.map((company) => [company.id, company]) ?? [],
  );
  const { data: recommendedJobs } = await supabase
    .from("jobs")
    .select(
      "id, company_id, title, location, employment_type, category, wage_type, wage_amount, visa_support_type, published_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(6);
  const recommendedCompanyIds = Array.from(
    new Set(recommendedJobs?.map((job) => job.company_id) ?? []),
  );
  const { data: recommendedCompanies } =
    recommendedCompanyIds.length > 0
      ? await supabase
          .from("companies")
          .select("id, name, verification_status")
          .in("id", recommendedCompanyIds)
      : { data: [] };
  const recommendedCompanyById = new Map(
    recommendedCompanies?.map((company) => [company.id, company]) ?? [],
  );

  const profileCompletion = getProfileCompletion(profile);
  const applicationCompletion = getApplicationCompletion({
    profile,
    resume,
  });
  const nextSteps = [
    {
      complete: applicationCompletion.profile.isComplete,
      href: "/me/profile",
      label: "프로필 입력",
      note: applicationCompletion.profile.isComplete
        ? "비자/학교/근무 가능 시간 준비 완료"
        : `${applicationCompletion.profile.missing.slice(0, 2).join(", ")} 보완 필요`,
    },
    {
      complete: applicationCompletion.resume.isComplete,
      href: "/me/resume",
      label: "이력서 입력",
      note: applicationCompletion.resume.isComplete
        ? "자기소개/언어 정보 준비 완료"
        : `${applicationCompletion.resume.missing.slice(0, 2).join(", ")} 보완 필요`,
    },
    {
      complete: applicationCompletion.isComplete,
      href: applicationCompletion.isComplete ? "/jobs?profile_fit=eligible" : "/jobs",
      label: "공고 찾기",
      note: applicationCompletion.isComplete
        ? "내 프로필 기준 지원 가능 공고 확인"
        : "정보 보완 후 지원 가능성이 더 정확해집니다",
    },
  ];
  const cards = [
    {
      label: "프로필",
      value: `${profileCompletion}%`,
      note:
        profileCompletion === 100
          ? "지원 기본 정보 입력 완료"
          : "D-2/D-4 지원 검토를 위한 기본 정보",
      icon: ShieldCheck,
    },
    {
      label: "지원 내역",
      value: String(applicationCount ?? 0),
      note: "내가 지원한 공고 수",
      icon: Send,
    },
    {
      label: "이력서",
      value: `${applicationCompletion.resume.completedCount}/${applicationCompletion.resume.totalCount}`,
      note: applicationCompletion.resume.isComplete
        ? "기업에게 보여줄 이력 정보 입력 완료"
        : "자기소개와 언어 정보를 입력해주세요",
      icon: FileText,
    },
    {
      label: "행정 요청",
      value: String(adminRequestCount ?? 0),
      note: "접수한 행정 요청 수",
      icon: FileText,
    },
  ];
  const applicationStatusCounts = new Map<string, number>();
  applications?.forEach((application) => {
    applicationStatusCounts.set(
      application.status,
      (applicationStatusCounts.get(application.status) ?? 0) + 1,
    );
  });
  const activeFollowupRequests =
    adminRequests?.filter(
      (request) =>
        request.seeker_followup_note &&
        request.status !== "completed" &&
        request.status !== "rejected",
    ) ?? [];
  const latestFollowupRequest = activeFollowupRequests[0];
  const dashboardAlerts = [
    ...(latestFollowupRequest
      ? [
          {
            href: `/me/admin-requests#request-${latestFollowupRequest.id}`,
            label: "행정 요청 보완 필요",
            note: `${getAdminRequestTypeLabel(latestFollowupRequest.type)} · ${
              latestFollowupRequest.seeker_followup_note
            }`,
            tone: "amber",
          },
        ]
      : []),
    ...(!applicationCompletion.profile.isComplete
      ? [
          {
            href: "/me/profile",
            label: "프로필 보완 필요",
            note: applicationCompletion.profile.missing.slice(0, 3).join(", "),
            tone: "slate",
          },
        ]
      : []),
    ...(!applicationCompletion.resume.isComplete
      ? [
          {
            href: "/me/resume",
            label: "이력서 보완 필요",
            note: applicationCompletion.resume.missing.slice(0, 3).join(", "),
            tone: "slate",
          },
        ]
      : []),
    ...(applicationStatusCounts.get("accepted")
      ? [
          {
            href: "/me/applications?status=accepted",
            label: "합격 처리된 지원",
            note: `${applicationStatusCounts.get("accepted")}건의 합격 상태를 확인하세요`,
            tone: "green",
          },
        ]
      : []),
  ].slice(0, 3);

  return (
    <DashboardShell area="me">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-xl font-black text-blue-700">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Profile photo"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              (accountProfile?.name || accountProfile?.email || "U").slice(0, 1)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              Seeker dashboard
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">
              지원 준비 상태와 행정 요청을 관리합니다
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              프로필 완성도, 지원 내역, 행정 요청 현황을 실제 계정 데이터
              기준으로 확인합니다.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-blue-950">
                지원 준비도 {applicationCompletion.completedCount}/
                {applicationCompletion.totalCount}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
                프로필과 이력서를 채우면 공고 상세에서 바로 지원할 수 있습니다.
              </p>
            </div>
            <Link
              className={cn(buttonVariants({ className: "w-full sm:w-auto" }))}
              href={applicationCompletion.isComplete ? "/jobs?profile_fit=eligible" : "/me/profile"}
            >
              {applicationCompletion.isComplete ? "지원 가능 공고 보기" : "준비 시작"}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {nextSteps.map((step) => (
              <Link
                className={cn(
                  "rounded-xl border p-3 transition",
                  step.complete
                    ? "border-emerald-100 bg-white/80"
                    : "border-blue-100 bg-white hover:bg-blue-50",
                )}
                href={step.href}
                key={step.label}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900">{step.label}</p>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-black",
                      step.complete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {step.complete ? "완료" : "필요"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                  {step.note}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-black">최근 지원 현황</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                기업 상태 변경과 안내 메모를 바로 확인합니다.
              </p>
            </div>
            <Link
              className="text-sm font-black text-blue-700 hover:text-blue-900"
              href="/me/applications"
            >
              전체 보기
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentApplications.length > 0 ? (
              recentApplications.map((application) => {
                const job = jobById.get(application.job_id);
                const company = job ? companyById.get(job.company_id) : null;

                return (
                  <article className="px-5 py-4" key={application.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-slate-950">
                          {job?.title ?? "공고"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {company?.name ?? "Company"} · {job?.location ?? "-"} ·{" "}
                          {job?.employment_type ?? "-"}
                        </p>
                      </div>
                      <span className={getStatusBadgeClassName("application", application.status)}>
                        {getStatusMeta("application", application.status).label}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      지원일 {new Date(application.applied_at).toLocaleString("ko-KR")}
                    </p>
                    {application.company_note ? (
                      <p className="mt-2 line-clamp-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">
                        기업 안내: {application.company_note}
                      </p>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="px-5 py-8">
                <p className="text-sm font-black text-slate-700">
                  아직 지원한 공고가 없습니다.
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  준비 정보를 채운 뒤 지원 가능한 공고를 찾아보세요.
                </p>
                <Link
                  className={cn(buttonVariants({ className: "mt-4", size: "sm" }))}
                  href="/jobs"
                >
                  공고 찾기
                </Link>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black">확인 사항</h2>
            <div className="mt-4 grid gap-2">
              {dashboardAlerts.length > 0 ? (
                dashboardAlerts.map((alert) => (
                  <Link
                    className={cn(
                      "group rounded-xl border p-3 transition hover:bg-blue-50",
                      alert.tone === "amber" && "border-amber-100 bg-amber-50",
                      alert.tone === "green" && "border-emerald-100 bg-emerald-50",
                      alert.tone === "slate" && "border-slate-100 bg-slate-50",
                    )}
                    href={alert.href}
                    key={alert.label}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-900">
                        {alert.label}
                      </p>
                      {alert.tone === "green" ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle className="size-4 shrink-0 text-amber-700" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-slate-600">
                      {alert.note || "상세 내용을 확인해주세요."}
                    </p>
                    <p className="mt-2 text-xs font-black text-blue-700 group-hover:text-blue-900">
                      확인하기
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-sm font-black text-emerald-900">
                    지원 준비가 정리되어 있습니다.
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                    맞춤 공고를 확인하고 지원을 이어가세요.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">최근 공개 공고</h2>
              <BriefcaseBusiness className="size-5 text-blue-700" />
            </div>
            <div className="mt-4 grid gap-3">
              {(recommendedJobs ?? []).slice(0, 3).map((job) => {
                const company = recommendedCompanyById.get(job.company_id);
                const wage =
                  job.wage_amount && job.wage_type
                    ? `${Number(job.wage_amount).toLocaleString("ko-KR")} KRW / ${job.wage_type}`
                    : "급여 협의";

                return (
                  <Link
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-blue-50"
                    href={`/jobs/${job.id}`}
                    key={job.id}
                  >
                    <p className="line-clamp-1 text-sm font-black text-slate-950">
                      {job.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      {company?.name ?? "Company"} · {job.location || "-"} · {wage}
                    </p>
                    {company?.verification_status === "verified" ? (
                      <span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                        인증 기업
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              {recommendedJobs && recommendedJobs.length > 0 ? (
                <Link
                  className={cn(buttonVariants({ className: "w-full", size: "sm" }))}
                  href={
                    applicationCompletion.isComplete
                      ? "/jobs?profile_fit=eligible"
                      : "/jobs"
                  }
                >
                  더 많은 공고 보기
                </Link>
              ) : (
                <p className="text-sm font-semibold text-slate-500">
                  아직 공개 공고가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function getAdminRequestTypeLabel(value: string) {
  const labels: Record<string, string> = {
    document_review: "서류 사전 검토",
    other: "기타 상담",
    part_time_work_permission: "시간제 취업 허가 검토",
    visa_eligibility_review: "비자 지원 가능성 검토",
  };

  return labels[value] ?? value;
}
