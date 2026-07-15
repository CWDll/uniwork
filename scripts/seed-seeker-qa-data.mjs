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

function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
}

async function findUsersByEmail(emails) {
  const users = [];

  for (let page = 1; page <= 10; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    assertNoError(result, "list auth users");
    users.push(...result.data.users);

    if (result.data.users.length < 100) {
      break;
    }
  }

  return users.filter((user) => emails.includes(user.email ?? ""));
}

async function getOrCreateSampleOwner() {
  const email = "sample-company-owner@uniwork.test";
  const existingUsers = await findUsersByEmail([email]);
  const existingUser = existingUsers[0];

  if (existingUser) {
    return existingUser;
  }

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `Uniwork-sample-${Date.now()}!`,
    user_metadata: {
      name: "Uniwork Sample Owner",
      role: "company",
    },
  });

  assertNoError(created, "create sample company owner");

  if (!created.data.user) {
    throw new Error("Sample company owner was not created.");
  }

  return created.data.user;
}

async function getOrCreateCompany(ownerId) {
  const existing = await admin
    .from("companies")
    .select("id")
    .eq("business_number", "UNIWORK-SEEKER-QA")
    .maybeSingle();

  assertNoError(existing, "load seeker QA company");

  if (existing.data) {
    const updated = await admin
      .from("companies")
      .update({
        address: "Seoul Mapo-gu",
        business_number: "UNIWORK-SEEKER-QA",
        industry: "QA service",
        manager_name: "QA Manager",
        manager_phone: "010-2000-3000",
        name: "Uniwork QA Company",
        owner_id: ownerId,
        updated_at: new Date().toISOString(),
        verification_status: "verified",
      })
      .eq("id", existing.data.id)
      .select("id")
      .single();

    assertNoError(updated, "update seeker QA company");

    return updated.data.id;
  }

  const inserted = await admin
    .from("companies")
    .insert({
      address: "Seoul Mapo-gu",
      business_number: "UNIWORK-SEEKER-QA",
      industry: "QA service",
      manager_name: "QA Manager",
      manager_phone: "010-2000-3000",
      name: "Uniwork QA Company",
      owner_id: ownerId,
      verification_status: "verified",
    })
    .select("id")
    .single();

  assertNoError(inserted, "insert seeker QA company");

  return inserted.data.id;
}

async function seedJobs(companyId) {
  const now = new Date();
  const qaJobs = [
    {
      category: "Cafe & Service",
      closed_at: null,
      company_id: companyId,
      description:
        "D-2 유학생이 주말 중심으로 근무할 수 있는 카페 포지션입니다. 근무 가능 시간과 학교 확인 후 바로 지원 흐름을 테스트합니다.",
      employment_type: "Part-time",
      korean_requirement: "TOPIK 3+ preferred",
      location: "Seoul Mapo-gu",
      title: "QA D-2 Weekend Cafe Crew",
      visa_support_type: "D-2 review",
      wage_amount: 13000,
      wage_type: "hourly",
    },
    {
      category: "Office",
      closed_at: null,
      company_id: companyId,
      description:
        "비자 문구가 D-2와 명확히 일치하지 않아 구직자 화면에서 조건 확인 필요 상태를 확인하기 위한 QA 공고입니다.",
      employment_type: "Internship",
      korean_requirement: "Business Korean preferred",
      location: "Gyeonggi Suwon-si",
      title: "QA Review Required Office Assistant",
      visa_support_type: "F review",
      wage_amount: 12000,
      wage_type: "hourly",
    },
    {
      category: "Translation",
      closed_at: null,
      company_id: companyId,
      description:
        "F 계열 체류자격 중심으로 검토하는 번역 프로젝트입니다. D-2 프로필 기준에서는 조건 확인 필요 상태를 확인할 수 있습니다.",
      employment_type: "Contract",
      korean_requirement: "Basic Korean",
      location: "Remote",
      title: "QA F Visa Translation Project",
      visa_support_type: "F review",
      wage_amount: 180000,
      wage_type: "project",
    },
    {
      category: "Education",
      closed_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      company_id: companyId,
      description:
        "이미 마감된 즐겨찾기 표시를 확인하기 위한 QA 공고입니다. 저장 목록에서 종료 상태로 표시됩니다.",
      employment_type: "Part-time",
      korean_requirement: "TOPIK 4+ preferred",
      location: "Seoul Jongno-gu",
      title: "QA Closed Language Tutor",
      visa_support_type: "D-2/D-4 review",
      wage_amount: 15000,
      wage_type: "hourly",
    },
  ];
  const titles = qaJobs.map((job) => job.title);
  const deleteExisting = await admin.from("jobs").delete().in("title", titles);
  assertNoError(deleteExisting, "delete existing seeker QA jobs");

  const inserted = await admin
    .from("jobs")
    .insert(
      qaJobs.map((job) => ({
        ...job,
        published_at: now.toISOString(),
        status: "published",
        updated_at: now.toISOString(),
      })),
    )
    .select("id, title");

  assertNoError(inserted, "insert seeker QA jobs");

  return inserted.data ?? [];
}

async function getOrCreateResume(seekerId) {
  const existing = await admin
    .from("resumes")
    .select("id, title")
    .eq("seeker_id", seekerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  assertNoError(existing, "load seeker resume");

  if (existing.data) {
    return existing.data;
  }

  const inserted = await admin
    .from("resumes")
    .insert({
      education: [
        {
          degree: "Bachelor",
          school: "QA University",
        },
      ],
      experience: [
        {
          company: "Campus Office",
          role: "Assistant",
        },
      ],
      intro: "QA용 기본 이력서입니다.",
      languages: [
        {
          level: "Business",
          name: "English",
        },
      ],
      seeker_id: seekerId,
      title: "QA service resume",
      visibility: "private",
    })
    .select("id, title")
    .single();

  assertNoError(inserted, "insert seeker resume");

  return inserted.data;
}

async function seedForSeeker(user, jobs) {
  const resume = await getOrCreateResume(user.id);
  const selectedJobs = jobs.slice(0, 3);
  const statuses = ["submitted", "reviewing", "accepted"];
  const notes = [
    null,
    "담당자가 이력서를 검토 중입니다. 연락 가능한 전화번호를 유지해주세요.",
    "합격 처리되었습니다. 면접 일정 안내를 확인해주세요.",
  ];

  const savedRows = jobs.map((job) => ({
    job_id: job.id,
    seeker_id: user.id,
  }));
  const savedInsert = await admin.from("saved_jobs").upsert(savedRows);
  assertNoError(savedInsert, `upsert saved jobs for ${user.email}`);

  for (const [index, job] of selectedJobs.entries()) {
    const status = statuses[index];
    const upserted = await admin
      .from("job_applications")
      .upsert(
        {
          company_note: notes[index],
          job_id: job.id,
          message: `QA application for ${job.title}`,
          resume_id: resume.id,
          resume_snapshot: {
            captured_at: new Date().toISOString(),
            title: resume.title,
          },
          seeker_id: user.id,
          status,
          status_updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id,seeker_id" },
      )
      .select("id")
      .single();

    assertNoError(upserted, `upsert application ${status} for ${user.email}`);

    const eventInsert = await admin.from("application_status_events").insert({
      application_id: upserted.data.id,
      from_status: index === 0 ? null : "submitted",
      note:
        status === "submitted"
          ? "QA 지원 내역 비교용으로 생성되었습니다."
          : notes[index],
      to_status: status,
    });

    assertNoError(eventInsert, `insert application event for ${user.email}`);
  }
}

async function main() {
  const owner = await getOrCreateSampleOwner();
  const companyId = await getOrCreateCompany(owner.id);
  const jobs = await seedJobs(companyId);
  const seekers = await findUsersByEmail([
    "qa-seeker@uniwork.test",
    "lchj1999@naver.com",
    "lchj1999@gmail.com",
  ]);

  for (const seeker of seekers) {
    await seedForSeeker(seeker, jobs);
  }

  console.log(`Seeded ${jobs.length} seeker QA jobs.`);
  console.log(
    `Updated seeker QA data for ${seekers.map((user) => user.email).join(", ") || "no existing target seekers"}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
