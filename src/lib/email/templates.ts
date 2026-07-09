import { getSiteUrl } from "@/lib/site";

type StatusEmailInput = {
  applicantName?: string | null;
  applicationId: string;
  companyName?: string | null;
  jobTitle?: string | null;
  note?: string | null;
  statusLabel: string;
};

type OverdueApplication = {
  applicantEmail?: string | null;
  applicantName?: string | null;
  appliedAt: string;
  applicationId: string;
  jobTitle?: string | null;
};

type OverdueDigestInput = {
  applications: OverdueApplication[];
  companyName?: string | null;
};

function escapeHtml(value?: string | null) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getAbsolutePath(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

function baseLayout(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:24px;color:#64748b;font-size:13px">
        Uniwork 알림 설정은 프로필 또는 기업 설정에서 변경할 수 있습니다.
      </p>
    </div>
  `;
}

export function renderApplicationStatusEmail({
  applicantName,
  applicationId,
  companyName,
  jobTitle,
  note,
  statusLabel,
}: StatusEmailInput) {
  const applicationUrl = getAbsolutePath("/me/applications");
  const title = `지원 상태가 ${statusLabel}(으)로 변경되었습니다`;
  const text = [
    `${applicantName || "지원자"}님,`,
    `${companyName || "기업"}의 ${jobTitle || "공고"} 지원 상태가 ${statusLabel}(으)로 변경되었습니다.`,
    note ? `기업 안내: ${note}` : "",
    `확인하기: ${applicationUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  const html = baseLayout(
    title,
    `
      <p>${escapeHtml(applicantName || "지원자")}님,</p>
      <p>
        <strong>${escapeHtml(companyName || "기업")}</strong>의
        <strong>${escapeHtml(jobTitle || "공고")}</strong> 지원 상태가
        <strong>${escapeHtml(statusLabel)}</strong>(으)로 변경되었습니다.
      </p>
      ${
        note
          ? `<div style="background:#eff6ff;border-radius:8px;padding:12px;margin:16px 0">
              <strong>기업 안내</strong><br />${escapeHtml(note)}
            </div>`
          : ""
      }
      <p>
        <a href="${applicationUrl}" style="color:#2563eb;font-weight:700">지원 내역 확인</a>
      </p>
      <p style="display:none">${escapeHtml(applicationId)}</p>
    `,
  );

  return { html, subject: title, text };
}

export function renderOverdueApplicationsDigestEmail({
  applications,
  companyName,
}: OverdueDigestInput) {
  const applicationsUrl = getAbsolutePath(
    "/company/applications?alert=overdue&attention=overdue&sort=action_needed",
  );
  const title = `24시간 이상 미검토 지원자 ${applications.length}명`;
  const rows = applications
    .map((application) => {
      const url = getAbsolutePath(`/company/applications/${application.applicationId}`);

      return `
        <li style="margin-bottom:12px">
          <strong>${escapeHtml(application.applicantName || application.applicantEmail || "지원자")}</strong>
          · ${escapeHtml(application.jobTitle || "공고")}
          · 지원일 ${escapeHtml(new Date(application.appliedAt).toLocaleString("ko-KR"))}
          <br />
          <a href="${url}" style="color:#2563eb">지원자 보기</a>
        </li>
      `;
    })
    .join("");
  const text = [
    `${companyName || "기업"}에 24시간 이상 미검토 상태로 남아 있는 지원자가 ${applications.length}명 있습니다.`,
    ...applications.map(
      (application) =>
        `- ${application.applicantName || application.applicantEmail || "지원자"} / ${application.jobTitle || "공고"} / ${new Date(application.appliedAt).toLocaleString("ko-KR")}`,
    ),
    `전체 보기: ${applicationsUrl}`,
  ].join("\n");
  const html = baseLayout(
    title,
    `
      <p>
        <strong>${escapeHtml(companyName || "기업")}</strong>에 24시간 이상 미검토 상태로 남아 있는 지원자가 있습니다.
      </p>
      <ul style="padding-left:20px">${rows}</ul>
      <p>
        <a href="${applicationsUrl}" style="color:#2563eb;font-weight:700">알림 대상 전체 보기</a>
      </p>
    `,
  );

  return { html, subject: title, text };
}
