import Link from "next/link";

import { updateCompanyVerificationAction } from "@/app/admin/companies/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/admin-auth";
import { getStatusBadgeClassName, getStatusMeta } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

type AdminCompaniesSearchParams = {
  status?: string;
};

const verificationFilters = [
  { value: "verified", label: "인증 완료" },
  { value: "pending", label: "검토 대기" },
  { value: "rejected", label: "인증 반려" },
];

function buildCompaniesHref(status?: string) {
  return status ? `/admin/companies?status=${status}` : "/admin/companies";
}

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<AdminCompaniesSearchParams>;
}) {
  const params = await searchParams;
  const requestedStatus = params.status?.trim() ?? "";
  const activeStatus = ["pending", "rejected", "verified"].includes(requestedStatus)
    ? requestedStatus
    : "verified";
  const { supabase } = await requireAdmin("/admin/companies");

  const { data: allCompanies } = await supabase
    .from("companies")
    .select(
      "id, owner_id, name, business_number, business_registration_path, industry, address, manager_name, manager_phone, notification_email, email_notifications_enabled, verification_status, verification_note, verified_at, created_at",
    )
    .order("created_at", { ascending: false });
  const documentPaths = Array.from(
    new Set(
      allCompanies
        ?.map((company) => company.business_registration_path)
        .filter((path): path is string => Boolean(path)) ?? [],
    ),
  );
  const documentUrlByPath = new Map<string, string>();

  for (const path of documentPaths) {
    const { data } = await supabase.storage
      .from("company-registration-documents")
      .createSignedUrl(path, 60 * 10);

    if (data?.signedUrl) {
      documentUrlByPath.set(path, data.signedUrl);
    }
  }
  const companies = allCompanies?.filter(
    (company) => company.verification_status === activeStatus,
  );
  const ownerIds = Array.from(
    new Set(allCompanies?.map((company) => company.owner_id) ?? []),
  );
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", ownerIds)
      : { data: [] };
  const ownerById = new Map(owners?.map((owner) => [owner.id, owner]) ?? []);
  const statusCounts = new Map<string, number>();
  allCompanies?.forEach((company) => {
    statusCounts.set(
      company.verification_status,
      (statusCounts.get(company.verification_status) ?? 0) + 1,
    );
  });

  return (
    <DashboardShell area="admin">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-black uppercase tracking-wide text-blue-700">
          Company verification
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          기업/지점 인증을 검토합니다
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">
          기업 담당자가 등록한 회사와 지점 정보를 확인하고, 공개 공고 운영에
          필요한 보완 메모를 남깁니다.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {verificationFilters.map((filter) => {
          const isActive = activeStatus === filter.value;

          return (
            <Link
              className={cn(
                "rounded-2xl border p-4 transition",
                isActive
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
              href={buildCompaniesHref(filter.value === "verified" ? "" : filter.value)}
              key={filter.value}
            >
              <p className="text-sm font-black text-slate-500">{filter.label}</p>
              <p className="mt-1 text-2xl font-black">
                {(statusCounts.get(filter.value) ?? 0).toLocaleString("ko-KR")}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Companies {companies?.length ?? 0}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {`${getStatusMeta("companyVerification", activeStatus).label} 기업`}
              </p>
            </div>
            {activeStatus !== "verified" ? (
              <Link
                className="text-sm font-black text-blue-700 hover:text-blue-900"
                href="/admin/companies"
              >
                인증 완료 보기
              </Link>
            ) : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {companies && companies.length > 0 ? (
            companies.map((company) => {
              const owner = ownerById.get(company.owner_id);
              const status = getStatusMeta(
                "companyVerification",
                company.verification_status,
              );
              const readiness = getCompanyReadiness({
                address: company.address,
                businessRegistrationPath: company.business_registration_path,
                businessNumber: company.business_number,
                managerName: company.manager_name,
                managerPhone: company.manager_phone,
                notificationEmail: company.notification_email,
              });
              const reviewGuidance = getReviewGuidance({
                missingCount: readiness.missing.length,
                status: company.verification_status,
              });

              return (
                <details
                  className="group px-5 py-4 open:bg-slate-50/60"
                  key={company.id}
                >
                  <summary className="grid cursor-pointer list-none gap-3 rounded-xl p-1 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_160px_120px] md:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate font-black">{company.name}</h3>
                      <span
                        className={getStatusBadgeClassName(
                          "companyVerification",
                          company.verification_status,
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-500">
                      {company.industry || "-"} · {company.address || "-"} ·{" "}
                      {company.business_number || "사업자번호 미입력"}
                    </p>
                    <p className="text-sm font-bold text-slate-600">
                      준비 {readiness.completed}/{readiness.total}
                    </p>
                    <span className="text-sm font-black text-blue-700 group-open:text-slate-500">
                      상세 보기
                    </span>
                  </summary>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="min-w-0">
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                      <Info
                        label="계정"
                        value={`${owner?.name || "담당자"} · ${owner?.email || "-"}`}
                      />
                      <Info
                        label="담당자"
                        value={`${company.manager_name || "-"}\n${company.manager_phone || "-"}`}
                      />
                      <Info
                        label="알림 이메일"
                        value={`${company.notification_email || owner?.email || "-"} · ${company.email_notifications_enabled ? "ON" : "OFF"}`}
                      />
                      <Info
                        label="인증 준비도"
                        value={`${readiness.completed}/${readiness.total} 항목`}
                      />
                      <Info
                        label="사업자등록증"
                        value={
                          company.business_registration_path
                            ? "제출 완료"
                            : "미제출"
                        }
                      />
                      <Info
                        label="등록일"
                        value={new Date(company.created_at).toLocaleString("ko-KR")}
                      />
                      <Info
                        label="검토일"
                        value={
                          company.verified_at
                            ? new Date(company.verified_at).toLocaleString("ko-KR")
                            : "-"
                        }
                      />
                    </div>
                    {company.business_registration_path ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {documentUrlByPath.get(company.business_registration_path) ? (
                          <>
                            <a
                              className={cn(
                                buttonVariants({ size: "sm", variant: "outline" }),
                              )}
                              href={documentUrlByPath.get(
                                company.business_registration_path,
                              )}
                              rel="noreferrer"
                              target="_blank"
                            >
                              사업자등록증 확인
                            </a>
                            <a
                              className={cn(
                                buttonVariants({ size: "sm", variant: "outline" }),
                              )}
                              href={`/api/admin/company-registration-documents/${company.id}/download`}
                            >
                              사업자등록증 다운로드
                            </a>
                          </>
                        ) : (
                          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                            사업자등록증이 제출되었지만 임시 확인 링크를 만들지
                            못했습니다.
                          </p>
                        )}
                      </div>
                    ) : null}
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Verification checklist
                      </p>
                      {readiness.missing.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {readiness.missing.map((item) => (
                            <span
                              className="rounded-md bg-white px-2 py-1 text-xs font-black text-amber-700"
                              key={item}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          필수 운영 정보가 모두 입력되어 있습니다.
                        </p>
                      )}
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                        {reviewGuidance}
                      </p>
                    </div>
                    {company.verification_note ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
                        운영자 메모: {company.verification_note}
                      </p>
                    ) : null}
                    </div>
                  <form
                    action={updateCompanyVerificationAction}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    <input name="company_id" type="hidden" value={company.id} />
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                      운영자 메모
                      <textarea
                        className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400"
                        defaultValue={company.verification_note ?? ""}
                        maxLength={700}
                        name="verification_note"
                        placeholder="인증/반려 사유 또는 보완 요청"
                      />
                      <span className="text-[11px] font-bold normal-case tracking-normal text-slate-500">
                        반려 처리 시에는 기업 담당자가 이해할 수 있도록 5자 이상
                        보완 메모를 남겨주세요.
                      </span>
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {company.verification_status === "verified" ? (
                        <>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="pending"
                            variant="outline"
                          >
                            인증 해제
                          </Button>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="verified"
                          >
                            메모 저장
                          </Button>
                        </>
                      ) : company.verification_status === "pending" ? (
                        <>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="verified"
                          >
                            인증 승인
                          </Button>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="rejected"
                            variant="outline"
                          >
                            인증 반려
                          </Button>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="pending"
                            variant="outline"
                          >
                            메모 저장
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="verified"
                          >
                            인증 승인
                          </Button>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="pending"
                            variant="outline"
                          >
                            검토 대기
                          </Button>
                          <Button
                            name="verification_status"
                            type="submit"
                            value="rejected"
                            variant="outline"
                          >
                            메모 저장
                          </Button>
                        </>
                      )}
                    </div>
                  </form>
                  </div>
                </details>
              );
            })
          ) : (
            <EmptyState
              actions={
                activeStatus !== "verified" ? (
                  <Link
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                    href="/admin/companies"
                  >
                    인증 완료 보기
                  </Link>
                ) : (
                  <Link
                    className={cn(buttonVariants({ size: "sm" }))}
                    href="/admin/users"
                  >
                    사용자 목록 보기
                  </Link>
                )
              }
              description={
                activeStatus
                  ? "다른 상태 필터를 선택하거나 전체 목록을 확인해보세요."
                  : "기업 담당자가 회사/지점을 등록하면 인증 검토 대상이 이 화면에 표시됩니다."
              }
              title="검토할 기업/지점이 없습니다."
            />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function getCompanyReadiness({
  address,
  businessRegistrationPath,
  businessNumber,
  managerName,
  managerPhone,
  notificationEmail,
}: {
  address?: string | null;
  businessRegistrationPath?: string | null;
  businessNumber?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  notificationEmail?: string | null;
}) {
  const checks = [
    { done: Boolean(businessNumber?.trim()), label: "사업자번호" },
    { done: Boolean(businessRegistrationPath?.trim()), label: "사업자등록증" },
    { done: Boolean(address?.trim()), label: "주소" },
    { done: Boolean(managerName?.trim()), label: "담당자명" },
    { done: Boolean(managerPhone?.trim()), label: "담당자 연락처" },
    { done: Boolean(notificationEmail?.trim()), label: "알림 이메일" },
  ];
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  return {
    completed: checks.length - missing.length,
    missing,
    total: checks.length,
  };
}

function getReviewGuidance({
  missingCount,
  status,
}: {
  missingCount: number;
  status: string;
}) {
  if (status === "verified") {
    return "인증 완료 상태입니다. 공고 등록과 공개가 가능한 회사/지점입니다.";
  }

  if (status === "rejected") {
    return "반려 상태입니다. 기업 담당자가 이해할 수 있도록 보완 메모가 충분한지 확인하세요.";
  }

  if (missingCount > 0) {
    return "부족한 항목이 있습니다. 인증 전 보완 요청 메모를 남기는 것이 좋습니다.";
  }

  return "필수 항목이 준비되어 있습니다. 사업자 정보와 담당자 정보를 확인한 뒤 인증하세요.";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line break-words text-sm font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}
