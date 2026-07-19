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

type AdminRequestHandoffEmailInput = {
  adminNote?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  files: {
    name: string;
    size: string;
  }[];
  handoffNote?: string | null;
  requestId: string;
  requestMemo?: string | null;
  requestType: string;
  seekerName?: string | null;
  school?: string | null;
  visaType?: string | null;
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

export function renderAdminRequestHandoffEmail({
  adminNote,
  contactEmail,
  contactPhone,
  files,
  handoffNote,
  requestId,
  requestMemo,
  requestType,
  school,
  seekerName,
  visaType,
}: AdminRequestHandoffEmailInput) {
  const adminRequestUrl = getAbsolutePath("/admin/admin-requests");
  const title = `[Uniwork] 행정 요청 전달: ${requestType}`;
  const fileRows =
    files.length > 0
      ? files
          .map(
            (file) =>
              `<li>${escapeHtml(file.name)} · ${escapeHtml(file.size)}</li>`,
          )
          .join("")
      : "<li>첨부 파일 없음</li>";
  const text = [
    "[Uniwork 행정 요청 전달]",
    `요청 ID: ${requestId}`,
    `요청 유형: ${requestType}`,
    `구직자: ${seekerName || "이름 미입력"}`,
    `연락처: ${contactEmail || "이메일 미입력"} / ${contactPhone || "전화 미입력"}`,
    `체류/학교: ${visaType || "비자 미입력"} / ${school || "학교 미입력"}`,
    "",
    "[요청 메모]",
    requestMemo || "요청 메모 없음",
    "",
    "[운영 전달 메모]",
    handoffNote || adminNote || "전달 메모 없음",
    "",
    "[첨부 파일]",
    files.length > 0
      ? files.map((file) => `- ${file.name} (${file.size})`).join("\n")
      : "첨부 파일 없음",
    "",
    `운영 화면: ${adminRequestUrl}`,
  ].join("\n");
  const html = baseLayout(
    title,
    `
      <p>Uniwork 운영자가 행정 요청 검토 자료를 전달했습니다.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:12px;margin:16px 0">
        <strong>요청 정보</strong><br />
        요청 ID: ${escapeHtml(requestId)}<br />
        요청 유형: ${escapeHtml(requestType)}<br />
        구직자: ${escapeHtml(seekerName || "이름 미입력")}<br />
        연락처: ${escapeHtml(contactEmail || "이메일 미입력")} / ${escapeHtml(contactPhone || "전화 미입력")}<br />
        체류/학교: ${escapeHtml(visaType || "비자 미입력")} / ${escapeHtml(school || "학교 미입력")}
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:12px;margin:16px 0">
        <strong>운영 전달 메모</strong><br />
        ${escapeHtml(handoffNote || adminNote || "전달 메모 없음")}
      </div>
      <p><strong>요청 메모</strong></p>
      <p>${escapeHtml(requestMemo || "요청 메모 없음")}</p>
      <p><strong>첨부 파일</strong></p>
      <ul style="padding-left:20px">${fileRows}</ul>
      <p style="color:#64748b;font-size:13px">
        첨부 파일은 이 메일에 포함되어 있습니다. 개인정보가 포함될 수 있으니 외부 공유 시 주의해주세요.
      </p>
    `,
  );

  return { html, subject: title, text };
}
