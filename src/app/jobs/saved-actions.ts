"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getSafeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = String(value ?? "").trim();

  if (returnTo === "/jobs" || returnTo.startsWith("/jobs?")) {
    return returnTo;
  }

  return "/jobs";
}

export async function toggleSavedJobAction(formData: FormData) {
  const jobId = String(formData.get("job_id") ?? "").trim();
  const returnTo = getSafeReturnTo(formData.get("return_to"));

  if (!jobId) {
    redirect(returnTo);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("seeker_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("saved_jobs")
      .delete()
      .eq("seeker_id", user.id)
      .eq("job_id", jobId);
  } else {
    await supabase.from("saved_jobs").insert({
      job_id: jobId,
      seeker_id: user.id,
    });
  }

  revalidatePath("/jobs");
  revalidatePath(returnTo);
  redirect(returnTo);
}
