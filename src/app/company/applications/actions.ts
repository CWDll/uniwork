"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function updateApplicationStatusAction(formData: FormData) {
  const supabase = await createClient();
  const applicationId = String(formData.get("application_id") ?? "").trim();
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
}
