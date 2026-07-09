import type { NextRequest } from "next/server";

import { sendEmail } from "@/lib/email/client";
import { renderOverdueApplicationsDigestEmail } from "@/lib/email/templates";
import { getNotificationRecipient } from "@/lib/notifications/recipients";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ApplicationRow = {
  applied_at: string;
  id: string;
  job_id: string;
  seeker_id: string;
};

type DigestApplication = {
  applicantEmail?: string | null;
  applicantName?: string | null;
  appliedAt: string;
  applicationId: string;
  jobTitle?: string | null;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: applications, error } = await supabase
    .from("job_applications")
    .select("id, applied_at, job_id, seeker_id")
    .eq("status", "submitted")
    .lte("applied_at", cutoff)
    .order("applied_at", { ascending: true })
    .limit(200);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const applicationRows = (applications ?? []) as ApplicationRow[];

  if (applicationRows.length === 0) {
    return Response.json({ sent: 0, total: 0 });
  }

  const jobIds = Array.from(new Set(applicationRows.map((item) => item.job_id)));
  const seekerIds = Array.from(
    new Set(applicationRows.map((item) => item.seeker_id)),
  );
  const [{ data: jobs }, { data: seekers }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, company_id, title")
      .in("id", jobIds),
    supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", seekerIds),
  ]);
  const companyIds = Array.from(new Set(jobs?.map((job) => job.company_id) ?? []));
  const { data: companies } =
    companyIds.length > 0
      ? await supabase
          .from("companies")
          .select(
            "id, email_notifications_enabled, name, notification_email, owner_id",
          )
          .in("id", companyIds)
      : { data: [] };
  const ownerIds = Array.from(
    new Set(companies?.map((company) => company.owner_id) ?? []),
  );
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, email_notifications_enabled, name, notification_email")
          .in("id", ownerIds)
      : { data: [] };

  const jobById = new Map(jobs?.map((job) => [job.id, job]) ?? []);
  const seekerById = new Map(seekers?.map((seeker) => [seeker.id, seeker]) ?? []);
  const companyById = new Map(companies?.map((company) => [company.id, company]) ?? []);
  const ownerById = new Map(owners?.map((owner) => [owner.id, owner]) ?? []);
  const digestByCompanyId = new Map<
    string,
    {
      applications: DigestApplication[];
      companyName?: string | null;
      recipient: string;
    }
  >();

  for (const application of applicationRows) {
    const job = jobById.get(application.job_id);
    const company = job ? companyById.get(job.company_id) : null;
    const owner = company ? ownerById.get(company.owner_id) : null;
    const seeker = seekerById.get(application.seeker_id);

    if (!job || !company || !owner) {
      continue;
    }

    const recipient =
      company.email_notifications_enabled === false ||
      owner.email_notifications_enabled === false
        ? null
        : getNotificationRecipient({
            accountEmail: owner.email,
            emailNotificationsEnabled: true,
            notificationEmail: company.notification_email || owner.notification_email,
          });

    if (!recipient) {
      continue;
    }

    const digest = digestByCompanyId.get(company.id) ?? {
      applications: [] as DigestApplication[],
      companyName: company.name,
      recipient,
    };
    digest.applications.push({
      applicantEmail: seeker?.email,
      applicantName: seeker?.name,
      appliedAt: application.applied_at,
      applicationId: application.id,
      jobTitle: job.title,
    });
    digestByCompanyId.set(company.id, digest);
  }

  let sent = 0;

  for (const digest of digestByCompanyId.values()) {
    if (digest.applications.length === 0) {
      continue;
    }

    await sendEmail({
      to: digest.recipient,
      ...renderOverdueApplicationsDigestEmail({
        applications: digest.applications,
        companyName: digest.companyName,
      }),
    });
    sent += 1;
  }

  return Response.json({
    companies: digestByCompanyId.size,
    sent,
    total: applicationRows.length,
  });
}
