"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    .select("id, status")
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
  }

  revalidatePath("/company");
  revalidatePath("/company/applications");
  revalidatePath(`/company/applications/${applicationId}`);

  redirect(returnTo);
}
