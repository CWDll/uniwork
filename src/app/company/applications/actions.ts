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
  const applicationId = String(formData.get("application_id") ?? "").trim();
  const returnTo = getSafeReturnTo(formData.get("return_to"));
  const status = String(formData.get("status") ?? "").trim();

  if (!applicationId || !["reviewing", "accepted", "rejected"].includes(status)) {
    return;
  }

  await supabase
    .from("job_applications")
    .update({ status })
    .eq("id", applicationId);

  revalidatePath("/company");
  revalidatePath("/company/applications");
  revalidatePath(`/company/applications/${applicationId}`);

  redirect(returnTo);
}
