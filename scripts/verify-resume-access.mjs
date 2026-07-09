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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
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

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
}

async function waitForProfile(userId, expectedRole) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    assertNoError(result, `load profile for ${userId}`);

    if (result.data?.role === expectedRole) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Profile ${userId} was not created with role ${expectedRole}.`);
}

async function createConfirmedUser({ createdUserIds, email, name, password, role }) {
  const result = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      name,
      role,
    },
  });

  assertNoError(result, `create ${role} user`);
  assert(result.data.user?.id, `Missing created ${role} user id.`);
  createdUserIds.push(result.data.user.id);
  await waitForProfile(result.data.user.id, role);

  return result.data.user;
}

async function signIn(email, password) {
  const client = createAnonClient();
  const result = await client.auth.signInWithPassword({ email, password });

  assertNoError(result, `sign in ${email}`);

  return client;
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Uniwork-${suffix}-pass!`;
  const createdUserIds = [];

  try {
    const companyUser = await createConfirmedUser({
      createdUserIds,
      email: `resume-company-${suffix}@uniwork.test`,
      name: "Resume Access Company Owner",
      password,
      role: "company",
    });
    const seekerUser = await createConfirmedUser({
      createdUserIds,
      email: `resume-seeker-${suffix}@uniwork.test`,
      name: "Resume Access Seeker",
      password,
      role: "seeker",
    });
    const otherCompanyUser = await createConfirmedUser({
      createdUserIds,
      email: `resume-other-company-${suffix}@uniwork.test`,
      name: "Other Company Owner",
      password,
      role: "company",
    });

    const companyClient = await signIn(companyUser.email, password);
    const seekerClient = await signIn(seekerUser.email, password);
    const otherCompanyClient = await signIn(otherCompanyUser.email, password);

    const companyInsert = await companyClient
      .from("companies")
      .insert({
        address: "Seoul",
        industry: "Cafe",
        manager_name: "Owner",
        name: "Resume Access Test Branch",
        owner_id: companyUser.id,
      })
      .select("id")
      .single();

    assertNoError(companyInsert, "insert company");

    const verifyCompany = await admin
      .from("companies")
      .update({
        updated_at: new Date().toISOString(),
        verification_status: "verified",
      })
      .eq("id", companyInsert.data.id);

    assertNoError(verifyCompany, "verify company");

    const jobInsert = await companyClient
      .from("jobs")
      .insert({
        category: "Cafe & Service",
        company_id: companyInsert.data.id,
        description: "Resume access verification job.",
        employment_type: "part-time",
        korean_requirement: "basic",
        location: "Seoul",
        status: "draft",
        title: "Resume Access Test Job",
        visa_support_type: "D-2/D-4 가능",
        wage_amount: 12000,
        wage_type: "hourly",
      })
      .select("id")
      .single();

    assertNoError(jobInsert, "insert job");

    const publishJob = await admin
      .from("jobs")
      .update({
        published_at: new Date().toISOString(),
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobInsert.data.id);

    assertNoError(publishJob, "publish job");

    const resumeInsert = await seekerClient
      .from("resumes")
      .insert({
        education: [
          {
            major: "Hospitality",
            period: "2024 - present",
            school: "Uniwork University",
          },
        ],
        experience: [
          {
            company: "Campus Cafe",
            description: "Handled orders and customer communication.",
            period: "2025.03 - 2025.12",
            role: "Part-time staff",
          },
        ],
        intro:
          "I am reliable, friendly, and ready to support cafe service during evenings and weekends.",
        languages: [
          {
            level: "Conversational",
            name: "Korean",
          },
          {
            level: "Fluent",
            name: "English",
          },
        ],
        seeker_id: seekerUser.id,
        title: "Cafe service profile",
        visibility: "private",
      })
      .select("id, intro")
      .single();

    assertNoError(resumeInsert, "insert seeker resume");

    const otherCompanyBeforeApply = await otherCompanyClient
      .from("resumes")
      .select("id")
      .eq("seeker_id", seekerUser.id);

    assertNoError(otherCompanyBeforeApply, "unrelated company resume read");
    assert(
      otherCompanyBeforeApply.data?.length === 0,
      "Unrelated company should not read seeker resume.",
    );

    const applicationInsert = await seekerClient
      .from("job_applications")
      .insert({
        job_id: jobInsert.data.id,
        message: "I would like to apply with my profile.",
        seeker_id: seekerUser.id,
        status: "submitted",
      })
      .select("id")
      .single();

    assertNoError(applicationInsert, "insert application");

    const companyResumeRead = await companyClient
      .from("resumes")
      .select("id, intro, education, experience, languages")
      .eq("seeker_id", seekerUser.id)
      .single();

    assertNoError(companyResumeRead, "company owner reads related applicant resume");
    assert(
      companyResumeRead.data.id === resumeInsert.data.id,
      "Company owner read the wrong resume.",
    );

    const otherCompanyAfterApply = await otherCompanyClient
      .from("resumes")
      .select("id")
      .eq("seeker_id", seekerUser.id);

    assertNoError(otherCompanyAfterApply, "unrelated company resume read after apply");
    assert(
      otherCompanyAfterApply.data?.length === 0,
      "Unrelated company should still not read seeker resume after another company receives an application.",
    );

    console.log("Resume access verification passed.");
    console.log("- Seeker can create a private resume.");
    console.log("- Company owner can read resumes only for applicants to their jobs.");
    console.log("- Unrelated company owners cannot read seeker resumes.");
  } finally {
    for (const userId of createdUserIds.reverse()) {
      const deleteResult = await admin.auth.admin.deleteUser(userId);

      if (deleteResult.error) {
        console.warn(`Cleanup failed for user ${userId}: ${deleteResult.error.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
