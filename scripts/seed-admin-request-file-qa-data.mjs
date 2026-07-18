import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import WebSocket from "ws";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: WebSocket,
  },
});

const bucket = "admin-request-files";
const seekerEmail = "qa-admin-request-seeker@uniwork.test";
const seekerPassword = "Uniwork-admin-request-QA-2026!";
const marker = "ADMIN_REQUEST_FILE_QA";

function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    assertNoError(result, "list auth users");
    const user = result.data.users.find((candidate) => candidate.email === email);

    if (user) {
      return user;
    }

    if (result.data.users.length < 100) {
      break;
    }
  }

  return null;
}

async function getOrCreateSeeker() {
  const existing = await findUserByEmail(seekerEmail);

  if (existing) {
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password: seekerPassword,
      user_metadata: {
        name: "Admin Request QA Seeker",
        role: "seeker",
      },
    });
    assertNoError(updated, "update admin request QA seeker password");

    await upsertProfile(existing.id);

    return existing;
  }

  const created = await admin.auth.admin.createUser({
    email: seekerEmail,
    email_confirm: true,
    password: seekerPassword,
    user_metadata: {
      name: "Admin Request QA Seeker",
      role: "seeker",
    },
  });
  assertNoError(created, "create admin request QA seeker");

  if (!created.data.user) {
    throw new Error("Admin request QA seeker was not created.");
  }

  await upsertProfile(created.data.user.id);

  return created.data.user;
}

async function upsertProfile(userId) {
  const profile = await admin.from("profiles").upsert(
    {
      email: seekerEmail,
      id: userId,
      name: "Admin Request QA Seeker",
      phone: "010-5555-2026",
      role: "seeker",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  assertNoError(profile, "upsert admin request QA profile");

  const seekerProfile = await admin.from("seeker_profiles").upsert(
    {
      alien_registration_status: "등록증 있음",
      available_times: {
        weekday: "Mon-Fri 18:00-22:00",
        weekend: "Sat 10:00-14:00",
      },
      english_level: "Intermediate",
      korean_level: "TOPIK 3",
      major: "Business Administration",
      nationality: "Vietnam",
      school: "Uniwork QA University",
      updated_at: new Date().toISOString(),
      user_id: userId,
      visa_type: "D-2",
    },
    { onConflict: "user_id" },
  );
  assertNoError(seekerProfile, "upsert admin request QA seeker profile");
}

async function cleanupPreviousData(seekerId) {
  const files = await admin
    .from("admin_request_files")
    .select("storage_path")
    .eq("seeker_id", seekerId);
  assertNoError(files, "load existing admin request QA files");

  const paths = files.data?.map((file) => file.storage_path) ?? [];

  if (paths.length > 0) {
    const storageRemove = await admin.storage.from(bucket).remove(paths);
    assertNoError(storageRemove, "remove existing admin request QA files");
  }

  const existingRequests = await admin
    .from("admin_requests")
    .select("id")
    .eq("seeker_id", seekerId)
    .ilike("memo", `%${marker}%`);
  assertNoError(existingRequests, "load existing admin request QA requests");

  const ids = existingRequests.data?.map((request) => request.id) ?? [];

  if (ids.length > 0) {
    const deleted = await admin.from("admin_requests").delete().in("id", ids);
    assertNoError(deleted, "delete existing admin request QA requests");
  }
}

async function createConsent(seekerId) {
  const result = await admin
    .from("consents")
    .insert({
      data_scope: {
        applications: false,
        contact: true,
        documents: true,
        profile: true,
        visa: true,
      },
      purpose: "administrative_request_review",
      recipient_type: "operator_and_assigned_partner",
      status: "agreed",
      user_id: seekerId,
    })
    .select("id")
    .single();
  assertNoError(result, "create admin request QA consent");

  return result.data.id;
}

async function createRequest(seekerId, request) {
  const consentId = await createConsent(seekerId);
  const inserted = await admin
    .from("admin_requests")
    .insert({
      consent_id: consentId,
      contact_snapshot: request.contact,
      document_checklist: request.documents,
      memo: `${marker}\n${request.memo}`,
      request_details: request.details,
      seeker_id: seekerId,
      status: request.status,
      type: request.type,
      updated_at: request.updatedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();
  assertNoError(inserted, `create request ${request.label}`);

  if (request.followupNote) {
    const followup = await admin
      .from("admin_requests")
      .update({
        seeker_followup_note: request.followupNote,
        seeker_followup_requested_at: request.followupRequestedAt,
        updated_at: request.updatedAt ?? new Date().toISOString(),
      })
      .eq("id", inserted.data.id);
    assertNoError(followup, `update request followup ${request.label}`);
  }

  if (request.review) {
    const review = await admin.from("admin_request_reviews").upsert({
      ...request.review,
      request_id: inserted.data.id,
      updated_at: new Date().toISOString(),
    });
    assertNoError(review, `upsert request review ${request.label}`);
  }

  for (const file of request.files ?? []) {
    await uploadFile({
      file,
      requestId: inserted.data.id,
      seekerId,
      source: "request",
    });
  }

  for (const supplement of request.supplements ?? []) {
    const supplementInsert = await admin
      .from("admin_request_supplements")
      .insert({
        contact_snapshot: supplement.contact,
        document_checklist: supplement.documents,
        message: supplement.message,
        request_id: inserted.data.id,
        seeker_id: seekerId,
      })
      .select("id")
      .single();
    assertNoError(supplementInsert, `create supplement ${request.label}`);

    for (const file of supplement.files ?? []) {
      await uploadFile({
        file,
        requestId: inserted.data.id,
        seekerId,
        source: "supplement",
        supplementId: supplementInsert.data.id,
      });
    }
  }

  return inserted.data.id;
}

async function uploadFile({ file, requestId, seekerId, source, supplementId }) {
  const extension = file.mimeType === "application/pdf" ? "pdf" : "png";
  const storagePath =
    source === "request"
      ? `${seekerId}/${requestId}/request/${crypto.randomUUID()}.${extension}`
      : `${seekerId}/${requestId}/supplement/${supplementId}/${crypto.randomUUID()}.${extension}`;
  const upload = await admin.storage.from(bucket).upload(storagePath, file.body, {
    contentType: file.mimeType,
    upsert: false,
  });
  assertNoError(upload, `upload ${file.name}`);

  const metadata = await admin.from("admin_request_files").insert({
    mime_type: file.mimeType,
    original_name: file.name,
    request_id: requestId,
    seeker_id: seekerId,
    size_bytes: Buffer.byteLength(file.body),
    source,
    storage_path: storagePath,
    supplement_id: supplementId ?? null,
  });
  assertNoError(metadata, `insert metadata ${file.name}`);
}

function pdfFixture(title, lines) {
  const escapedLines = [title, ...lines]
    .map((line) => String(line).replace(/[()\\]/g, "\\$&"))
    .map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 24} Td (${line}) Tj ET`)
    .join("\n");
  const content = escapedLines;
  const body = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream`,
    content,
    "endstream endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "trailer << /Root 1 0 R /Size 6 >>",
    "startxref",
    "0",
    "%%EOF",
  ].join("\n");

  return Buffer.from(body);
}

function pngFixture() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function qaRequests() {
  return [
    {
      contact: {
        email: seekerEmail,
        phone: "010-5555-2026",
      },
      details: {
        alien_registration_status: "등록증 있음",
        current_visa_type: "D-2",
        handoff_consent: true,
        major: "Business Administration",
        planned_work_hours: "Mon-Fri 18:00-22:00, Sat 10:00-14:00",
        school: "Uniwork QA University",
        target_start_date: "2026-08-01",
      },
      documents: {
        missing_note: "학교 담당자 확인서 원본 확인이 필요합니다.",
        ready: [
          "passport",
          "alien_registration_card",
          "certificate_of_enrollment",
          "attendance_or_transcript",
        ],
      },
      files: [
        {
          body: pdfFixture("QA passport copy", [
            "Purpose: admin request attachment QA",
            "Expected: admin can download this file.",
          ]),
          mimeType: "application/pdf",
          name: "qa-passport-copy.pdf",
        },
        {
          body: pngFixture(),
          mimeType: "image/png",
          name: "qa-alien-registration-card.png",
        },
      ],
      followupNote:
        "학교 담당자 확인서와 근로 예정 확인서를 추가로 첨부해주세요.",
      followupRequestedAt: daysAgo(1),
      label: "supplement-with-files",
      memo:
        "보완 제출 파일까지 확인하기 위한 QA 요청입니다. 최초 첨부 2개와 보완 첨부 2개가 보여야 합니다.",
      review: {
        handoff_hold_reason: "보완 제출 파일 검토 후 handoff 가능 여부를 판단합니다.",
        handoff_status: "paused",
        internal_note: "QA: 보완 제출 확인 버튼과 다운로드 링크를 확인하세요.",
        reviewed_at: daysAgo(1),
        supplement_checked_at: null,
      },
      status: "reviewing",
      supplements: [
        {
          contact: {
            email: seekerEmail,
            phone: "010-5555-2026",
          },
          documents: {
            missing_note: "근로 예정 확인서의 회사 직인은 아직 확인 전입니다.",
            ready: ["school_approval", "employment_contract"],
          },
          files: [
            {
              body: pdfFixture("QA school approval", [
                "Purpose: supplement attachment QA",
                "Expected: handoff draft includes this file.",
              ]),
              mimeType: "application/pdf",
              name: "qa-school-approval.pdf",
            },
            {
              body: pdfFixture("QA employment confirmation", [
                "Purpose: supplement attachment QA",
                "Expected: admin can download this file.",
              ]),
              mimeType: "application/pdf",
              name: "qa-employment-confirmation.pdf",
            },
          ],
          message:
            "요청받은 학교 담당자 확인서와 근로 예정 확인서를 첨부했습니다.",
        },
      ],
      type: "part_time_work_permission",
      updatedAt: daysAgo(0.2),
    },
    {
      contact: {
        email: seekerEmail,
        phone: "010-5555-2026",
      },
      details: {
        alien_registration_status: "등록증 있음",
        current_visa_type: "D-2",
        handoff_consent: true,
        major: "Korean Language Program",
        planned_work_hours: "Weekends 10:00-16:00",
        school: "Uniwork QA Language Institute",
        target_start_date: "2026-08-15",
      },
      documents: {
        missing_note: null,
        ready: [
          "passport",
          "alien_registration_card",
          "certificate_of_enrollment",
          "attendance_or_transcript",
          "employment_contract",
          "school_approval",
        ],
      },
      files: [
        {
          body: pdfFixture("QA full handoff packet", [
            "Purpose: ready handoff QA",
            "Expected: request appears in before handoff with ready packet.",
          ]),
          mimeType: "application/pdf",
          name: "qa-full-handoff-packet.pdf",
        },
      ],
      label: "ready-for-handoff",
      memo:
        "전달 준비 완료 상태를 확인하기 위한 QA 요청입니다. 누락 항목 없이 handoff 초안에서 파일 1개가 보여야 합니다.",
      review: {
        handoff_hold_reason: "",
        handoff_status: "ready",
        internal_note: "QA: 전달 초안 화면에서 복사용 초안과 첨부 파일 목록을 확인하세요.",
        reviewed_at: daysAgo(0.5),
        supplement_checked_at: null,
      },
      status: "reviewing",
      type: "document_review",
      updatedAt: daysAgo(0.5),
    },
    {
      contact: {
        email: seekerEmail,
        phone: "010-5555-2026",
      },
      details: {
        alien_registration_status: "신청 중",
        current_visa_type: "D-4",
        handoff_consent: true,
        major: "Language Course",
        planned_work_hours: "Not decided",
        school: "Uniwork QA Language Institute",
        target_start_date: "2026-09-01",
      },
      documents: {
        missing_note: "핵심 서류가 부족해 현재 단계에서는 진행하지 않는 QA 케이스입니다.",
        ready: ["passport"],
      },
      files: [
        {
          body: pdfFixture("QA rejected request note", [
            "Purpose: rejected filter QA",
            "Expected: file is still downloadable by admin.",
          ]),
          mimeType: "application/pdf",
          name: "qa-rejected-request-note.pdf",
        },
      ],
      label: "rejected-with-file",
      memo:
        "반려 상태 필터와 반려 요청의 파일 다운로드를 확인하기 위한 QA 요청입니다.",
      review: {
        handoff_hold_reason: "핵심 서류 미비로 운영 반려 처리한 QA 케이스입니다.",
        handoff_status: "paused",
        internal_note: "QA: 반려 필터에서만 보이는지 확인하세요.",
        reviewed_at: daysAgo(2),
        supplement_checked_at: null,
      },
      status: "rejected",
      type: "visa_eligibility_review",
      updatedAt: daysAgo(2),
    },
  ];
}

async function main() {
  const seeker = await getOrCreateSeeker();
  await cleanupPreviousData(seeker.id);

  const requestIds = [];

  for (const request of qaRequests()) {
    requestIds.push(await createRequest(seeker.id, request));
  }

  console.log("Seeded admin request file QA data.");
  console.log(`Seeker login: ${seekerEmail}`);
  console.log(`Seeker password: ${seekerPassword}`);
  console.log(`Requests: ${requestIds.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
