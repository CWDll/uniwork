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

async function getOrCreateSampleOwner() {
  const email = "sample-company-owner@uniwork.test";
  const password = `Uniwork-sample-${Date.now()}!`;
  const users = [];

  for (let page = 1; page <= 10; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    assertNoError(result, "list auth users");
    users.push(...result.data.users);

    if (result.data.users.length < 100) {
      break;
    }
  }

  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    return existingUser;
  }

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
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

async function getOrCreateCompany(ownerId, company) {
  const existing = await admin
    .from("companies")
    .select("id")
    .eq("business_number", company.business_number)
    .maybeSingle();

  assertNoError(existing, `load sample company ${company.name}`);

  if (existing.data) {
    const updated = await admin
      .from("companies")
      .update({
        ...company,
        owner_id: ownerId,
        verification_status: "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id)
      .select("id")
      .single();

    assertNoError(updated, `update sample company ${company.name}`);

    return updated.data.id;
  }

  const inserted = await admin
    .from("companies")
    .insert({
      ...company,
      owner_id: ownerId,
      verification_status: "verified",
    })
    .select("id")
    .single();

  assertNoError(inserted, `insert sample company ${company.name}`);

  return inserted.data.id;
}

async function main() {
  const owner = await getOrCreateSampleOwner();
  const now = new Date().toISOString();
  const companies = [
    {
      address: "Seoul Mapo-gu",
      business_number: "UNIWORK-SAMPLE-SEOUL",
      industry: "Education",
      manager_name: "Sample Manager",
      manager_phone: "010-0000-0001",
      name: "Uniwork Language Center",
    },
    {
      address: "Busan Haeundae-gu",
      business_number: "UNIWORK-SAMPLE-BUSAN",
      industry: "Food service",
      manager_name: "Sample Manager",
      manager_phone: "010-0000-0002",
      name: "Uniwork Cafe Busan",
    },
    {
      address: "Remote",
      business_number: "UNIWORK-SAMPLE-REMOTE",
      industry: "Marketing",
      manager_name: "Sample Manager",
      manager_phone: "010-0000-0003",
      name: "Uniwork Global Studio",
    },
  ];
  const companyIds = {};

  for (const company of companies) {
    companyIds[company.business_number] = await getOrCreateCompany(
      owner.id,
      company,
    );
  }

  const sampleJobs = [
    {
      category: "Education",
      company_id: companyIds["UNIWORK-SAMPLE-SEOUL"],
      description:
        "외국인 유학생 대상 캠퍼스 안내와 영어 상담을 보조합니다. D-2/D-4 시간제 취업 가능 여부를 확인한 뒤 면접을 진행합니다.",
      employment_type: "Part-time",
      korean_requirement: "TOPIK 3+ preferred",
      location: "Seoul Mapo-gu",
      title: "Campus Support Assistant",
      visa_support_type: "D-2/D-4 review",
      wage_amount: 13000,
      wage_type: "hourly",
    },
    {
      category: "Cafe & Service",
      company_id: companyIds["UNIWORK-SAMPLE-BUSAN"],
      description:
        "주말 카페 홀 업무와 외국인 고객 응대를 담당합니다. 근무 시간은 학업 일정에 맞춰 협의합니다.",
      employment_type: "Part-time",
      korean_requirement: "Conversational Korean",
      location: "Busan Haeundae-gu",
      title: "Weekend Cafe Crew",
      visa_support_type: "D-2 review",
      wage_amount: 12500,
      wage_type: "hourly",
    },
    {
      category: "Marketing",
      company_id: companyIds["UNIWORK-SAMPLE-REMOTE"],
      description:
        "SNS 콘텐츠 번역과 글로벌 캠페인 리서치를 보조합니다. 원격 근무 중심이며 프로젝트 단위로 진행됩니다.",
      employment_type: "Contract",
      korean_requirement: "Basic Korean",
      location: "Remote",
      title: "SNS Translation Assistant",
      visa_support_type: "D-2/F review",
      wage_amount: 250000,
      wage_type: "project",
    },
    {
      category: "Office",
      company_id: companyIds["UNIWORK-SAMPLE-SEOUL"],
      description:
        "문서 정리, 간단한 데이터 입력, 한국어/영어 이메일 초안 작성을 지원합니다.",
      employment_type: "Internship",
      korean_requirement: "TOPIK 4+ preferred",
      location: "Seoul Jongno-gu",
      title: "Bilingual Office Intern",
      visa_support_type: "D-2/D-4 review",
      wage_amount: 11000,
      wage_type: "hourly",
    },
  ];

  const titles = sampleJobs.map((job) => job.title);
  const deleteExisting = await admin.from("jobs").delete().in("title", titles);
  assertNoError(deleteExisting, "delete existing sample jobs");

  const insertJobs = await admin.from("jobs").insert(
    sampleJobs.map((job) => ({
      ...job,
      published_at: now,
      status: "published",
      updated_at: now,
    })),
  );

  assertNoError(insertJobs, "insert sample jobs");

  console.log(`Seeded ${sampleJobs.length} published sample jobs.`);
  console.log("Try /jobs?q=cafe, /jobs?location=Seoul, or /jobs?category=Marketing");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
