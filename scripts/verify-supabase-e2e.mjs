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

    const partnerUser = await createConfirmedUser({
      email: `partner-${suffix}@uniwork.test`,
      password,
      role: "admin",
      name: "Uniwork Test Partner",
      createdUserIds,
    });

    const partnerProfileUpdate = await admin
      .from("profiles")
      .update({ role: "partner", updated_at: new Date().toISOString() })
      .eq("id", partnerUser.id);

    assertNoError(partnerProfileUpdate, "promote partner profile");
    await waitForProfile(partnerUser.id, "partner");

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
          notification_email: `alerts-seoul-${suffix}@uniwork.test`,
          email_notifications_enabled: true,
        },
        {
          owner_id: companyUser.id,
          name: "Uniwork Test Busan Branch",
          industry: "Retail",
          address: "Busan",
          manager_name: "Owner A",
          notification_email: `alerts-busan-${suffix}@uniwork.test`,
          email_notifications_enabled: false,
        },
      ])
      .select("email_notifications_enabled, id, notification_email, owner_id, name");

    assertNoError(companyInsert, "insert multiple companies as company owner");
    assert(companyInsert.data?.length === 2, "Expected two owned companies.");
    assert(
      companyInsert.data?.[0]?.notification_email?.startsWith("alerts-seoul-"),
      "Expected company notification email to be stored.",
    );
    assert(
      companyInsert.data?.[1]?.email_notifications_enabled === false,
      "Expected company email notification preference to be stored.",
    );

    const companyIds = companyInsert.data.map((company) => company.id);
    const verifyCompany = await admin
      .from("companies")
      .update({
        verification_status: "verified",
        verification_note: "Verified for E2E public listing.",
        verified_at: new Date().toISOString(),
        verified_by: adminUser.id,
        updated_at: new Date().toISOString(),
      })
      .in("id", companyIds)
      .select("id, verification_note, verification_status, verified_at, verified_by");

    assertNoError(verifyCompany, "mark test companies verified");
    assert(
      verifyCompany.data?.every(
        (company) =>
          company.verification_status === "verified" &&
          company.verification_note === "Verified for E2E public listing." &&
          company.verified_by === adminUser.id &&
          company.verified_at,
      ),
      "Expected company verification metadata to be stored.",
    );

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

    const seekerNotificationProfile = await seekerClient
      .from("profiles")
      .update({
        email_notifications_enabled: true,
        notification_email: `seeker-alerts-${suffix}@uniwork.test`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seekerUser.id)
      .select("email_notifications_enabled, notification_email")
      .single();

    assertNoError(
      seekerNotificationProfile,
      "update seeker notification preferences",
    );
    assert(
      seekerNotificationProfile.data.notification_email?.startsWith(
        "seeker-alerts-",
      ),
      "Expected seeker notification email to be stored.",
    );

    const resumeInsert = await seekerClient
      .from("resumes")
      .insert({
        education: [
          {
            major: "Business",
            period: "2024 - present",
            school: "Uniwork Test University",
          },
        ],
        experience: [
          {
            company: "Campus Restaurant",
            description: "Served customers and supported closing shifts.",
            period: "2025.03 - 2025.12",
            role: "Hall staff",
          },
        ],
        intro:
          "I can support busy service hours with reliable communication and careful customer handling.",
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
        title: "Hall staff resume",
        visibility: "private",
      })
      .select("id")
      .single();

    assertNoError(resumeInsert, "insert resume as seeker");

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
        review_note: "Approved for public listing.",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobInsert.data.id)
      .select("id, review_note, reviewed_at, reviewed_by, status")
      .single();

    assertNoError(publishResult, "publish job as admin");
    assert(
      publishResult.data.status === "published",
      "Expected admin-published job to be published.",
    );
    assert(
      publishResult.data.review_note === "Approved for public listing.",
      "Expected admin review note to be stored.",
    );
    assert(
      publishResult.data.reviewed_by === adminUser.id && publishResult.data.reviewed_at,
      "Expected admin reviewer metadata to be stored.",
    );

    const directPublishedJob = await companyClient
      .from("jobs")
      .insert({
        category: "Retail",
        company_id: companyIds[0],
        description:
          "E2E published job created directly by a verified company owner.",
        employment_type: "part-time",
        location: "Seoul",
        published_at: new Date().toISOString(),
        status: "published",
        title: "Uniwork E2E Direct Published Job",
      })
      .select("id, status")
      .single();

    assertNoError(
      directPublishedJob,
      "insert published job as verified company owner",
    );
    assert(
      directPublishedJob.data.status === "published",
      "Expected verified company owner to create a published job.",
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
        profile_snapshot: {
          nationality: "Vietnam",
          school: "Uniwork Test University",
          visa_type: "D-2",
        },
        resume_id: resumeInsert.data.id,
        resume_snapshot: {
          id: resumeInsert.data.id,
          intro:
            "I can support busy service hours with reliable communication and careful customer handling.",
          title: "Hall staff resume",
        },
        message: "I can work weekends and evenings.",
        status: "submitted",
      })
      .select("id, profile_snapshot, resume_id, resume_snapshot, status")
      .single();

    assertNoError(applicationInsert, "insert application as seeker");
    assert(
      applicationInsert.data.status === "submitted",
      "Expected application status to be submitted.",
    );
    assert(
      applicationInsert.data.resume_id === resumeInsert.data.id,
      "Expected application to reference the seeker's resume.",
    );
    assert(
      applicationInsert.data.resume_snapshot?.id === resumeInsert.data.id,
      "Expected application to store the submitted resume snapshot.",
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
      .select("id, seeker_id, profile_snapshot, resume_id, resume_snapshot, status, message")
      .eq("job_id", jobInsert.data.id);

    assertNoError(companyApplications, "read applications as company owner");
    assert(
      companyApplications.data?.length === 1,
      "Expected company owner to read one related application.",
    );
    assert(
      companyApplications.data?.[0]?.resume_id === resumeInsert.data.id,
      "Expected company owner to read the submitted resume reference.",
    );
    assert(
      companyApplications.data?.[0]?.resume_snapshot?.id === resumeInsert.data.id,
      "Expected company owner to read the submitted resume snapshot.",
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
      .update({
        company_note: "We are reviewing your application and will follow up soon.",
        status: "reviewing",
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", applicationInsert.data.id)
      .select("company_note, id, status, status_updated_at")
      .single();

    assertNoError(updateApplication, "update related application as company owner");
    assert(
      updateApplication.data.status === "reviewing",
      "Expected company owner to update application status.",
    );
    assert(
      updateApplication.data.company_note?.includes("reviewing"),
      "Expected company owner to store an applicant-facing note.",
    );
    assert(
      updateApplication.data.status_updated_at,
      "Expected status update timestamp to be stored.",
    );

    const statusEventInsert = await companyClient
      .from("application_status_events")
      .insert({
        actor_id: companyUser.id,
        application_id: applicationInsert.data.id,
        from_status: "submitted",
        note: "We are reviewing your application and will follow up soon.",
        to_status: "reviewing",
      })
      .select("application_id, from_status, id, note, to_status")
      .single();

    assertNoError(statusEventInsert, "insert application status event as company owner");
    assert(
      statusEventInsert.data.to_status === "reviewing",
      "Expected company owner to create a status event.",
    );

    const seekerApplication = await seekerClient
      .from("job_applications")
      .select("company_note, id, status, status_updated_at")
      .eq("id", applicationInsert.data.id)
      .single();

    assertNoError(seekerApplication, "read own application as seeker");
    assert(
      seekerApplication.data.status === "reviewing",
      "Expected seeker to read company-updated application status.",
    );
    assert(
      seekerApplication.data.company_note?.includes("reviewing"),
      "Expected seeker to read the company note.",
    );

    const seekerStatusEvents = await seekerClient
      .from("application_status_events")
      .select("application_id, from_status, note, to_status")
      .eq("application_id", applicationInsert.data.id);

    assertNoError(seekerStatusEvents, "read own application status events as seeker");
    assert(
      seekerStatusEvents.data?.[0]?.to_status === "reviewing",
      "Expected seeker to read their application status event.",
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
        assigned_partner_id: partnerUser.id,
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

    const partnerClient = await signIn(partnerUser.email, password);
    const partnerRequestRead = await partnerClient
      .from("admin_requests")
      .select("id, seeker_id, status, assigned_partner_id")
      .eq("id", adminRequestInsert.data.id)
      .single();

    assertNoError(partnerRequestRead, "read assigned admin request as partner");
    assert(
      partnerRequestRead.data.assigned_partner_id === partnerUser.id,
      "Expected partner to read assigned admin request.",
    );

    const partnerSeekerProfile = await partnerClient
      .from("seeker_profiles")
      .select("user_id, visa_type, school")
      .eq("user_id", seekerUser.id)
      .single();

    assertNoError(
      partnerSeekerProfile,
      "read assigned request seeker profile as partner",
    );
    assert(
      partnerSeekerProfile.data.visa_type === "D-2",
      "Expected partner to read assigned seeker visa summary.",
    );

    console.log("Supabase E2E verification passed.");
    console.log("- Auth trigger created seeker/company profiles.");
    console.log("- Admin profile promotion and route role foundation are valid.");
    console.log("- Company owner can manage multiple companies/branches.");
    console.log("- Company owner can create a draft job.");
    console.log("- Seeker profile upsert works.");
    console.log("- Seeker resume creation works.");
    console.log("- Non-company company creation is blocked.");
    console.log("- Admin can publish a job, and published jobs are publicly readable.");
    console.log("- Seeker can apply to published jobs with resume_id and snapshots.");
    console.log("- Company owner can read applicant details and update application status.");
    console.log("- Seeker can create admin requests and admin can update them.");
    console.log("- Admin can assign admin requests to partners.");
    console.log("- Partners can read assigned requests and seeker summaries.");
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
