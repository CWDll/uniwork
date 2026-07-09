"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sendEmail } from "@/lib/email/client";
import { renderApplicationStatusEmail } from "@/lib/email/templates";
import { getNotificationRecipient } from "@/lib/notifications/recipients";
import { getStatusMeta } from "@/lib/status-labels";
import { createClient } from "@/lib/supabase/server";

function getSafeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = String(value ?? "").trim();

  if (
    returnTo === "/company/applications" ||
    returnTo.startsWith("/company/applications?") ||
    /^\/company\/applications\/[0-9a-f-]+(?:\/print)?$/i.test(returnTo)
  ) {
    return returnTo;
  }

  return "/company/applications";
}

export async function updateApplicationStatusAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const applicationId = String(formData.get("application_id") ?? "").trim();
  const hasCompanyNote = formData.has("company_note");
  const companyNote = String(formData.get("company_note") ?? "").trim();
  const returnTo = getSafeReturnTo(formData.get("return_to"));
  const status = String(formData.get("status") ?? "").trim();

  if (!applicationId || !["reviewing", "accepted", "rejected"].includes(status)) {
    return;
  }

  const { data: currentApplication } = await supabase
    .from("job_applications")
    .select("id, job_id, seeker_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  const payload: {
    company_note?: string | null;
    status: string;
    status_updated_at: string;
  } = {
    status,
    status_updated_at: new Date().toISOString(),
  };

  if (hasCompanyNote) {
    payload.company_note = companyNote || null;
  }

  const { error: updateError } = await supabase
    .from("job_applications")
    .update(payload)
    .eq("id", applicationId);

  if (!updateError && user) {
    await supabase.from("application_status_events").insert({
      actor_id: user.id,
      application_id: applicationId,
      from_status: currentApplication?.status ?? null,
      note: hasCompanyNote ? companyNote || null : null,
      to_status: status,
    });

    if (currentApplication) {
      await sendApplicationStatusEmail({
        applicationId,
        companyNote: hasCompanyNote ? companyNote || null : null,
        jobId: currentApplication.job_id,
        seekerId: currentApplication.seeker_id,
        status,
        supabase,
      });
    }
  }

  revalidatePath("/company");
  revalidatePath("/company/applications");
  revalidatePath(`/company/applications/${applicationId}`);

  redirect(returnTo);
}

async function sendApplicationStatusEmail({
  applicationId,
  companyNote,
  jobId,
  seekerId,
  status,
  supabase,
}: {
  applicationId: string;
  companyNote: string | null;
  jobId: string;
  seekerId: string;
  status: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  try {
    const [{ data: seeker }, { data: job }] = await Promise.all([
      supabase
        .from("profiles")
        .select("email, email_notifications_enabled, name, notification_email")
        .eq("id", seekerId)
        .maybeSingle(),
      supabase
        .from("jobs")
        .select("id, company_id, title")
        .eq("id", jobId)
        .maybeSingle(),
    ]);
    const { data: company } = job
      ? await supabase
          .from("companies")
          .select("name")
          .eq("id", job.company_id)
          .maybeSingle()
      : { data: null };
    const recipient = getNotificationRecipient({
      accountEmail: seeker?.email,
      emailNotificationsEnabled: seeker?.email_notifications_enabled,
      notificationEmail: seeker?.notification_email,
    });

    if (!recipient) {
      return;
    }

    await sendEmail({
      to: recipient,
      ...renderApplicationStatusEmail({
        applicantName: seeker?.name,
        applicationId,
        companyName: company?.name,
        jobTitle: job?.title,
        note: companyNote,
        statusLabel: getStatusMeta("application", status).label,
      }),
    });
  } catch (error) {
    console.error("Failed to send application status email", error);
  }
}
