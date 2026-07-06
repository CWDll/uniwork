import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
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
      .select("id, role, email, name")
      .eq("id", userId)
      .maybeSingle();

    assertNoError(result, `load profile for ${userId}`);

    if (result.data?.role === expectedRole) {
      return result.data;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Profile ${userId} was not created with role ${expectedRole}.`);
}

async function createConfirmedUser({ email, password, role, name, createdUserIds }) {
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      name,
    },
  });

  assertNoError(result, `create ${role} user`);
  assert(result.data.user?.id, `Missing created ${role} user id.`);
  createdUserIds.push(result.data.user.id);

  await waitForProfile(result.data.user.id, role === "admin" ? "seeker" : role);

  if (role === "admin") {
    const updateResult = await admin
      .from("profiles")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", result.data.user.id);

    assertNoError(updateResult, "promote admin profile");
    await waitForProfile(result.data.user.id, "admin");
  }

  return result.data.user;
}

async function signIn(email, password) {
  const client = createAnonClient();
  const result = await client.auth.signInWithPassword({ email, password });

  assertNoError(result, `sign in ${email}`);
  assert(result.data.user?.id, `Missing signed-in user for ${email}.`);

  return client;
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Uniwork-${suffix}-pass!`;
  const createdUserIds = [];

  try {
    const companyUser = await createConfirmedUser({
      email: `company-${suffix}@uniwork.test`,
      password,
      role: "company",
      name: "Uniwork Test Company Owner",
      createdUserIds,
    });

    const seekerUser = await createConfirmedUser({
      email: `seeker-${suffix}@uniwork.test`,
      password,
      role: "seeker",
      name: "Uniwork Test Seeker",
      createdUserIds,
    });

    const adminUser = await createConfirmedUser({
      email: `admin-${suffix}@uniwork.test`,
      password,
      role: "admin",
      name: "Uniwork Test Admin",
      createdUserIds,
    });

    const companyClient = await signIn(companyUser.email, password);
    const companyInsert = await companyClient
      .from("companies")
      .insert([
        {
          owner_id: companyUser.id,
          name: "Uniwork Test Seoul Branch",
          industry: "Food service",
          address: "Seoul",
          manager_name: "Owner A",
        },
        {
          owner_id: companyUser.id,
          name: "Uniwork Test Busan Branch",
          industry: "Retail",
          address: "Busan",
          manager_name: "Owner A",
        },
      ])
      .select("id, owner_id, name");

    assertNoError(companyInsert, "insert multiple companies as company owner");
    assert(companyInsert.data?.length === 2, "Expected two owned companies.");

    const companyIds = companyInsert.data.map((company) => company.id);
    const verifyCompany = await admin
      .from("companies")
      .update({
        verification_status: "verified",
        updated_at: new Date().toISOString(),
      })
      .in("id", companyIds);

    assertNoError(verifyCompany, "mark test companies verified");

    const jobInsert = await companyClient
      .from("jobs")
      .insert({
        company_id: companyIds[0],
        title: "Uniwork E2E Hall Staff",
        description: "E2E draft job created by a company owner.",
        employment_type: "part-time",
        category: "Food service",
        location: "Seoul",
        wage_type: "hourly",
        wage_amount: 12000,
        visa_support_type: "시간제 취업 확인 지원",
        korean_requirement: "basic",
        status: "draft",
      })
      .select("id, status")
      .single();

    assertNoError(jobInsert, "insert draft job as company owner");
    assert(jobInsert.data.status === "draft", "Expected created job to be draft.");

    const seekerClient = await signIn(seekerUser.email, password);
    const seekerProfile = await seekerClient.from("seeker_profiles").upsert({
      user_id: seekerUser.id,
      nationality: "Vietnam",
      visa_type: "D-2",
      visa_review_status: "needs_review",
      alien_registration_status: "registered",
      school: "Uniwork Test University",
      major: "Business",
      korean_level: "topik_3",
      english_level: "intermediate",
      preferred_locations: ["Seoul", "Busan"],
      preferred_job_types: ["restaurant", "retail"],
      available_times: {
        weekday: "evening",
        weekend: "daytime",
      },
      updated_at: new Date().toISOString(),
    });

    assertNoError(seekerProfile, "upsert seeker profile as seeker");

    const blockedCompanyInsert = await seekerClient.from("companies").insert({
      owner_id: seekerUser.id,
      name: "Blocked Company",
    });

    assert(
      blockedCompanyInsert.error,
      "Expected seeker company insert to be blocked by RLS/profile constraints.",
    );

    const adminClient = await signIn(adminUser.email, password);
    const publishResult = await adminClient
      .from("jobs")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobInsert.data.id)
      .select("id, status")
      .single();

    assertNoError(publishResult, "publish job as admin");
    assert(
      publishResult.data.status === "published",
      "Expected admin-published job to be published.",
    );

    const publicClient = createAnonClient();
    const publicJobs = await publicClient
      .from("jobs")
      .select("id, title, status, company_id")
      .eq("id", jobInsert.data.id)
      .eq("status", "published")
      .single();

    assertNoError(publicJobs, "read published job anonymously");
    assert(publicJobs.data.id === jobInsert.data.id, "Published job was not public.");

    const publicCompany = await publicClient
      .from("companies")
      .select("id, name, verification_status")
      .eq("id", companyIds[0])
      .single();

    assertNoError(publicCompany, "read verified company anonymously");
    assert(
      publicCompany.data.verification_status === "verified",
      "Expected verified company to be public.",
    );

    const applicationInsert = await seekerClient
      .from("job_applications")
      .insert({
        job_id: jobInsert.data.id,
        seeker_id: seekerUser.id,
        message: "I can work weekends and evenings.",
        status: "submitted",
      })
      .select("id, status")
      .single();

    assertNoError(applicationInsert, "insert application as seeker");
    assert(
      applicationInsert.data.status === "submitted",
      "Expected application status to be submitted.",
    );

    const duplicateApplication = await seekerClient
      .from("job_applications")
      .insert({
        job_id: jobInsert.data.id,
        seeker_id: seekerUser.id,
        message: "Duplicate application should fail.",
      });

    assert(
      duplicateApplication.error,
      "Expected duplicate application to be blocked.",
    );

    const companyApplications = await companyClient
      .from("job_applications")
      .select("id, seeker_id, status, message")
      .eq("job_id", jobInsert.data.id);

    assertNoError(companyApplications, "read applications as company owner");
    assert(
      companyApplications.data?.length === 1,
      "Expected company owner to read one related application.",
    );

    const applicantProfile = await companyClient
      .from("seeker_profiles")
      .select("user_id, visa_type, school")
      .eq("user_id", seekerUser.id)
      .single();

    assertNoError(applicantProfile, "read applicant seeker profile as company owner");
    assert(
      applicantProfile.data.visa_type === "D-2",
      "Expected company owner to read applicant visa summary.",
    );

    const updateApplication = await companyClient
      .from("job_applications")
      .update({ status: "reviewing" })
      .eq("id", applicationInsert.data.id)
      .select("id, status")
      .single();

    assertNoError(updateApplication, "update related application as company owner");
    assert(
      updateApplication.data.status === "reviewing",
      "Expected company owner to update application status.",
    );

    const seekerApplication = await seekerClient
      .from("job_applications")
      .select("id, status")
      .eq("id", applicationInsert.data.id)
      .single();

    assertNoError(seekerApplication, "read own application as seeker");
    assert(
      seekerApplication.data.status === "reviewing",
      "Expected seeker to read company-updated application status.",
    );

    const consentInsert = await seekerClient
      .from("consents")
      .insert({
        user_id: seekerUser.id,
        purpose: "administrative_request_review",
        data_scope: {
          profile: true,
          visa: true,
        },
        recipient_type: "operator_and_assigned_partner",
        status: "agreed",
      })
      .select("id")
      .single();

    assertNoError(consentInsert, "insert admin request consent as seeker");

    const adminRequestInsert = await seekerClient
      .from("admin_requests")
      .insert({
        seeker_id: seekerUser.id,
        type: "part_time_work_permission",
        consent_id: consentInsert.data.id,
        memo: "Please review my part-time work permission documents.",
        status: "received",
      })
      .select("id, status")
      .single();

    assertNoError(adminRequestInsert, "insert admin request as seeker");
    assert(
      adminRequestInsert.data.status === "received",
      "Expected admin request to start as received.",
    );

    const adminRequestRead = await adminClient
      .from("admin_requests")
      .select("id, seeker_id, status")
      .eq("id", adminRequestInsert.data.id)
      .single();

    assertNoError(adminRequestRead, "read admin request as admin");
    assert(
      adminRequestRead.data.seeker_id === seekerUser.id,
      "Expected admin to read seeker admin request.",
    );

    const adminRequestUpdate = await adminClient
      .from("admin_requests")
      .update({
        status: "reviewing",
        memo: "Operator review started.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", adminRequestInsert.data.id)
      .select("id, status")
      .single();

    assertNoError(adminRequestUpdate, "update admin request as admin");
    assert(
      adminRequestUpdate.data.status === "reviewing",
      "Expected admin request status to be reviewing.",
    );

    console.log("Supabase E2E verification passed.");
    console.log("- Auth trigger created seeker/company profiles.");
    console.log("- Admin profile promotion and route role foundation are valid.");
    console.log("- Company owner can manage multiple companies/branches.");
    console.log("- Company owner can create a draft job.");
    console.log("- Seeker profile upsert works.");
    console.log("- Non-company company creation is blocked.");
    console.log("- Admin can publish a job, and published jobs are publicly readable.");
    console.log("- Seeker can apply to published jobs.");
    console.log("- Company owner can read applicant details and update application status.");
    console.log("- Seeker can create admin requests and admin can update them.");
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
